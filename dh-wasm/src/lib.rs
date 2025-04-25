use wasm_bindgen::prelude::*;
use hkdf::Hkdf;
use sha2::Sha256;
use curve25519_dalek::montgomery::MontgomeryPoint;
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::constants::X25519_BASEPOINT;

// For edwards algorithm
use curve25519_dalek::constants::ED25519_BASEPOINT_POINT;
use sha2::{Sha512, Digest};
use js_sys::{Object, Uint8Array};
use wasm_bindgen::JsValue;

#[wasm_bindgen]
// This function derives a symmetric key from the shared secret using HKDF
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
// This function performs the Diffie-Hellman key exchange using X25519
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
// This function generates a public key from a seed using the ED25519 algorithm
pub fn generate_ed25519_public_key(seed: &[u8]) -> Vec<u8> {
    if seed.len() != 32 {
        return vec![];
    }

    // SHA-512 hash of the seed
    let hash = Sha512::digest(seed);

    let mut scalar_bytes = [0u8; 32];
    scalar_bytes.copy_from_slice(&hash[..32]);

    // Clamp the scalar
    scalar_bytes[0] &= 248;
    scalar_bytes[31] &= 127;
    scalar_bytes[31] |= 64;

    let scalar = Scalar::from_bytes_mod_order(scalar_bytes);

    let public_point = &scalar * &ED25519_BASEPOINT_POINT;

    public_point.compress().to_bytes().to_vec()
}

#[wasm_bindgen]
// This function generates a private key from random bytes in EDWARDS form
pub fn generate_ed25519_private_key(js_random_bytes: &[u8]) -> Vec<u8> {
    if js_random_bytes.len() < 32 {
        return vec![];
    }

    let mut seed = [0u8; 32];
    seed.copy_from_slice(&js_random_bytes[..32]);

    seed.to_vec()
}

#[wasm_bindgen]
pub fn derive_x25519_from_ed25519_private(ed25519_seed: &[u8]) -> JsValue {
    if ed25519_seed.len() != 32 {
        return JsValue::NULL;
    }

    // 1. Hash the Ed25519 private seed with SHA-512
    let hash = Sha512::digest(ed25519_seed);

    // 2. Clamp the first 32 bytes to form X25519 private key
    let mut x25519_priv_bytes = [0u8; 32];
    x25519_priv_bytes.copy_from_slice(&hash[..32]);

    x25519_priv_bytes[0] &= 248;
    x25519_priv_bytes[31] &= 127;
    x25519_priv_bytes[31] |= 64;

    // 3. Derive X25519 public key
    let scalar = Scalar::from_bytes_mod_order(x25519_priv_bytes);
    let public_point: MontgomeryPoint = scalar * X25519_BASEPOINT;
    let x25519_pub_bytes = public_point.to_bytes();

    // 4. Return both as JS object
    let result = Object::new();
    js_sys::Reflect::set(&result, &"x25519_private_key".into(), &Uint8Array::from(&x25519_priv_bytes[..])).unwrap();
    js_sys::Reflect::set(&result, &"x25519_public_key".into(), &Uint8Array::from(&x25519_pub_bytes[..])).unwrap();

    result.into()
}


#[wasm_bindgen]
// This function generates a public prekey from a private prekey (Functionally identical to generate_public_key)
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
// This function generates a private prekey from random bytes (Functionally identical to generate_private_key)
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

#[wasm_bindgen]
// This function generates a ephemeral public key
pub fn generate_public_ephemeral_key(private_prekey_bytes: &[u8]) -> Vec<u8> {
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
// This function generates a private ephemeral key from random bytes
pub fn generate_private_ephemeral_key(js_random_bytes: &[u8]) -> Vec<u8> {
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

#[wasm_bindgen]
pub fn hkdf_derive(input_key_material: &[u8], salt: &[u8], info: &[u8], output_len: usize) -> Vec<u8> {
    let hkdf = Hkdf::<Sha256>::new(Some(salt), input_key_material);

    let mut okm = vec![0u8; output_len];
    if hkdf.expand(info, &mut okm).is_err() {
        return vec![]; // Handle failure
    }

    okm
}
