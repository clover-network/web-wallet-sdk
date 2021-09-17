import { Duplex } from "readable-stream";

import { BufferEncoding, IObjectMultiplex } from "./interfaces";

export interface SubstreamOptions {
  parent: IObjectMultiplex;
  name: string;
}

export default class Substream extends Duplex {
  private readonly _parent: IObjectMultiplex;

  private readonly _name: string;

  constructor({ parent, name }: SubstreamOptions) {
    super({ objectMode: true });
    this._parent = parent;
    this._name = name;
  }

  /**
   * Explicitly sets read operations to a no-op.
   */
  // eslint-disable-next-line class-methods-use-this
  _read(): void {
    return undefined;
  }

  /**
   * Called when data should be written to this writable stream.
   *
   * @param chunk - Arbitrary object to write
   * @param encoding - Encoding to use when writing payload
   * @param callback - Called when writing is complete or an error occurs
   */
  _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this._parent.push({
      name: this._name,
      data: chunk,
    });
    callback();
  }
}
