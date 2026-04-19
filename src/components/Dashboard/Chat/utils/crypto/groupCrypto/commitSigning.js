import init, {
    generate_private_ephemeral_key,
    derive_ed25519_keypair_from_x25519,
    convert_x25519_to_xeddsa,
    compute_determenistic_nonce,
    compute_nonce_point,
    compute_challenge_hash,
    compute_signature_scaler,
    compute_signature,
    verify_signature,
    hkdf_derive,
} from '@mascaro101/echo-protocol';
import { bytesToBase64, base64ToBytes } from '../../helpers.js';

const TEXT_ENCODER = new TextEncoder();

// Key Generation
// Uses an X25519 pk as a leaf signing key
// The verifiable pk is the XEdDSA Ed25519 pk derived from it.

export async function generateLeafSigningKeypair() {
    await init();
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const leafSigningPrivKey = generate_private_ephemeral_key(randomBytes);
    const leafSigningPubKey = derive_ed25519_keypair_from_x25519(leafSigningPrivKey);

    return {
        leafSigningPrivKeyB64: bytesToBase64(leafSigningPrivKey),
        leafSigningPubKeyB64: bytesToBase64(leafSigningPubKey),
    };
}

// Canonical Ecoding 
// Deterministic byte encoding of the commit payload 

function hashBytes(bytes) {
    return hkdf_derive(bytes, new Uint8Array(0), TEXT_ENCODER.encode('EchoMLS/v1/CommitHash'), 32);
}

export function encodeCommitForSigning(commit) {
    // 1. Hash the roster - sort by leafIndex so order is deterministic
    const rosterStr = (commit.roster ?? [])
        .slice()
        .sort((a, b) => a.leafIndex - b.leafIndex)
        .map(m => `${m.userId}:${m.leafIndex}:${m.leafSigningPubKeyB64 ?? ''}`)
        .join(',');
    const rosterHash = hashBytes(TEXT_ENCODER.encode(rosterStr));

    // 2. Hash the update path public keys only not the encrypted secrets
    const pathStr = (commit.updatePath ?? [])
        .map(e => `${e.nodeIndex}:${e.publicKeyB64 ?? ''}`)
        .join(',');
    const pathHash = hashBytes(TEXT_ENCODER.encode(pathStr));

    // 3. Encode all critical fields in a fixed, determinisitic format
    const header = TEXT_ENCODER.encode(
        `EchoMLS/v1/CommitSig` +
        `|${commit.groupId}` +
        `|${commit.epoch}` +
        `|${commit.type}` +
        `|${commit.senderLeafIndex}` +
        `|${commit.targetUserId ?? ''}` +
        `|${commit.leafCount ?? ''}`
    );

    // Concatanate header + rosterHash + pathHash as the message to sign
    const message = new Uint8Array(header.length + rosterHash.length + pathHash.length);
    message.set(header, 0);
    message.set(rosterHash, header.length);
    message.set(pathHash, header.length + rosterHash.length);

    return message;
}

// Sign 

export async function signCommit(commit, leafSigningPrivKeyB64) {
    await init();

    const privKey = base64ToBytes(leafSigningPrivKeyB64);
    const message = encodeCommitForSigning(commit);

    const xeddsaKey = convert_x25519_to_xeddsa(privKey);
    const edPrivScaler = xeddsaKey.slice(0, 32);
    const prefix = xeddsaKey.slice(32, 64);
    const pubEdKey = derive_ed25519_keypair_from_x25519(privKey);

    const nonce = compute_determenistic_nonce(prefix, message);
    const noncePoint = compute_nonce_point(nonce);
    const challenge = compute_challenge_hash(noncePoint, pubEdKey, message);
    const sigScaler = compute_signature_scaler(nonce, challenge, edPrivScaler);
    const signature = compute_signature(noncePoint, sigScaler);

    return bytesToBase64(signature);
}

// Verify

export async function verifyCommit(commit, senderSigningPubKeyB64) {
    await init();

    if (!commit.signature || !senderSigningPubKeyB64) {
        throw new Error('Commit missing signature or signing pub key');
    }

    const pubKey = base64ToBytes(senderSigningPubKeyB64);
    const sigBytes = base64ToBytes(commit.signature);
    const message = encodeCommitForSigning(commit);

    const valid = verify_signature(sigBytes, message, pubKey);
    if (!valid) throw new Error('Commit signature invalid');
}


