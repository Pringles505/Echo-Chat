use wasm_bindgen::prelude::*;
use hkdf::Hkdf;
use sha2::Sha256;
use curve25519_dalek::montgomery::MontgomeryPoint;
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::constants::X25519_BASEPOINT;

#[wasm_bindgen]
pub fn derive_symmetric_key(shared_secret: &[u8]) -> Vec<u8> {
    if shared_secret.len() != 32 {
        return vec![];
    }

    let hk = Hkdf::<Sha256>::new(None, shared_secret);
    let mut okm = [0u8; 32];
    hk.expand(b"message-encryption", &mut okm).unwrap();

    okm.to_vec()
}

#[wasm_bindgen]
pub fn diffie_hellman(my_private_key_bytes: &[u8], their_public_key_bytes: &[u8]) -> Vec<u8> {
    if my_private_key_bytes.len() != 32 || their_public_key_bytes.len() != 32 {
        return vec![];
    }

    let mut private_key = [0u8; 32];
    private_key.copy_from_slice(&my_private_key_bytes[..32]);

    // Clamp private key as per X25519 spec
    private_key[0] &= 248;
    private_key[31] &= 127;
    private_key[31] |= 64;

    // ec scalar for multiplication
    let scalar = Scalar::from_bytes_mod_order(private_key);

    // Converts into ec point and performs scalar multiplication
    let their_public_point = MontgomeryPoint(their_public_key_bytes.try_into().unwrap());
    let shared_point = scalar * their_public_point;

    // Converts to bytes
    shared_point.to_bytes().to_vec()
}

#[wasm_bindgen]
pub fn generate_public_key(private_key_bytes: &[u8]) -> Vec<u8> {
    if private_key_bytes.len() != 32 {
        return vec![];
    }

    let mut private_key = [0u8; 32];
    private_key.copy_from_slice(&private_key_bytes[..32]);

    // Clamp manually (as per X25519 spec)
    private_key[0] &= 248;
    private_key[31] &= 127;
    private_key[31] |= 64;

    let scalar = Scalar::from_bytes_mod_order(private_key);
    let public_point: MontgomeryPoint = scalar * X25519_BASEPOINT;

    public_point.to_bytes().to_vec()
}

#[wasm_bindgen]
pub fn generate_private_key(js_random_bytes: &[u8]) -> Vec<u8> {
    let mut private_key = [0u8; 32];

    if js_random_bytes.len() < 32 {
        return vec![];
    }
    private_key.copy_from_slice(&js_random_bytes[..32]);

    private_key[0] &= 248;
    private_key[31] &= 127;
    private_key[31] |= 64;

    private_key.to_vec()
}

#[wasm_bindgen]
pub fn generate_public_prekey(private_prekey_bytes: &[u8]) -> Vec<u8> {
    if private_prekey_bytes.len() != 32 {
        return vec![];
    }

    let mut private_prekey = [0u8; 32];
    private_prekey.copy_from_slice(&private_prekey_bytes[..32]);

    // Clamp manually (as per X25519 spec)
    private_prekey[0] &= 248;
    private_prekey[31] &= 127;
    private_prekey[31] |= 64;

    let scalar = Scalar::from_bytes_mod_order(private_prekey);
    let public_point: MontgomeryPoint = scalar * X25519_BASEPOINT;

    public_point.to_bytes().to_vec()
}

#[wasm_bindgen]
pub fn generate_private_prekey(js_random_bytes: &[u8]) -> Vec<u8> {
    let mut private_prekey = [0u8; 32];

    if js_random_bytes.len() < 32 {
        return vec![];
    }
    private_prekey.copy_from_slice(&js_random_bytes[..32]);

    private_prekey[0] &= 248;
    private_prekey[31] &= 127;
    private_prekey[31] |= 64;

    private_prekey.to_vec()
}