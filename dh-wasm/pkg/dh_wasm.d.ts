/* tslint:disable */
/* eslint-disable */
export function derive_symmetric_key(shared_secret: Uint8Array): Uint8Array;
export function diffie_hellman(my_private_key_bytes: Uint8Array, their_public_key_bytes: Uint8Array): Uint8Array;
export function generate_public_key(private_key_bytes: Uint8Array): Uint8Array;
export function generate_private_key(js_random_bytes: Uint8Array): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly derive_symmetric_key: (a: number, b: number) => [number, number];
  readonly diffie_hellman: (a: number, b: number, c: number, d: number) => [number, number];
  readonly generate_public_key: (a: number, b: number) => [number, number];
  readonly generate_private_key: (a: number, b: number) => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
