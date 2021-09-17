export default {
  errors: {
    disconnected: (): string => "Clover: Lost connection to Clover.",
    permanentlyDisconnected: (): string => "Clover: Disconnected from iframe. Page reload required.",
    sendSiteMetadata: (): string => "Clover: Failed to send site metadata. This is an internal error, please report this bug.",
    unsupportedSync: (method: string): string =>
      `Clover: The Clover Ethereum provider does not support synchronous methods like ${method} without a callback parameter.`,
    invalidDuplexStream: (): string => "Must provide a Node.js-style duplex stream.",
    invalidOptions: (maxEventListeners: number, shouldSendMetadata: boolean): string =>
      `Invalid options. Received: { maxEventListeners: ${maxEventListeners}, shouldSendMetadata: ${shouldSendMetadata} }`,
    invalidRequestArgs: (): string => `Expected a single, non-array, object argument.`,
    invalidRequestMethod: (): string => `'args.method' must be a non-empty string.`,
    invalidRequestParams: (): string => `'args.params' must be an object or array if provided.`,
    invalidLoggerObject: (): string => `'args.logger' must be an object if provided.`,
    invalidLoggerMethod: (method: string): string => `'args.logger' must include required method '${method}'.`,
  },
  info: {
    connected: (chainId: string): string => `Clover: Connected to chain with ID "${chainId}".`,
  },
  warnings: {
    // deprecated methods
    enableDeprecation:
      'Clover: ""ethereum.enable()" is deprecated and may be removed in the future. ' +
      'Please use "ethereum.send("eth_requestAccounts")" instead. For more information, see: https://eips.ethereum.org/EIPS/eip-1102',
    sendDeprecation:
      'Clover: "ethereum.send(...)" is deprecated and may be removed in the future.' +
      ' Please use "ethereum.sendAsync(...)" or "ethereum.request(...)" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    events: {
      close:
        'Clover: The event "close" is deprecated and may be removed in the future. Please use "disconnect" instead.' +
        "\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193",
      data:
        'Clover: The event "data" is deprecated and will be removed in the future.' +
        'Use "message" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#message',
      networkChanged:
        'Clover: The event "networkChanged" is deprecated and may be removed in the future.' +
        ' Please use "chainChanged" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
      notification:
        'Clover: The event "notification" is deprecated and may be removed in the future. ' +
        'Please use "message" instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193',
    },
    publicConfigStore: 'Clover: The property "publicConfigStore" is deprecated and WILL be removed in the future.',
  },
};
