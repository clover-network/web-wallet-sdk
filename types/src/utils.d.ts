import SafeEventEmitter from "@metamask/safe-event-emitter";
import { JsonRpcMiddleware } from "json-rpc-engine";
export declare const getRamdonId: any;
export declare const FEATURES_CONFIRM_WINDOW = "directories=0,titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=700,width=450";
/**
 * json-rpc-engine middleware that logs RPC errors and and validates req.method.
 *
 * @param log - The logging API to use.
 * @returns  json-rpc-engine middleware function
 */
export declare function createErrorMiddleware(): JsonRpcMiddleware<unknown, unknown>;
export declare const EMITTED_NOTIFICATIONS: string[];
export declare const NOOP: () => void;
/**
 * Logs a stream disconnection error. Emits an 'error' if given an
 * EventEmitter that has listeners for the 'error' event.
 *
 * @param log - The logging API to use.
 * @param remoteLabel - The label of the disconnected stream.
 * @param error - The associated error to log.
 * @param emitter - The logging API to use.
 */
export declare function logStreamDisconnectWarning(remoteLabel: string, error: Error, emitter: SafeEventEmitter): void;
export declare function getPopupFeatures(): string;
