use wasm_bindgen::prelude::*;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};
use hex::encode;

#[wasm_bindgen]
pub fn encrypt(text: &str, key: &[u8], nonce: &[u8]) -> Result<String, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Invalid key length"));
    }

    if nonce.len() != 12 {
        return Err(JsValue::from_str("Invalid nonce length"));
    }

    let key = Key::from_slice(key);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(nonce); 
    let ciphertext = cipher.encrypt(nonce, text.as_bytes())
        .map_err(|_| JsValue::from_str("Encryption failed"))?;

    Ok(encode(ciphertext))
}

#[wasm_bindgen]
pub fn decrypt(text: &str, key: &[u8], nonce: &[u8]) -> Result<String, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Invalid key length"));
    }

    if nonce.len() != 12 {
        return Err(JsValue::from_str("Invalid nonce length"));
    }

    let key = Key::from_slice(key);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(nonce); 
    let ciphertext = hex::decode(text).map_err(|_| JsValue::from_str("Invalid ciphertext"))?;
    let decrypted_text = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| JsValue::from_str("Decryption failed"))?;

    String::from_utf8(decrypted_text).map_err(|_| JsValue::from_str("Invalid UTF-8"))
}