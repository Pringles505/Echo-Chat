import init, { encrypt as wasmEncrypt, decrypt as wasmDecrypt } from 'aes-wasm';

const normalizeAesKey = (key) => {
  if (key instanceof Uint8Array) return key;
  if (key instanceof ArrayBuffer) return new Uint8Array(key);
  if (Array.isArray(key)) return new Uint8Array(key);
  if (key && typeof key === 'object' && ArrayBuffer.isView(key)) {
    return new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
  }
  throw new Error(`Invalid key type for AES: ${Object.prototype.toString.call(key)}`);
};

const encrypt = async (text, derivedKey, nonceArray) => {
  console.log("🎈🎈Encrypting with", derivedKey)
  await init();
  console.log('derivedKey:', derivedKey);

  try {
    const key = normalizeAesKey(derivedKey);
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length} (expected 32)`);
    }
    // Call the WebAssembly encrypt function
    const encryptedText = await wasmEncrypt(text, key, nonceArray);
    return encryptedText;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

const decrypt = async (text, derivedKey, nonceArray) => {
  console.log("🎈🎈Decrypting with", derivedKey)
  await init();
  // Ensure the derived key is computed before decryption
  if (!derivedKey) {
    console.error('Derived key is missing');
  }
  try {
    const key = normalizeAesKey(derivedKey);
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length} (expected 32)`);
    }
    return wasmDecrypt(text, key, nonceArray);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

export { encrypt, decrypt };
