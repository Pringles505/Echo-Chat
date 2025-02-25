use wasm_bindgen::prelude::*;
use aes_gcm::{Aes256Gcm, Key, Nonce}; // Or `Aes128Gcm`
use aes_gcm::aead::{Aead, NewAead};
use hex::{encode, decode};

#[wasm_bindgen]
pub fn encrypt(text: &str, key: &str, nonce: &str) -> Result<String, JsValue> {
    let key_bytes = decode(key).map_err(|_| JsValue::from_str("Invalid key"))?;
    let nonce_bytes = decode(nonce).map_err(|_| JsValue::from_str("Invalid nonce"))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Invalid key length"));
    }
    if nonce_bytes.len() != 12 {
        return Err(JsValue::from_str("Invalid nonce length"));
    }

    let key = Key::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(&nonce_bytes); // 96-bits; unique per message
    let ciphertext = cipher.encrypt(nonce, text.as_bytes())
        .map_err(|_| JsValue::from_str("Encryption failed"))?;

    Ok(encode(ciphertext))
}

#[wasm_bindgen]
pub fn decrypt(text: &str, key: &str, nonce: &str) -> Result<String, JsValue> {
    let key_bytes = decode(key).map_err(|_| JsValue::from_str("Invalid key"))?;
    let nonce_bytes = decode(nonce).map_err(|_| JsValue::from_str("Invalid nonce"))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Invalid key length"));
    }
    if nonce_bytes.len() != 12 {
        return Err(JsValue::from_str("Invalid nonce length"));
    }

    let key = Key::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(&nonce_bytes); // 96-bits; unique per message
    let ciphertext = decode(text).map_err(|_| JsValue::from_str("Invalid ciphertext"))?;
    let decrypted_text = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| JsValue::from_str("Decryption failed"))?;

    String::from_utf8(decrypted_text).map_err(|_| JsValue::from_str("Invalid UTF-8"))
}