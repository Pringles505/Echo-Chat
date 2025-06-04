/* tslint:disable */
/* eslint-disable */
/**
 * This function converts a X25519 private key to an XEdDSA private key
 */
export function convert_x25519_to_xeddsa(private_key_bytes: Uint8Array): Uint8Array;
export function compute_determenistic_nonce(prefix: Uint8Array, message: Uint8Array): Uint8Array;
export function compute_nonce_point(nonce_bytes: Uint8Array): Uint8Array;
export function derive_ed25519_keypair_from_x25519(private_key_bytes: Uint8Array): Uint8Array;
export function compute_challenge_hash(nonce_point: Uint8Array, public_ed_key: Uint8Array, message: Uint8Array): Uint8Array;
export function compute_signature_scaler(nonce: Uint8Array, challenge_hash: Uint8Array, ed_private_scalar: Uint8Array): Uint8Array;
export function compute_signature(nonce_point: Uint8Array, signature_scalar: Uint8Array): Uint8Array;
/**
 * Verify the signature
 * Returns true if the signature is valid, false otherwise
 */
export function verify_signature(signature: Uint8Array, message: Uint8Array, public_ed_key: Uint8Array): boolean;
export function test_sign_and_verify(prekey: Uint8Array, identity_seed: Uint8Array): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly convert_x25519_to_xeddsa: (a: number, b: number) => [number, number];
  readonly compute_determenistic_nonce: (a: number, b: number, c: number, d: number) => [number, number];
  readonly compute_nonce_point: (a: number, b: number) => [number, number];
  readonly derive_ed25519_keypair_from_x25519: (a: number, b: number) => [number, number];
  readonly compute_challenge_hash: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly compute_signature_scaler: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly compute_signature: (a: number, b: number, c: number, d: number) => [number, number];
  readonly verify_signature: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly test_sign_and_verify: (a: number, b: number, c: number, d: number) => number;
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
