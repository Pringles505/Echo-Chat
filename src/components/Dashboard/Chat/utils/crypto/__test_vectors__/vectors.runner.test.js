import { describe, it, expect, beforeAll } from "vitest";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import initDhWasm from "dh-wasm";

import { buildAadBytes } from "../aes.js";
import { chain_key_KDF } from "../hkdf.js";
import { continueDoubleRatchetChain } from "../dr.js";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const b64ToU8 = (b64) => new Uint8Array(Buffer.from(String(b64), "base64"));
const u8ToB64 = (u8) => Buffer.from(u8).toString("base64");

const readVectorJson = async (fileName) => {
  const raw = await readFile(new URL(fileName, import.meta.url), "utf8");
  return JSON.parse(raw);
};

async function aesGcmEncrypt({ keyBytes, iv, aad, plaintext }) {
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    key,
    new TextEncoder().encode(plaintext)
  );
  return new Uint8Array(ciphertext);
}

async function aesGcmDecrypt({ keyBytes, iv, aad, ciphertext }) {
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

beforeAll(async () => {
  const echoChatRootDir = fileURLToPath(new URL("../../../../../../../", import.meta.url));
  const wasmPath = path.join(echoChatRootDir, "dh-wasm", "pkg", "dh_wasm_bg.wasm");
  const wasmBytes = await readFile(wasmPath);
  await initDhWasm({ module_or_path: wasmBytes });
});

describe("__test_vectors__: AAD header binding", () => {
  it("matches AAD KAT and fails on header tampering", async () => {
    const vec = await readVectorJson("aad.v1.json");

    const header = vec.inputs.header;
    const aad = buildAadBytes(header);
    expect(new TextDecoder().decode(aad)).toBe(vec.expected.aad_utf8);

    const keyBytes = b64ToU8(vec.inputs.key_b64);
    const iv = b64ToU8(vec.inputs.iv_b64);
    const plaintext = vec.inputs.plaintext;

    const ciphertext = await aesGcmEncrypt({ keyBytes, iv, aad, plaintext });
    expect(u8ToB64(ciphertext)).toBe(vec.expected.ciphertext_b64);

    await expect(aesGcmDecrypt({ keyBytes, iv, aad, ciphertext })).resolves.toBe(plaintext);

    for (const negative of vec.negative ?? []) {
      const tamperedHeader = { ...header, ...(negative.mutateHeader ?? {}) };
      const aadTampered = buildAadBytes(tamperedHeader);
      await expect(aesGcmDecrypt({ keyBytes, iv, aad: aadTampered, ciphertext })).rejects.toThrow();
    }
  });
});

describe("__test_vectors__: chain_key_KDF evolution", () => {
  it("matches KAT over multiple steps", async () => {
    const vec = await readVectorJson("chain_kdf.v1.json");

    let chainKey = b64ToU8(vec.inputs.chainKey0_b64);
    for (const [index, step] of (vec.expected.steps ?? []).entries()) {
      const okm = chain_key_KDF(chainKey);
      expect(okm).toHaveLength(64);

      const mk = okm.slice(0, 32);
      const nextChainKey = okm.slice(32);

      expect(u8ToB64(mk)).toBe(step.mk_b64);
      expect(u8ToB64(nextChainKey)).toBe(step.nextChainKey_b64);

      chainKey = nextChainKey;

      expect(chainKey).toHaveLength(32);
      expect(index).toBeTypeOf("number");
    }
  });
});

describe("__test_vectors__: DH ratchet step derivation", () => {
  it("derives expected receiving chain key seed and new root key", async () => {
    const vec = await readVectorJson("dh_ratchet_step.v1.json");

    const rootKey = b64ToU8(vec.inputs.rootKey_b64);
    const privateEphemeralKey = b64ToU8(vec.inputs.privateEphemeralKey_b64);
    const previousTargetPublicEphemeralKey = b64ToU8(vec.inputs.previousTargetPublicEphemeralKey_b64);

    const out = await continueDoubleRatchetChain(
      null,
      "peer",
      previousTargetPublicEphemeralKey,
      privateEphemeralKey,
      rootKey
    );

    expect(u8ToB64(out.receivingChainKey)).toBe(vec.expected.receivingChainKey_b64);
    expect(u8ToB64(out.newRootKey)).toBe(vec.expected.newRootKey_b64);
  });
});
