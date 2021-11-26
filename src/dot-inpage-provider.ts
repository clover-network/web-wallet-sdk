import CloverInpageProvider from "./inpage-provider";

/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
class CloverDotInpageProvider {
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

  enable: (origin: string) => Promise<any>;
}

export default CloverDotInpageProvider;
