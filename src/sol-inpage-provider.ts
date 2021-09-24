import CloverInpageProvider from "./inpage-provider";
import { getRamdonId } from "./utils";

/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
class CloverSolInpageProvider {
  public selectedAddress: string | null;

  /**
   * Indicating that this provider is a Sol MetaMask provider.
   */
  public readonly isClover: true;

  public baseProvider: CloverInpageProvider;

  constructor(baseProvider: CloverInpageProvider) {
    if (!baseProvider) {
      throw new Error("Invalid base provider.");
    }
    this.isClover = true;
    this.selectedAddress = null;
    this.baseProvider = baseProvider;
  }

  enable: () => Promise<string[]>;

  getAccount(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.baseProvider.sendAsync({ jsonrpc: "2.0", id: getRamdonId(), method: "sol_account", params: [] }, (err, response) => {
        const { result: res } = (response as { result: any }) || {};
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  signTransaction(payload): Promise<any> {
    if (Array.isArray(payload)) {
      return Promise.reject(new Error("Invalid parameter. Array is not allowed"));
    }

    return new Promise((resolve, reject) => {
      const param = payload.serializeMessage();
      this.baseProvider.sendAsync({ jsonrpc: "2.0", id: getRamdonId(), method: "sol_signTransaction", params: [param] }, (err, response) => {
        const { result: res } = (response as { result: any }) || {};
        if (err) {
          reject(err);
        } else {
          payload.addSignature(payload.signatures[0].publicKey, res);
          resolve(payload);
        }
      });
    });
  }

  signAllTransactions(payload): Promise<any> {
    if (!Array.isArray(payload)) {
      return Promise.reject(new Error("Invalid parameter. Array is not allowed"));
    }

    const requests = [];
    for (const item of payload) {
      requests.push(item.serializeMessage());
    }

    return new Promise((resolve, reject) => {
      this.baseProvider.sendAsync({ jsonrpc: "2.0", id: getRamdonId(), method: "sol_signAllTransactions", params: [requests] }, (err, response) => {
        const { result: res } = (response as { result: unknown }) || {};
        if (err) {
          reject(err);
        } else {
          for (let idx = 0; idx < payload.length; idx += 1) {
            payload[idx].addSignature(payload[idx].signatures[0].publicKey, res[idx]);
          }
          resolve(payload);
        }
      });
    });
  }
}

export default CloverSolInpageProvider;
