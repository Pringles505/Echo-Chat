/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const convert_x25519_to_xeddsa: (a: number, b: number) => [number, number];
export const compute_determenistic_nonce: (a: number, b: number, c: number, d: number) => [number, number];
export const compute_nonce_point: (a: number, b: number) => [number, number];
export const derive_ed25519_keypair_from_x25519: (a: number, b: number) => [number, number];
export const compute_challenge_hash: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
export const compute_signature_scaler: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
export const compute_signature: (a: number, b: number, c: number, d: number) => [number, number];
export const verify_signature: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
export const test_sign_and_verify: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_export_0: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
