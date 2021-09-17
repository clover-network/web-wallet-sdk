import CloverInpageProvider from "./inpage-provider";
import { CloverParams } from "./interfaces";
import ExtendedObjectMultiplex from "./ObjectMultiplex";
declare class CloverWebInjected {
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
    provider: CloverInpageProvider;
    dappStorageKey: string;
    constructor({ zIndex, devEnv }?: {
        zIndex?: number;
        devEnv?: boolean;
    });
    init({ loginConfig, network, enableLogging, }?: CloverParams): Promise<void>;
    private displayIframe;
    private setupWeb3;
    login({ verifier }?: {
        verifier?: string;
    }): Promise<string[]>;
    logout(): Promise<void>;
    cleanUp(): Promise<void>;
    clearInit(): void;
    /** @ignore */
    _setProvider({ chainId }?: {
        chainId?: string;
    }): Promise<void>;
    /** @ignore */
    _showLoginPopup(calledFromEmbed: boolean, resolve: (a: string[]) => void, reject: (err: Error) => void): void;
    /** @ignore */
    _handleWindow(preopenInstanceId: string, { url, target, features }?: {
        url?: string;
        target?: string;
        features?: string;
    }): void;
}
export default CloverWebInjected;
