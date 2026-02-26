import { describe, it, expect, vi } from "vitest";

// mock dh-wasm hkdf_derive so the test doesn’t depend on WASM init
vi.mock("dh-wasm", () => ({
    hkdf_derive: (ikm, _salt, _info, len) => {
        const out = new Uint8Array(len);
        for (let i = 0; i < len; i++) out[i] = (ikm[i % ikm.length] + i) & 0xff;
        return out;
    },
}));

import { chain_key_KDF } from "../hkdf.js";

describe("chain_key_KDF", () => {
    it("returns 64 bytes and produces different keys after advancing", () => {
        const ck0 = new Uint8Array(32).fill(5);

        const okm0 = chain_key_KDF(ck0);
        expect(okm0).toHaveLength(64);

        const mk0 = okm0.slice(0, 32);
        const ck1 = okm0.slice(32);

        const okm1 = chain_key_KDF(ck1);
        const mk1 = okm1.slice(0, 32);

        expect(mk0).not.toEqual(mk1);
    });
});