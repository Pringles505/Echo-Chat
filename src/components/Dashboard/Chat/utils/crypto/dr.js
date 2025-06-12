import {base64ToArrayBuffer} from '../helpers'

import {fetchPublicIdentityKeyX25519, fetchSignedPreKey, fetchPublicIdentityKeyEd25519} from '../api'

import init_xeddsa, {verify_signature} from 'xeddsa-wasm';

import init_dh, {diffie_hellman, hkdf_derive  } from 'dh-wasm';

const initializeDoubleRatchet = async (socket, targetUserId, ephemeralKey_private, publicEphemeralKey, privateKeyArray) => {
    await init_dh();
    console.log('🗝️⚠️⚠️Initializing Double Ratchet...');
    const encTargetPublicIdentityKeyX25519 = await fetchPublicIdentityKeyX25519(socket, targetUserId);
    const targetPublicIdentityKeyX25519 = base64ToArrayBuffer(encTargetPublicIdentityKeyX25519);

    const encTargetPublicIdentityKeyEd25519 = await fetchPublicIdentityKeyEd25519(socket, targetUserId);
    const targetPublicIdentityKeyEd25519 = base64ToArrayBuffer(encTargetPublicIdentityKeyEd25519);

    console.log('BINGO');
    const { signedPreKey, signature } = await fetchSignedPreKey(socket, targetUserId);
    const targetSignedPreKey = base64ToArrayBuffer(signedPreKey);
    const targetSignature = base64ToArrayBuffer(signature);

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


    const publicIdentityKeyX25519 = localStorage.getItem('publicKeyX25519');
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

    console.log('DH1:', dh1);
    console.log('Private Key:', privateKeyArray);
    console.log('Target Signed PreKey:', targetSignedPreKey);

    console.log('DH2:', dh2);
    console.log('Target Public Identity Key:', targetPublicIdentityKeyX25519);
    console.log('Private Ephemeral Key:', ephemeralKey_private);

    console.log('DH3:', dh3);


    const IKM = new Uint8Array(dh1.length + dh2.length + dh3.length);
    IKM.set(dh1, 0);
    IKM.set(dh2, dh1.length);
    IKM.set(dh3, dh1.length + dh2.length);
    console.log('IKM:', IKM);

    //HKDF the IKM to produce the root key
    const root_key = hkdf_derive(IKM, 0, "EchoProtocol", 32)
    console.log('Root Key:', root_key);

    return root_key;
}

const continueDoubleRatchetChain = async (socket, targetUserId, previousTargetPublicEphemeralKeyBase64, privateEphemeralKey) => {
    console.log("🚧🚧Continue DR Chain🚧🚧")
    console.log("🚧🚧Previous Target Public Ephemeral Key Base64: ", previousTargetPublicEphemeralKeyBase64)
    console.log("🚧🚧Private Ephemeral Key: ", privateEphemeralKey)
    const { signedPreKey, signature } = await fetchSignedPreKey(socket, targetUserId);
    const targetSignedPreKey = base64ToArrayBuffer(signedPreKey);
    const targetSignature = base64ToArrayBuffer(signature);

    const encTargetPublicIdentityKeyEd25519 = await fetchPublicIdentityKeyEd25519(socket, targetUserId);
    const targetPublicIdentityKeyEd25519 = base64ToArrayBuffer(encTargetPublicIdentityKeyEd25519);

    await init_xeddsa();
    const isValidSignature = await verify_signature(
        targetSignature,
        targetSignedPreKey,
        targetPublicIdentityKeyEd25519);
    console.log("isXeddsaVlidSignature🚧🚧: ", isValidSignature)

    if (!isValidSignature) {
        console.error('❌ Invalid signature for target signed prekey');
        throw new Error('Invalid signature for target signed prekey');
    }

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
    const chainKey = hkdf_derive(DH4, 0, "EchoProtocol", 32);

    return chainKey;
}

const initializeDoubleRatchetResponse = async (socket, message, userId, targetUserId, privateKeyArray ) => {
    console.log("🚧🚧DR Response🚧🚧")


    await init_dh();
    // Retrieve the privatePreKey from local storage
    const storedPrivatePreKey = localStorage.getItem('privatePreKey');
    if (!storedPrivatePreKey) {
        throw new Error('Private PreKey not found in local storage');
    }
    const privatePreKey = base64ToArrayBuffer(storedPrivatePreKey);

    const encTargetPublicIdentityKey = await fetchPublicIdentityKeyX25519(socket, targetUserId);
    const targetPublicIdentityKey = base64ToArrayBuffer(encTargetPublicIdentityKey);

    const encTargetPublicEphemeralKey = message.publicEphemeralKey;
    const targetPublicEphemeralKey = base64ToArrayBuffer(encTargetPublicEphemeralKey);


    console.log("🎈🎈 Init DR Response with: ");
    console.log("🎈", "target Public IK: ", targetPublicIdentityKey)
    console.log("🎈", "private PreKey: ", privatePreKey)
    console.log("🎈", "target Public EK: ", targetPublicEphemeralKey)

    const dh1 = await diffie_hellman(privatePreKey, targetPublicIdentityKey);
    const dh2 = await diffie_hellman(privateKeyArray, targetPublicEphemeralKey);
    const dh3 = await diffie_hellman(privatePreKey, targetPublicEphemeralKey);

    console.log('DH1:', dh1);
    console.log('Private PreKey:', privatePreKey);
    console.log('Target Public Identity Key:', targetPublicIdentityKey);

    console.log('DH2:', dh2);
    console.log('Target Public Ephemeral Key:', targetPublicEphemeralKey);

    console.log('DH3:', dh3);
    console.log('Private Key:', privateKeyArray);

    const IKM = new Uint8Array(dh1.length + dh2.length + dh3.length);
    IKM.set(dh1, 0);
    IKM.set(dh2, dh1.length);
    IKM.set(dh3, dh1.length + dh2.length);
    console.log('IKM:', IKM);

    const root_key = hkdf_derive(IKM, 0, "EchoProtocol", 32)
    console.log('Root Key:', root_key);
    return root_key;
}

export {
    initializeDoubleRatchet,
    continueDoubleRatchetChain,
    initializeDoubleRatchetResponse
};