import { base64ToArrayBuffer } from '../helpers'

import { fetchPublicIdentityKeyX25519, fetchPublicIdentityKeyEd25519, fetchPreKeyBundle } from '../api'

import init_xeddsa, { verify_signature } from 'xeddsa-wasm';

import init_dh, { diffie_hellman, hkdf_derive } from 'dh-wasm';

import { getIdentityKeys, getOPKPrivateKey, getPeerIdentityKeys } from '../chat/keyManagement';

const HKDF_SALT = new Uint8Array();
const CHAIN_INFO = new TextEncoder().encode('EchoProtocol/v1/KDF_CK');
const INFO_RK = new TextEncoder().encode('EchoProtocol/v1/KDF_RK');

const peerIdentityChangedError = (peerId, savedPeer, fetchedPeer) => {
    const err = new Error("Peer identity changed");
    err.code = "PEER_IDENTITY_CHANGED";
    err.peerId = String(peerId ?? "");
    err.savedPeer = savedPeer ?? null;
    err.fetchedPeer = fetchedPeer ?? null;
    return err;
};

const initializeDoubleRatchet = async (socket, targetUserId, ephemeralKey_private, publicEphemeralKey, privateKeyArray) => {
    await init_dh();

    const bundle = await fetchPreKeyBundle(socket, targetUserId);

    const savedPeer = await getPeerIdentityKeys(targetUserId);

    if (savedPeer) {

        const x = savedPeer.publicIdentityKeyX25519;
        const ed = savedPeer.publicIdentityKeyEd25519 ?? null;
        const fetchedEd = bundle.publicIdentityKeyEd25519 ?? null;

        // Treat any identity key change as suspicious (possible MITM/server key substitution).
        if (
            x !== bundle.publicIdentityKeyX25519 ||
            (ed && fetchedEd && ed !== fetchedEd)
        ) {
            throw peerIdentityChangedError(targetUserId, savedPeer, {
                publicIdentityKeyX25519: bundle.publicIdentityKeyX25519,
                ...(bundle.publicIdentityKeyEd25519 ? { publicIdentityKeyEd25519: bundle.publicIdentityKeyEd25519 } : {}),
            });
        }
    }

    const peerIdentityToPin = savedPeer
        ? null
        : {
            publicIdentityKeyX25519: bundle.publicIdentityKeyX25519,
            ...(bundle.publicIdentityKeyEd25519 ? { publicIdentityKeyEd25519: bundle.publicIdentityKeyEd25519 } : {}),
        };

    const targetPublicIdentityKeyX25519 = base64ToArrayBuffer(bundle.publicIdentityKeyX25519);
    const targetPublicIdentityKeyEd25519 = base64ToArrayBuffer(bundle.publicIdentityKeyEd25519);
    const targetSignedPreKey = base64ToArrayBuffer(bundle.signedPreKey);
    const targetSignature = base64ToArrayBuffer(bundle.signature);
    const spkId = bundle.spkId ?? null;

    console.log('🗝️⚠️⚠️Init XEdDSA with', targetSignedPreKey, targetSignature, targetPublicIdentityKeyX25519);

    await init_xeddsa();
    const isValidSignature = await verify_signature(
        targetSignature,
        targetSignedPreKey,
        targetPublicIdentityKeyEd25519);
        
    console.log("Signature", targetSignature)
    console.log("targetSignedPreKey", targetSignedPreKey)
    console.log("publicIdentityKeyEd25519", targetPublicIdentityKeyEd25519)

    console.log('Signature valid:', isValidSignature);

    // If the SPK signature has been tampered with throw ERROR 
    if (!isValidSignature) {
        throw new Error('Invalid SPK signature detected');
    }

    const identityKeys = await getIdentityKeys();
    const publicIdentityKeyX25519 = identityKeys?.publicKeyX25519;
    console.log("🗝️🎈 publicIdentityKeyX25519: ", publicIdentityKeyX25519)
    console.log("🗝️🎈 publicEphemeralKey: ", publicEphemeralKey)

    console.log("🎈🎈 Init DR with: ")
    console.log("🎈", "target Public IK: ", targetPublicIdentityKeyX25519)
    console.log("🎈", "target Public PK: ", targetSignedPreKey)
    console.log("🎈", "private EK: ", ephemeralKey_private)
    console.log("🎈", "private IK", privateKeyArray)


    const dh1 = await diffie_hellman(privateKeyArray, targetSignedPreKey);
    const dh2 = await diffie_hellman(ephemeralKey_private, targetPublicIdentityKeyX25519);
    const dh3 = await diffie_hellman(ephemeralKey_private, targetSignedPreKey);

    let opkId = null;
    let dh4 = null;
    if (bundle.opk && bundle.opk.opkId && bundle.opk.opkPub) {
        opkId = String(bundle.opk.opkId);
        const opkPub = base64ToArrayBuffer(bundle.opk.opkPub);
        dh4 = await diffie_hellman(ephemeralKey_private, opkPub);
    }

    console.log('DH1:', dh1);
    console.log('Private Key:', privateKeyArray);
    console.log('Target Signed PreKey:', targetSignedPreKey);

    console.log('DH2:', dh2);
    console.log('Target Public Identity Key:', targetPublicIdentityKeyX25519);
    console.log('Private Ephemeral Key:', ephemeralKey_private);

    console.log('DH3:', dh3);


    const parts = dh4 ? [dh1, dh2, dh3, dh4] : [dh1, dh2, dh3];
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const IKM = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
        IKM.set(p, offset);
        offset += p.length;
    }
    console.log('IKM:', IKM);

    //HKDF the IKM to produce the root key
    const root_key = hkdf_derive(IKM, HKDF_SALT, INFO_RK, 32)
    console.log('Root Key:', root_key);

    return { root_key, spkId, opkId, peerIdentityToPin };
}

const continueDoubleRatchetChain = async (socket, targetUserId, previousTargetPublicEphemeralKeyBase64, privateEphemeralKey, root_key) => {
    console.log("🚧🚧Continue DR Chain🚧🚧")
    console.log("🚧🚧Previous Target Public Ephemeral Key Base64: ", previousTargetPublicEphemeralKeyBase64)
    console.log("🚧🚧Private Ephemeral Key: ", privateEphemeralKey)

    // Only convert if not already a Uint8Array
    let previousTargetPublicEphemeralKey;
    if (previousTargetPublicEphemeralKeyBase64 instanceof Uint8Array) {
        previousTargetPublicEphemeralKey = previousTargetPublicEphemeralKeyBase64;
    } else {
        previousTargetPublicEphemeralKey = base64ToArrayBuffer(previousTargetPublicEphemeralKeyBase64);
        console.log("🚧🚧Converted Previous Target Public Ephemeral Key to ArrayBuffer: ", previousTargetPublicEphemeralKey)
    }
    console.log("🚧🚧Previous Target Public Ephemeral Key: ", previousTargetPublicEphemeralKey)

    await init_dh();
    const DH4 = await diffie_hellman(privateEphemeralKey, previousTargetPublicEphemeralKey);

    const hkdf_expand = hkdf_derive(DH4, root_key, INFO_RK, 64);
    const receivingChainKey = hkdf_expand.slice(0, 32);
    const newRootKey = hkdf_expand.slice(32);

    return { receivingChainKey, newRootKey };
}

const initializeDoubleRatchetResponse = async (socket, message, targetUserId, privateKeyArray) => {
    console.log("🚧🚧DR Response🚧🚧")


    await init_dh();
    // Retrieve the privatePreKey from ELD
    const identityKeysResponse = await getIdentityKeys();
    const storedPrivatePreKey = identityKeysResponse?.privatePreKey;
    if (!storedPrivatePreKey) {
        throw new Error('Private PreKey not found in encrypted storage');
    }
    const privatePreKey = base64ToArrayBuffer(storedPrivatePreKey);

    const encTargetPublicIdentityKeyX25519 = await fetchPublicIdentityKeyX25519(socket, targetUserId);
    // Optional: used for identity pinning checks only.
    const encTargetPublicIdentityKeyEd25519 =
        await fetchPublicIdentityKeyEd25519(socket, targetUserId).catch(() => null);

    const savedPeer = await getPeerIdentityKeys(targetUserId);
    const peerIdentityToPin = savedPeer
        ? null
        : {
            publicIdentityKeyX25519: encTargetPublicIdentityKeyX25519,
            ...(encTargetPublicIdentityKeyEd25519 ? { publicIdentityKeyEd25519: encTargetPublicIdentityKeyEd25519 } : {}),
        };

    if (savedPeer) {
        const x = savedPeer.publicIdentityKeyX25519;
        const ed = savedPeer.publicIdentityKeyEd25519 ?? null;

        // Treat any identity key change as suspicious (possible MITM/server key substitution).
        if (
            x !== encTargetPublicIdentityKeyX25519 ||
            (ed && encTargetPublicIdentityKeyEd25519 && ed !== encTargetPublicIdentityKeyEd25519)
        ) {
            throw peerIdentityChangedError(targetUserId, savedPeer, {
                publicIdentityKeyX25519: encTargetPublicIdentityKeyX25519,
                ...(encTargetPublicIdentityKeyEd25519 ? { publicIdentityKeyEd25519: encTargetPublicIdentityKeyEd25519 } : {}),
            });
        }
    }

    const targetPublicIdentityKey = base64ToArrayBuffer(encTargetPublicIdentityKeyX25519);

    const encTargetPublicEphemeralKey = message.publicEphemeralKey;
    const targetPublicEphemeralKey = base64ToArrayBuffer(encTargetPublicEphemeralKey);


    console.log("🎈🎈 Init DR Response with: ");
    console.log("🎈", "target Public IK: ", targetPublicIdentityKey)
    console.log("🎈", "private PreKey: ", privatePreKey)
    console.log("🎈", "target Public EK: ", targetPublicEphemeralKey)

    const dh1 = await diffie_hellman(privatePreKey, targetPublicIdentityKey);
    const dh2 = await diffie_hellman(privateKeyArray, targetPublicEphemeralKey);
    const dh3 = await diffie_hellman(privatePreKey, targetPublicEphemeralKey);

    let dh4 = null;
    const opkId = message?.opkId ?? null;
    if (opkId) {
        const opkPriv = await getOPKPrivateKey(opkId);
        if (!opkPriv) {
            throw new Error(`OPK private key not found for opkId=${opkId}`);
        }
        dh4 = await diffie_hellman(opkPriv, targetPublicEphemeralKey);
    }

    console.log('DH1:', dh1);
    console.log('Private PreKey:', privatePreKey);
    console.log('Target Public Identity Key:', targetPublicIdentityKey);

    console.log('DH2:', dh2);
    console.log('Target Public Ephemeral Key:', targetPublicEphemeralKey);

    console.log('DH3:', dh3);
    console.log('Private Key:', privateKeyArray);

    const parts = dh4 ? [dh1, dh2, dh3, dh4] : [dh1, dh2, dh3];
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const IKM = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
        IKM.set(p, offset);
        offset += p.length;
    }
    console.log('IKM:', IKM);

    const root_key = hkdf_derive(IKM, HKDF_SALT, INFO_RK, 32)
    console.log('Root Key:', root_key);
    return { root_key, peerIdentityToPin };
}

export {
    initializeDoubleRatchet,
    continueDoubleRatchetChain,
    initializeDoubleRatchetResponse
};
