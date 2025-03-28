use wasm_bindgen::prelude::*;
use sha2::{Sha512, Digest};
use num_bigint::BigUint;
use curve25519_dalek::constants::ED25519_BASEPOINT_POINT;
use curve25519_dalek::scalar::Scalar;

pub fn reduce_hash_mod_l(hash: &[u8]) -> BigUint {
    let big = BigUint::from_bytes_le(hash);
    big % ed25519_l()
}

// To get the order of the curve L
pub fn ed25519_l() -> BigUint {
    BigUint::parse_bytes(
        b"723700557733226221397318656304299424085711635937990760600195093828545425857",
        10,
    ).unwrap()
}

pub fn sha512_bytes(data: &[u8]) -> [u8; 64] {
    let mut hasher = Sha512::new();
    hasher.update(data);
    let result = hasher.finalize(); 
    let mut out = [0u8; 64];
    out.copy_from_slice(&result); 
    out
}

pub fn bytes_to_biguint(bytes: &[u8]) -> BigUint {
    BigUint::from_bytes_le(bytes)
}

pub fn clamp(private_key: &mut [u8; 32]) {
    private_key[0] &= 248;
    private_key[31] &= 127;
    private_key[31] |= 64;
}

#[wasm_bindgen]
pub fn convert_x25519_to_xeddsa(private_key_bytes: &[u8]) -> Vec<u8> {
    //Sha512 the private key
    let h = sha512_bytes(private_key_bytes);

    //Seperate the first 32 bytes and the last 32 bytes
    let mut a = [0u8; 32];
    let mut prefix = [0u8; 32];

    a.copy_from_slice(&h[0..32]);
    prefix.copy_from_slice(&h[32..64]);

    // Clamp the private key
    clamp(&mut a);

    //Concatenate and return 
    let mut result = Vec::with_capacity(64);
    result.extend_from_slice(&a);
    result.extend_from_slice(&prefix);
    
    result

}   

#[wasm_bindgen]
pub fn compute_determenistic_nonce(prefix: &[u8], message: &[u8]) -> Vec<u8> {
    let mut hasher = Sha512::new();
    hasher.update(prefix);
    hasher.update(message);
    let hash_result = hasher.finalize();
    
    let big = BigUint::from_bytes_le(&hash_result);
    let l = ed25519_l();
    let reduced = big % l;

    let mut bytes = reduced.to_bytes_le();
    bytes.resize(32, 0); 

    bytes
}   

#[wasm_bindgen]
pub fn compute_nonce_point(nonce_bytes: &[u8]) -> Vec<u8> {
    // Check length
    if nonce_bytes.len() != 32 {
        panic!("nonce_bytes must be exactly 32 bytes");
    }

    // Convert &[u8] to [u8; 32]
    let mut fixed_bytes = [0u8; 32];
    fixed_bytes.copy_from_slice(&nonce_bytes[0..32]);

    // Create scalar and compute R = r * B
    let scalar = Scalar::from_bytes_mod_order(fixed_bytes);
    let point = &scalar * &ED25519_BASEPOINT_POINT;

    // Compress and return as Vec<u8>
    point.compress().to_bytes().to_vec()
}

#[wasm_bindgen]
pub fn derive_ed25519_keypair_from_x25519(private_key_bytes: &[u8]) -> Vec<u8> {
    // Convert &[u8] to [u8; 32]
    let mut fixed_bytes = [0u8; 32];
    fixed_bytes.copy_from_slice(&private_key_bytes[0..32]);

    // Create scalar and compute R = r * B
    let scalar = Scalar::from_bytes_mod_order(fixed_bytes);
    let point = &scalar * &ED25519_BASEPOINT_POINT;

    // Compress and return as Vec<u8>
    point.compress().to_bytes().to_vec()
}   

#[wasm_bindgen]
pub fn compute_challenge_hash(nonce_point: &[u8], public_ed_key: &[u8], message: &[u8]) -> Vec<u8> {
    // Check lengths
    if nonce_point.len() != 32 || public_ed_key.len() != 32 {
        panic!("edPrivScaler and publicEdKey must be exactly 32 bytes");
    }

    let mut hasher = Sha512::new();
    hasher.update(nonce_point);
    hasher.update(public_ed_key);
    hasher.update(message);


    let hash_result = hasher.finalize();
    let reduced_scalar = reduce_hash_mod_l(&hash_result);
    
    let mut bytes = reduced_scalar.to_bytes_le();
    bytes.resize(32, 0); 
    bytes
}

#[wasm_bindgen]
pub fn compute_signature_scaler(nonce: &[u8], challenge_hash: &[u8], ed_private_scaler: &[u8]) -> Vec<u8> {
    if nonce.len() != 32 || challenge_hash.len() != 32 || ed_private_scaler.len() != 32 {
        panic!("All inputs must be 32 bytes");
    }

    let r = bytes_to_biguint(nonce);
    let k = bytes_to_biguint(challenge_hash);
    let a = bytes_to_biguint(ed_private_scaler);

    let l = ed25519_l();
    let s = (r + k * a) % l;
    let mut bytes = s.to_bytes_le();

    bytes.resize(32, 0); 

    bytes
}

#[wasm_bindgen]
pub fn compute_signature(nonce_point: &[u8], signature_scalar: &[u8]) -> Vec<u8> {
    if nonce_point.len() != 32 || signature_scalar.len() != 32 {
        panic!("Nonce point and scalar must be 32 bytes");
    }

    let mut signature = Vec::with_capacity(64);
    signature.extend_from_slice(nonce_point);       // R
    signature.extend_from_slice(signature_scalar);  // S

    signature
}