use wasm_bindgen::prelude::*;
use sha2::{Sha512, Digest};
use num_bigint::BigUint;
use curve25519_dalek::constants::ED25519_BASEPOINT_POINT;
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::edwards::{CompressedEdwardsY, EdwardsPoint};
use web_sys::console;

// For logging
macro_rules! log_bytes {
    ($label:expr, $bytes:expr) => {
        console::log_1(&format!("{}: {:?}", $label, &$bytes[..]).into());
    };
}

// This struct is used to hold the decoded signature components
pub struct DecodedXedSignature {
    pub r: EdwardsPoint,
    pub s: Scalar,
    pub r_bytes: [u8; 32],
}

// This function decodes a signature from a byte array 
pub fn decode_xeddsa_signature(signature: &[u8]) -> Result<DecodedXedSignature, &'static str> {
    // Check if signature length is 64 bytes
    if signature.len() != 64 {
        return Err("Signature must be 64 bytes (R || S)");
    }

    let mut s_bytes = [0u8; 32];
    let mut r_bytes = [0u8; 32];

    // Extract R and S from the signature
    s_bytes.copy_from_slice(&signature[32..64]);
    r_bytes.copy_from_slice(&signature[0..32]);

    // Decode R point (Nonce point R)
    let compressed_r = CompressedEdwardsY(r_bytes);
    let r_point = compressed_r
        .decompress()
        .ok_or("Failed to decompress R point")?;

    let s_ctopt = Scalar::from_canonical_bytes(s_bytes);
    if s_ctopt.is_some().unwrap_u8() == 0 {
        return Err("Invalid scalar S (not canonical)");
    }
    let s_scalar = s_ctopt.unwrap();

    // Decoded R, S from Signature
    Ok(DecodedXedSignature {
        r: r_point,
        s: s_scalar,
        r_bytes,
    })
}

// This function reduces the hash to a scalar mod L (% L)
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

// This function computes the SHA-512 hash of the input data and returns a 64-byte array
pub fn sha512_bytes(data: &[u8]) -> [u8; 64] {
    let mut hasher = Sha512::new();
    hasher.update(data);
    let result = hasher.finalize(); 
    let mut out = [0u8; 64];
    out.copy_from_slice(&result); 
    out
}

// This function converts a BigUint to a 32-byte array
fn biguint_to_scalar_bytes(value: &BigUint) -> [u8; 32] {
    let mut bytes = value.to_bytes_le(); 
    bytes.resize(32, 0); 

    let mut fixed = [0u8; 32];
    fixed.copy_from_slice(&bytes);
    fixed
}

// Clamp the byte array acording to X25519 rules
pub fn clamp(private_key: &mut [u8; 32]) {
    private_key[0] &= 248;
    private_key[31] &= 127;
    private_key[31] |= 64;
}

#[wasm_bindgen]
/// This function converts a X25519 private key to an XEdDSA private key
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
// Compute r, r = SHA(Prefix + message) % L
//// where Prefix is the prefix from the XEdDSA key and message is the message to sign
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
// Compute R, R = B * r
// where B is the base point and r is the nonce
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
    let h = sha512_bytes(private_key_bytes);

    let mut a = [0u8; 32];
    a.copy_from_slice(&h[..32]);

    //Important: Clamp the private key
    clamp(&mut a);

    let scalar = Scalar::from_bytes_mod_order(a);
    let point = &scalar * &ED25519_BASEPOINT_POINT;

    point.compress().to_bytes().to_vec()
}

#[wasm_bindgen]
// Compute k, k = SHA(R || publicEdKey || message) % L
// where R is the nonce point, publicEdKey is the public key, and message is the message to sign
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
// Compute s, s = r + k * a
// where r is the nonce, k is the challenge hash, and a is the private key scalar
pub fn compute_signature_scaler(nonce: &[u8], challenge_hash: &[u8], ed_private_scalar: &[u8]) -> Vec<u8> {
    if nonce.len() != 32 || challenge_hash.len() != 32 || ed_private_scalar.len() != 32 {
        panic!("All inputs must be 32 bytes");
    }

    // Convert all inputs to Scalars
    let r_scalar = Scalar::from_bytes_mod_order(*<&[u8; 32]>::try_from(nonce).unwrap());
    let k_scalar = Scalar::from_bytes_mod_order(*<&[u8; 32]>::try_from(challenge_hash).unwrap());
    let a_scalar = Scalar::from_bytes_mod_order(*<&[u8; 32]>::try_from(ed_private_scalar).unwrap());

    // s = r + k * a
    let s_scalar = r_scalar + k_scalar * a_scalar;

    // Return s as 32-byte array
    s_scalar.to_bytes().to_vec()
}


#[wasm_bindgen]
// Compute the signature as R || S
// where R is the nonce point and S is the signature scalar
pub fn compute_signature(nonce_point: &[u8], signature_scalar: &[u8]) -> Vec<u8> {
    if nonce_point.len() != 32 || signature_scalar.len() != 32 {
        panic!("Nonce point and scalar must be 32 bytes");
    }

    let mut signature = Vec::with_capacity(64);
    signature.extend_from_slice(nonce_point);       // R
    signature.extend_from_slice(signature_scalar);  // S

    signature
}

#[wasm_bindgen]
/// Verify the signature
/// Returns true if the signature is valid, false otherwise
pub fn verify_signature(signature: &[u8], message: &[u8], public_ed_key: &[u8]) -> bool {
    if signature.len() != 64 || public_ed_key.len() != 32 {
        return false;
    }

    // Try to decode signature
    let decoded_signature = match decode_xeddsa_signature(signature) {
        Ok(sig) => sig,
        Err(_) => return false,
    };
    let r = decoded_signature.r;
    let s = decoded_signature.s;

    // Decompress public key
    let mut pubkey_bytes = [0u8; 32];
    pubkey_bytes.copy_from_slice(public_ed_key);
    let compressed_pubkey = CompressedEdwardsY(pubkey_bytes);
    let A = match compressed_pubkey.decompress() {
        Some(point) => point,
        None => return false,
    };

    // Compute challenge hash as scalar directly
    let mut hasher = Sha512::new();
    hasher.update(&decoded_signature.r_bytes);
    hasher.update(public_ed_key);
    hasher.update(message);
    let hash_bytes = hasher.finalize();
    
    let reduced = reduce_hash_mod_l(&hash_bytes);
    let k_bytes = biguint_to_scalar_bytes(&reduced);
    let k = Scalar::from_bytes_mod_order(k_bytes);

    
    // Compute verification equation
    let SB = s * ED25519_BASEPOINT_POINT;
    let kA = k * A;
    let expected = r + kA;

    SB == expected
} 

#[wasm_bindgen]
// For testing purposes, this function performs all XEdDSA within the module to rule out JS implementation issues
pub fn test_sign_and_verify(prekey: &[u8], identity_seed: &[u8]) -> bool {

    log_bytes!("PREKEY", prekey);
    log_bytes!("IDENTITY SEED", identity_seed);

    let xeddsa = convert_x25519_to_xeddsa(identity_seed);
    let a = &xeddsa[0..32];
    let prefix = &xeddsa[32..64];

    log_bytes!("XEdDSA", xeddsa);
    log_bytes!("a", a);
    log_bytes!("prefix", prefix);

    let r = compute_determenistic_nonce(prefix, prekey);
    let R = compute_nonce_point(&r);
    let A = derive_ed25519_keypair_from_x25519(identity_seed);
    let k = compute_challenge_hash(&R, &A, prekey);
    let s = compute_signature_scaler(&r, &k, a);
    let signature = compute_signature(&R, &s);

    log_bytes!("r", r);
    log_bytes!("R", R);
    log_bytes!("A", A);
    log_bytes!("k", k);
    log_bytes!("s", s);
    log_bytes!("signature", signature);

    verify_signature(&signature, prekey, &A)
}