import SafeEventEmitter from "@metamask/safe-event-emitter";
import createHash from "create-hash";
import { JsonRpcId, JsonRpcMiddleware, JsonRpcRequest, JsonRpcVersion } from "json-rpc-engine";
import { Duplex } from "readable-stream";

export const LOGIN_PROVIDER = {
  GOOGLE: "google",
  FACEBOOK: "facebook",
  TWITCH: "twitch",
  REDDIT: "reddit",
  DISCORD: "discord",
} as const;

export const PAYMENT_PROVIDER = {
  MOONPAY: "moonpay",
  WYRE: "wyre",
  RAMPNETWORK: "rampnetwork",
  XANPOOL: "xanpool",
  MERCURYO: "mercuryo",
} as const;

export type PAYMENT_PROVIDER_TYPE = typeof PAYMENT_PROVIDER[keyof typeof PAYMENT_PROVIDER];

export interface IPaymentProvider {
  line1: string;
  line2: string;
  line3: string;
  supportPage: string;
  minOrderValue: number;
  maxOrderValue: number;
  validCurrencies: string[];
  validCryptoCurrencies: string[];
  includeFees: boolean;
  enforceMax: boolean;
  sell?: boolean;
}

export interface IHashAlgorithmOptions {
  algorithms?: createHash.algorithm[];
  delimiter?: string;
  full?: boolean;
}

export interface SRI {
  hashes: Record<createHash.algorithm, string>;
  integrity?: string;
}

export const BUTTON_POSITION = {
  BOTTOM_LEFT: "bottom-left",
  TOP_LEFT: "top-left",
  BOTTOM_RIGHT: "bottom-right",
  TOP_RIGHT: "top-right",
} as const;

export type EMBED_TRANSLATION_ITEM = {
  continue: string;
  actionRequired: string;
  pendingAction: string;
  cookiesRequired: string;
  enableCookies: string;
  clickHere: string;
};

export type WALLET_PATH = "transfer" | "topup" | "home" | "settings" | "history";
export type ETHEREUM_NETWORK_TYPE =
  | "ropsten"
  | "rinkeby"
  | "kovan"
  | "mainnet"
  | "goerli"
  | "localhost"
  | "matic"
  | "mumbai"
  | "xdai"
  | "bsc_mainnet"
  | "bsc_testnet";

export type LOGIN_TYPE =
  | "google"
  | "facebook"
  | "reddit"
  | "discord"
  | "twitch"
  | "apple"
  | "github"
  | "linkedin"
  | "twitter"
  | "weibo"
  | "line"
  | "jwt"
  | "email-password"
  | "passwordless";

export interface NetworkInterface {
  /**
   * If any network other than the ones in enum, it should a JSON RPC URL
   */
  host?: ETHEREUM_NETWORK_TYPE | string;
  /**
   * chainId for the network. If not provided, we query the host
   */
  chainId: string;
  /**
   * Name of the network
   */
  networkName?: string;
  /**
   * Url of the block explorer
   */
  blockExplorer?: string;
  /**
   * Default currency ticker of the network (e.g: BNB)
   */
  ticker?: string;
  /**
   * Name for currency ticker (e.g: `Binance Coin`)
   */
  tickerName?: string;
}

export interface BaseLoginOptions {
  /**
   * - `'page'`: displays the UI with a full page view
   * - `'popup'`: displays the UI with a popup window
   * - `'touch'`: displays the UI in a way that leverages a touch interface
   * - `'wap'`: displays the UI with a "feature phone" type interface
   */
  display?: "page" | "popup" | "touch" | "wap";
  /**
   * - `'none'`: do not prompt user for login or consent on reauthentication
   * - `'login'`: prompt user for reauthentication
   * - `'consent'`: prompt user for consent before processing request
   * - `'select_account'`: prompt user to select an account
   */
  prompt?: "none" | "login" | "consent" | "select_account";
  /**
   * Maximum allowable elasped time (in seconds) since authentication.
   * If the last time the user authenticated is greater than this value,
   * the user must be reauthenticated.
   */
  max_age?: string | number;
  /**
   * The space-separated list of language tags, ordered by preference.
   * For example: `'fr-CA fr en'`.
   */
  ui_locales?: string;
  /**
   * Previously issued ID Token.
   */
  id_token_hint?: string;
  /**
   * The user's email address or other identifier. When your app knows
   * which user is trying to authenticate, you can provide this parameter
   * to pre-fill the email box or select the right session for sign-in.
   *
   * This currently only affects the classic Lock experience.
   */
  login_hint?: string;
  acr_values?: string;
  /**
   * The default scope to be used on authentication requests.
   * The defaultScope defined in the Auth0Client is included
   * along with this scope
   */
  scope?: string;
  /**
   * The default audience to be used for requesting API access.
   */
  audience?: string;
  /**
   * The name of the connection configured for your application.
   * If null, it will redirect to the Auth0 Login Page and show
   * the Login Widget.
   */
  connection?: string;

  /**
   * If you need to send custom parameters to the Authorization Server,
   * make sure to use the original parameter name.
   */
  [key: string]: unknown;
}

export interface JwtParameters extends BaseLoginOptions {
  /**
   * Your Auth0 account domain such as `'example.auth0.com'`,
   * `'example.eu.auth0.com'` or , `'example.mycompany.com'`
   * (when using [custom domains](https://auth0.com/docs/custom-domains))
   */
  domain: string;
  /**
   * The Client ID found on your Application settings page
   */
  client_id?: string;
  /**
   * The default URL where Auth0 will redirect your browser to with
   * the authentication result. It must be whitelisted in
   * the "Allowed Callback URLs" field in your Auth0 Application's
   * settings. If not provided here, it should be provided in the other
   * methods that provide authentication.
   */
  redirect_uri?: string;
  /**
   * The value in seconds used to account for clock skew in JWT expirations.
   * Typically, this value is no more than a minute or two at maximum.
   * Defaults to 60s.
   */
  leeway?: number;

  /**
   * The field in jwt token which maps to verifier id
   */
  verifierIdField?: string;

  /**
   * Whether the verifier id field is case sensitive
   * @default true
   */
  isVerifierIdCaseSensitive?: boolean;
}

export interface LoginConfigItem {
  name: string;
  /**
   * The type of login. Refer to enum `LOGIN_TYPE`
   */
  typeOfLogin: LOGIN_TYPE;
  /**
   * Description for button. If provided, it renders as a full length button. else, icon button
   */
  description?: string;

  clientId?: string;

  logoHover?: string;

  logoLight?: string;

  logoDark?: string;
  /**
   * Whether to show the login button on modal or not
   */
  showOnModal?: boolean;
  /**
   * Whether to show the login button on mobile
   */
  showOnMobile?: boolean;
  /**
   * Custom jwt parameters to configure the login. Useful for Auth0 configuration
   */
  jwtParameters?: JwtParameters;
  /**
   * Show login button on the main list
   */
  mainOption?: boolean;
  /**
   * Whether to show the login button on desktop
   */
  showOnDesktop?: boolean;
  /**
   * Modify the order of buttons. Should be greater than zero, where 1 is top priority.
   */
  priority?: number;
}

export interface PaymentParams {
  /**
   * Address to send the funds to
   */
  selectedAddress?: string;
  /**
   * Default fiat currency for the user to make the payment in
   */
  selectedCurrency?: string;
  /**
   * Amount to buy in the selectedCurrency
   */
  fiatValue?: number;
  /**
   * Cryptocurrency to buy
   */
  selectedCryptoCurrency?: string;
}

export interface VerifierArgs {
  /**
   * Verifier Enum
   */
  verifier: "google" | "reddit" | "discord";
  /**
   * email for google
   *
   * username for reddit
   *
   * id for discord
   */
  verifierId: string;

  isExtended?: boolean;
}

export interface LoginParams {
  verifier?: string;
}

export interface UserInfo {
  /**
   * Email of the logged in user
   */
  email: string;
  /**
   * Full name of the logged in user
   */
  name: string;
  /**
   * Profile image of the logged in user
   */
  profileImage: string;
  /**
   * verifier of the logged in user (google, facebook etc)
   */
  verifier: string;
  /**
   * Verifier Id of the logged in user
   *
   * email for google,
   * id for facebook,
   * username for reddit,
   * id for twitch,
   * id for discord
   */
  verifierId: string;
}

export interface LocaleLinks<T> {
  /**
   * Item corresponding to english
   */
  en?: T;
  /**
   * Item corresponding to japanese
   */
  ja?: T;
  /**
   * Item corresponding to korean
   */
  ko?: T;
  /**
   * Item corresponding to german
   */
  de?: T;
  /**
   * Item corresponding to chinese (simplified)
   */
  zh?: T;
  /**
   * Item corresponding to spanish
   */
  es?: T;
}

export interface IntegrityParams {
  /**
   * Whether to check for integrity.
   * Defaults to false
   * @default false
   */
  check: boolean;
  /**
   * if check is true, hash must be provided. The SRI sha-384 integrity hash
   * {@link https://www.srihash.org/ | SRI Hash}
   */
  hash?: string;

  version?: string;
}

export interface VerifierStatus {
  /**
   * Defaults to true
   * @default true
   */
  google?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  facebook?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  reddit?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  twitch?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  discord?: boolean;
}

export interface CloverParams {
  /**
   * Clover Network Object
   */
  network?: NetworkInterface;
  /**
   * Enables or disables logging.
   *
   * Defaults to false in prod and true in other environments
   */
  enableLogging?: boolean;

  useLocalStorage?: boolean;
}

export interface UnvalidatedJsonRpcRequest {
  id?: JsonRpcId;
  jsonrpc?: JsonRpcVersion;
  method: string;
  params?: unknown;
  preopenInstanceId?: string;
}

export interface ProviderOptions {
  /**
   * The name of the stream used to connect to the wallet.
   */
  jsonRpcStreamName?: string;

  /**
   * The maximum number of event listeners.
   */
  maxEventListeners?: number;
  /**
   * Whether the provider should send page metadata.
   */
  shouldSendMetadata?: boolean;
}

export interface RequestArguments {
  /** The RPC method to request. */
  method: string;

  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export interface BaseProviderState {
  accounts: null | string[];
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
  hasEmittedConnection: boolean;
}

export interface JsonRpcConnection {
  events: SafeEventEmitter;
  middleware: JsonRpcMiddleware<unknown, unknown>;
  stream: Duplex;
}

export interface SentWarningsState {
  // methods
  enable: boolean;
  experimentalMethods: boolean;
  send: boolean;
  publicConfigStore: boolean;
  // events
  events: {
    close: boolean;
    data: boolean;
    networkChanged: boolean;
    notification: boolean;
  };
}

export interface SendSyncJsonRpcRequest extends JsonRpcRequest<unknown> {
  method: "eth_accounts" | "eth_coinbase" | "eth_uninstallFilter" | "net_version";
}

export interface PublicConfigState {
  isUnlocked?: boolean;
  selectedAddress?: string;
  chainId?: string;
  networkVersion?: string;
  storageKey: string;
}

export type Maybe<T> = Partial<T> | null | undefined;

export type BufferEncoding = "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "base64url" | "latin1" | "binary" | "hex";

export type IObjectMultiplex = Duplex;
