import init, * as protocol from '@mascaro101/echo-protocol';

// SHA-256 output (Nh), AES-256 key length (Nk) and AES-256 nonce length (Nn)
const NH = 32;
const NK = 32;
const NN = 12;

const TEXT_ENCODER = new TextEncoder();
const HKDF_EXTRACT_EXPORT = 'hkdf_extract';
const HKDF_EXPAND_EXPORT = 'hkdf_expand';

function ensureSubtleCrypto() {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
        throw new Error('Web Crypto subtle API is unavailable for HKDF operations');
    }
    return subtle;
}

async function hmacSha256(keyBytes, dataBytes) {
    const subtle = ensureSubtleCrypto();
    const key = await subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const mac = await subtle.sign('HMAC', key, dataBytes);
    return new Uint8Array(mac);
}

async function hkdfExtractFallback(salt, ikm) {
    const normalizedSalt = salt.length > 0 ? salt : new Uint8Array(NH);
    return hmacSha256(normalizedSalt, ikm);
}

async function hkdfExpandFallback(prk, info, length) {
    if (prk.length < NH) {
        throw new Error('HKDF-Expand requires a pseudorandom key of at least 32 bytes');
    }

    const blocks = Math.ceil(length / NH);
    const output = new Uint8Array(length);
    let previous = new Uint8Array(0);
    let offset = 0;

    for (let blockIndex = 1; blockIndex <= blocks; blockIndex += 1) {
        const input = new Uint8Array(previous.length + info.length + 1);
        input.set(previous, 0);
        input.set(info, previous.length);
        input[input.length - 1] = blockIndex;

        previous = await hmacSha256(prk, input);
        output.set(previous.slice(0, Math.min(previous.length, length - offset)), offset);
        offset += previous.length;
    }

    return output;
}

async function hkdfExtract(salt, ikm) {
    const extract = protocol[HKDF_EXTRACT_EXPORT];
    if (typeof extract === 'function') {
        return extract(salt, ikm);
    }
    return hkdfExtractFallback(salt, ikm);
}

async function hkdfExpand(prk, info, length) {
    const expand = protocol[HKDF_EXPAND_EXPORT];
    if (typeof expand === 'function') {
        return expand(prk, info, length);
    }
    return hkdfExpandFallback(prk, info, length);
}

// This function constructs an HKDF label that is fed later to the HKDF-Expand
// Raw bytes are not fed into the HKDF Expand, a structured label is used instead,
// this is to keep keys domain-seperated and deterministic (mirar HKDF.js)
function encodeHKDFLabel(length, label, context){
    const labelBytes = TEXT_ENCODER.encode('MLS 1.0 ' + label);
    const buf = new Uint8Array(2 + 1 + labelBytes.length + 4 + context.length);
    let o = 0;
    buf[o++] = (length >>> 8) & 0xff;
    buf[o++] = length & 0xff;
    buf[o++] = labelBytes.length;
    buf.set(labelBytes, o); o += labelBytes.length;
    const cl = context.length;
    buf[o++] = (cl >>> 24) & 0xff;
    buf[o++] = (cl >>> 16) & 0xff;
    buf[o++] = (cl >>> 8) & 0xff;
    buf[o++] = cl & 0xff;
    buf.set(context, o);
    return buf;
}

export async function expandWithLabel(secret, label, context, length){
    await init();
    const info = encodeHKDFLabel(length, label, context);
    return hkdfExpand(secret, info, length);
}

export async function deriveSecret(secret, label){
    return expandWithLabel(secret, label, new Uint8Array(0), NH);
}

function encodeGroupContext(groupId, epoch){
    const gid = TEXT_ENCODER.encode(groupId);
    const buf = new Uint8Array(4 + 2 + gid.length);
    buf[0] = (epoch >>> 24) & 0xff;
    buf[1] = (epoch >>> 16) & 0xff;
    buf[2] = (epoch >>> 8) & 0xff;
    buf[3] = epoch & 0xff;
    buf[4] = (gid.length >>> 8) & 0xff;
    buf[5] = gid.length & 0xff;
    buf.set(gid, 6);
    return buf;
}

export async function advanceEpoch({ initSecret, commitSecret, groupId, epoch }){
    await init();

    const joinerSecret = await hkdfExtract(initSecret, commitSecret);

    const epochSecret = await expandWithLabel(
        joinerSecret, 'epoch', encodeGroupContext(groupId, epoch), NH
    );

    // application messages, sender data keys and next epoch init
    const [applicationSecret, senderDataSecret, nextInitSecret] = await Promise.all([
        deriveSecret(epochSecret, 'encryption'),
        deriveSecret(epochSecret, 'sender_data'),
        deriveSecret(epochSecret, 'init'),
    ]);

    return { epochSecret, nextInitSecret, applicationSecret, senderDataSecret };
}

function encodeAppSecretContext(leafIndex, generation){
    const buf = new Uint8Array(8);
    buf[0] = (leafIndex >>> 24) & 0xff;
    buf[1] = (leafIndex >>> 16) & 0xff;
    buf[2] = (leafIndex >>> 8) & 0xff;
    buf[3] = leafIndex & 0xff;
    buf[4] = (generation >>> 24) & 0xff;
    buf[5] = (generation >>> 16) & 0xff;
    buf[6] = (generation >>> 8) & 0xff;
    buf[7] = generation & 0xff;
    return buf;
}

export async function deriveAppKeyAndNonce(applicationSecret, senderLeafIndex, generation){
    const ctx = encodeAppSecretContext(senderLeafIndex, generation);
    const [key, nonce] = await Promise.all([
        // 32 bytes for the key and 12 for the nonce
        expandWithLabel(applicationSecret, 'key', ctx, NK),
        expandWithLabel(applicationSecret, 'nonce', ctx, NN),
    ]);
    return { key, nonce };
}

export async function ratchetAppSecret(applicationSecret, senderLeafIndex, generation){
    const ctx = encodeAppSecretContext(senderLeafIndex, generation);
    return expandWithLabel(applicationSecret, 'secret', ctx, NH);
}
