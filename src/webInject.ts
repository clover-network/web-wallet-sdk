import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { JsonRpcRequest } from "json-rpc-engine";

import { DEV_URL, PROD_URL, STORAGE_KEY } from "./constants";
import CloverInpageProvider from "./inpage-provider";
import { CloverParams, UnvalidatedJsonRpcRequest } from "./interfaces";
import log from "./loglevel";
import ExtendedObjectMultiplex from "./ObjectMultiplex";
import { handleStream, htmlToElement, runOnLoad } from "./pageUtils";
import PopupHandler from "./PopupHandler";
import sendSiteMetadata from "./siteMetadata";
import CloverSolInpageProvider from "./sol-inpage-provider";
import { setupMultiplex } from "./stream-utils";
import { FEATURES_CONFIRM_WINDOW, getRamdonId } from "./utils";

const UNSAFE_METHODS = [
  "eth_sendTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "personal_sign",

  // solana
  "sol_signTransaction",
  "sol_signAllTransactions",
];

class CloverWebInjected {
  cloverIframe: HTMLIFrameElement;

  zIndex: number;

  cloverWebUrl: string;

  devEnv: boolean;

  initialized: boolean;

  requestedVerifier: string;

  currentVerifier: string;

  communicationMux: ExtendedObjectMultiplex;

  isLoginCallback: () => void;

  isLoggedIn: boolean;

  ethereum: CloverInpageProvider;

  clover_solana: CloverSolInpageProvider;

  provider: CloverInpageProvider;

  dappStorageKey: string;

  constructor({ zIndex = 99999, devEnv = false } = {}) {
    this.zIndex = zIndex;
    this.devEnv = devEnv;
  }

  async init({
    network = {
      chainId: "0x3",
    },
    enableLogging = false,
  }: CloverParams = {}): Promise<void> {
    if (this.initialized) throw new Error("Already initialized");
    this.cloverWebUrl = this.devEnv ? DEV_URL : PROD_URL;
    if (enableLogging) {
      log.enableAll();
    } else {
      log.disableAll();
    }
    const cloverUrl = `${this.cloverWebUrl}#/popup`;
    const cloverIframeUrl = new URL(cloverUrl);
    const newId = getRamdonId();
    const newStorageKey = `clv-storage-${newId}`;
    cloverIframeUrl.hash += `?${STORAGE_KEY}=${newStorageKey}`;
    this.dappStorageKey = newStorageKey;

    this.cloverIframe = htmlToElement<HTMLIFrameElement>(
      `<iframe
        id="cloverIframe"
        allow="clipboard-write"
        class="cloverIframe"
        src="${cloverIframeUrl.href}"
        style="display: none; position: fixed; top: 0; right: 0; width: 100%;
        height: 100%; border: none; border-radius: 0; z-index: ${this.zIndex}"
      ></iframe>`
    );

    const attachIFrame = () => {
      window.document.body.appendChild(this.cloverIframe);
    };

    const setup = async () => {
      await runOnLoad(attachIFrame);
      await runOnLoad(this.setupWeb3.bind(this));
      const initStream = this.communicationMux.getStream("init_stream");
      const initCompletePromise = new Promise((resolve, reject) => {
        initStream.on("data", (chunk) => {
          const { name, data, error } = chunk;
          if (name === "init_complete" && data.success) {
            // resolve promise
            resolve(undefined);
          } else if (error) {
            reject(new Error(error));
          }
        });
      });
      await runOnLoad(async () => {
        initStream.write({
          name: "init_stream",
          data: {
            enableLogging,
          },
        });
        await this._setProvider(network);
        await initCompletePromise;
        this.initialized = true;
      });
    };

    await setup();
  }

  private displayIframe(display = true): void {
    const style: Partial<CSSStyleDeclaration> = {};
    style.display = display ? "block" : "none";
    style.width = "100%";
    style.height = "100%";
    style.top = "0px";
    style.right = "0px";
    style.left = "0px";
    style.bottom = "0px";
    Object.assign(this.cloverIframe.style, style);
  }

  private setupWeb3() {
    const metamaskStream = new WindowPostMessageStream({
      name: "clv_inject_metamask",
      target: "clv_iframe_metamask",
      targetWindow: this.cloverIframe.contentWindow,
    });

    const communicationStream = new WindowPostMessageStream({
      name: "clv_inject_comm",
      target: "clv_iframe_comm",
      targetWindow: this.cloverIframe.contentWindow,
    });

    const inpageProvider = new CloverInpageProvider(metamaskStream);
    const solana = new CloverSolInpageProvider(inpageProvider);
    this.clover_solana = solana;
    const detectAccountRequestPrototypeModifier = (m) => {
      const originalMethod = inpageProvider[m];
      inpageProvider[m] = function providerFunc(method, ...args) {
        if (method && method === "eth_requestAccounts") {
          return inpageProvider.enable();
        }

        if (method && method === "sol_requestAccount") {
          return solana.enable();
        }
        return originalMethod.apply(this, [method, ...args]);
      };
    };

    detectAccountRequestPrototypeModifier("send");
    detectAccountRequestPrototypeModifier("sendAsync");

    inpageProvider.enable = () =>
      new Promise((resolve, reject) => {
        // If user is already logged in, we assume they have given access to the website
        inpageProvider.sendAsync({ jsonrpc: "2.0", id: getRamdonId(), method: "eth_requestAccounts", params: [] }, (err, response) => {
          const { result: res } = (response as { result: unknown }) || {};
          if (err) {
            setTimeout(() => {
              reject(err);
            }, 50);
          } else if (Array.isArray(res) && res.length > 0) {
            // If user is already rehydrated, resolve this
            // else wait for something to be written to status stream
            const handleLoginCb = () => {
              if (this.requestedVerifier !== "" && this.currentVerifier !== this.requestedVerifier) {
                const { requestedVerifier } = this;
                // eslint-disable-next-line promise/no-promise-in-callback
                this.logout()
                  // eslint-disable-next-line promise/always-return
                  .then((_) => {
                    this.requestedVerifier = requestedVerifier;
                    this._showLoginPopup(true, resolve, reject);
                  })
                  .catch((error) => reject(error));
              } else {
                resolve(res);
              }
            };
            if (this.isLoggedIn) {
              handleLoginCb();
            } else {
              this.isLoginCallback = handleLoginCb;
            }
          } else {
            // set up listener for login
            this._showLoginPopup(true, resolve, reject);
          }
        });
      });

    this.clover_solana.enable = () =>
      new Promise((resolve, reject) => {
        // If user is already logged in, we assume they have given access to the website
        inpageProvider.sendAsync({ jsonrpc: "2.0", id: getRamdonId(), method: "sol_requestAccount", params: [] }, (err, response) => {
          const { result: res } = (response as { result: unknown }) || {};
          if (err) {
            setTimeout(() => {
              reject(err);
            }, 50);
          } else if (Array.isArray(res) && res.length > 0) {
            // If user is already rehydrated, resolve this
            // else wait for something to be written to status stream
            const handleLoginCb = () => {
              if (this.requestedVerifier !== "" && this.currentVerifier !== this.requestedVerifier) {
                const { requestedVerifier } = this;
                // eslint-disable-next-line promise/no-promise-in-callback
                this.logout()
                  // eslint-disable-next-line promise/always-return
                  .then((_) => {
                    this.requestedVerifier = requestedVerifier;
                    this._showLoginPopup(true, resolve, reject);
                  })
                  .catch((error) => reject(error));
              } else {
                resolve(res);
              }
            };
            if (this.isLoggedIn) {
              handleLoginCb();
            } else {
              this.isLoginCallback = handleLoginCb;
            }
          } else {
            // set up listener for login
            this._showLoginPopup(true, resolve, reject, "solana");
          }
        });
      });

    inpageProvider.tryPreopenHandle = (payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], cb: (...args: any[]) => void) => {
      const _payload = payload;
      if (!Array.isArray(_payload) && UNSAFE_METHODS.includes(_payload.method)) {
        const preopenInstanceId = getRamdonId();
        this._handleWindow(preopenInstanceId, {
          target: "_blank",
          features: FEATURES_CONFIRM_WINDOW,
        });
        _payload.preopenInstanceId = preopenInstanceId;
      }
      inpageProvider._rpcEngine.handle(_payload as JsonRpcRequest<unknown>[], cb);
    };

    // Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
    // `sendAsync` method on the prototype, causing `this` reference issues with drizzle
    const proxiedInpageProvider = new Proxy(inpageProvider, {
      // straight up lie that we deleted the property so that it doesnt
      // throw an error in strict mode
      deleteProperty: () => true,
    });

    this.ethereum = proxiedInpageProvider;
    const communicationMux = setupMultiplex(communicationStream);

    this.communicationMux = communicationMux;

    // const windowStream = communicationMux.getStream("window");
    // windowStream.on("data", (chunk) => {
    //   if (chunk.name === "create_window") {

    //   }
    // });

    // Show button if wallet has been hydrated/detected
    const statusStream = communicationMux.getStream("status");
    statusStream.on("data", (status) => {
      // login
      if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn;
        this.currentVerifier = status.verifier;
      } // logout
      else this.displayIframe();
      if (this.isLoginCallback) {
        this.isLoginCallback();
        delete this.isLoginCallback;
      }
    });

    this.provider = proxiedInpageProvider;

    if (this.provider.shouldSendMetadata) sendSiteMetadata(this.provider._rpcEngine);
    log.debug("injected provider");
  }

  solLogin({ verifier = "" } = {}): Promise<string[]> {
    if (!this.initialized) throw new Error("Call init() first");
    this.requestedVerifier = verifier;
    return this.clover_solana.enable();
  }

  login({ verifier = "" } = {}): Promise<string[]> {
    if (!this.initialized) throw new Error("Call init() first");
    this.requestedVerifier = verifier;
    return this.ethereum.enable();
  }

  logout(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn) {
        reject(new Error("Not logged in!"));
        return;
      }

      const logOutStream = this.communicationMux.getStream("logout");
      logOutStream.write({ name: "logOut" });
      const statusStream = this.communicationMux.getStream("status");
      const statusStreamHandler = (status) => {
        if (!status.loggedIn) {
          this.isLoggedIn = false;
          this.currentVerifier = "";
          this.requestedVerifier = "";
          resolve();
        } else reject(new Error("Some Error Occured"));
      };
      handleStream(statusStream, "data", statusStreamHandler);
    });
  }

  async cleanUp(): Promise<void> {
    if (this.isLoggedIn) {
      await this.logout();
    }
    this.clearInit();
  }

  clearInit(): void {
    function isElement(element: unknown) {
      return element instanceof Element || element instanceof HTMLDocument;
    }
    if (isElement(this.cloverIframe) && window.document.body.contains(this.cloverIframe)) {
      this.cloverIframe.remove();
      this.cloverIframe = undefined;
    }
    this.initialized = false;
  }

  /** @ignore */
  _setProvider({ chainId = "0x3" } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.initialized) {
        const providerChangeStream = this.communicationMux.getStream("provider_change");
        const handler = (ev) => {
          log.info(ev);
          const { err, success } = ev.data;
          if (err) {
            reject(err);
          } else if (success) {
            resolve();
          } else reject(new Error("some error occured"));
        };
        handleStream(providerChangeStream, "data", handler);
        providerChangeStream.write({
          name: "show_provider_change",
          data: {
            network: {
              chainId,
            },
            override: true,
          },
        });
      } else reject(new Error("Already initialized"));
    });
  }

  /** @ignore */
  _showLoginPopup(calledFromEmbed: boolean, resolve: (a: string[]) => void, reject: (err: Error) => void, chainName = ""): void {
    const loginHandler = (data) => {
      const { err, selectedAddress } = data;

      if (err) {
        log.error(err);
        if (reject) reject(err);
      }
      // returns an array (cause accounts expects it)
      else if (resolve) {
        log.info("selectedAddress:", selectedAddress);
        resolve([selectedAddress]);
      }
      this.displayIframe(false);
    };
    const oauthStream = this.communicationMux.getStream("oauth");
    if (!this.requestedVerifier) {
      this.displayIframe();
      handleStream(oauthStream, "data", loginHandler);
      oauthStream.write({ name: "oauth_modal", data: { calledFromEmbed, chainName } });
    } else {
      handleStream(oauthStream, "data", loginHandler);
      const preopenInstanceId = getRamdonId();
      this._handleWindow(preopenInstanceId);
      oauthStream.write({ name: "oauth", data: { calledFromEmbed, verifier: this.requestedVerifier, preopenInstanceId } });
    }
  }

  /** @ignore */
  _handleWindow(preopenInstanceId: string, { url, target, features }: { url?: string; target?: string; features?: string } = {}): void {
    if (preopenInstanceId) {
      const windowStream = this.communicationMux.getStream("window");
      const finalUrl = new URL(url || `${this.cloverWebUrl}#/redirect?preopenInstanceId=${preopenInstanceId}`);
      if (this.dappStorageKey) {
        // If multiple instances, it returns the first one
        // if (finalUrl.hash) finalUrl.hash += `&dappStorageKey=${this.dappStorageKey}`;
        // else finalUrl.hash = `#dappStorageKey=${this.dappStorageKey}`;
        // finalUrl.hash += `?dappStorageKey=${this.dappStorageKey}`;
      }
      const handledWindow = new PopupHandler({ url: finalUrl, target, features });
      handledWindow.open();
      // if (!handledWindow.window) {
      //   this._createPopupBlockAlert(preopenInstanceId, finalUrl.href);
      //   return;
      // }
      windowStream.write({
        name: "opened_window",
        data: {
          preopenInstanceId,
        },
      });
      const closeHandler = ({ preopenInstanceId: receivedId, close }) => {
        if (receivedId === preopenInstanceId && close) {
          handledWindow.close();
          windowStream.removeListener("data", closeHandler);
        }
      };
      windowStream.on("data", closeHandler);
      handledWindow.once("close", () => {
        windowStream.write({
          data: {
            preopenInstanceId,
            closed: true,
          },
        });
        windowStream.removeListener("data", closeHandler);
      });
    }
  }
}

export default CloverWebInjected;
