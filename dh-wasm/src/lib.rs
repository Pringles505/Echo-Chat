use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn generate_private_key(js_random_bytes: &[u8]) -> Vec<u8> {
    let mut private_key = [0u8; 32];

    // Ensure we received enough randomness
    if js_random_bytes.len() >= 32 {
        private_key.copy_from_slice(&js_random_bytes[..32]);
    } else {
        return vec![]; // Return empty if not enough randomness
    }

    // Apply required bit manipulations for Curve25519 (Ed25519 private keys)
    // https://en.wikipedia.org/wiki/Curve25519 this is how 25519 is defined

    private_key[0] &= 248; 
    private_key[31] &= 127; 
    private_key[31] |= 64; 

    private_key.to_vec()
}