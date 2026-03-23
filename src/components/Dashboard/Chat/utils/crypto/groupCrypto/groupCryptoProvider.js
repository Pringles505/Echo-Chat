import eld from '../../../../../../utils/storage/EncryptedLocalDatabase.js';
import { base64ToBytes, bytesToBase64 } from '../../helpers.js';

// Protocol Imports
import init, {
  decrypt_aad_bytes,
  diffie_hellman,
  encrypt_aad_bytes,
  generate_private_ephemeral_key,
  generate_public_ephemeral_key,
  hkdf_derive,
} from '@mascaro101/echo-protocol';

// TreeKEM math Imports
import {
  copath,
  directPath,
  leafNode,
  nodeWidth,
  resolution,
} from './treemath.js';

// Key schedule Imports
import {
  advanceEpoch,
  deriveAppKeyAndNonce,
  deriveSecret,
  expandWithLabel,
  ratchetAppSecret,
} from './keySchedule.js';

// local group state management 
const MLS_STATE_VERSION = 1;
// Prefix for keys in the ELD, the full key is this prefix + groupId
const MLS_STATE_PREFIX = 'echo-mls:groupState:';
// Default cipher suite, for now we only support one
const DEFAULT_MLS_CIPHER_SUITE = 'ECHO-MLS/X25519_AES256GCM_SHA256';
// Constants for HKDF expand labels, these are used to derive different keys from the same secret
const MLS_HEADER_VERSION = 1;
// Helper functions for converting js strings to UTF-8 bytes, crypto use bytes not strings
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });
// HKDF info domain-seperation label for wrapping welcome messages
const WRAP_INFO = TEXT_ENCODER.encode('EchoMLS/v1/WelcomeWrap');
// HKDF info domain-seperation label for wrapping path secrets in the update path
const PATH_SECRET_WRAP_INFO = TEXT_ENCODER.encode('EchoMLS/v1/PathSecretWrap');

// builds storage key string for groupId
function getGroupState(groupId) {
  return `${MLS_STATE_PREFIX}${groupId}`;
}

// Crypto functions require consistant byte format -- Uint8Array
function normalizeBytes(value, fieldName) {
  // If Uint8Array return as is
  if (value instanceof Uint8Array) return value;
  // If ArrayBuffer wrap in Uint8Array
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  // If plainJs byte array wrap in Uint8Array
  if (Array.isArray(value)) return new Uint8Array(value);
  // Any other typed array create Uint8Array view using same buffer, offset and length
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  // error out if not a recognized byte format
  throw new Error(`Invalid ${fieldName}; expected byte array input`);
}

// Utility function to generate secure random bytes, used for generating secrets and nonces
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

// Utility function that cleans member list before MLS logic
function normalizeRoster(roster) {
  // If roster is not formated return empty array 
  if (!Array.isArray(roster)) return [];

  // Map roster to expected format, filter out entries without userId, and sort by leafIndex
  return roster
    .map((member, index) => ({
      userId: String(member?.userId ?? ''),
      username: member?.username ?? 'Member',
      leafIndex: Number.isInteger(member?.leafIndex) ? member.leafIndex : index,
    }))
    .filter((member) => member.userId.length > 0)
    .sort((a, b) => a.leafIndex - b.leafIndex);
}

// Calculates the index of a leaf given the roster and the userId
function findLeafIndexForUser(roster, userId) {
  const match = normalizeRoster(roster).find(
    (member) => String(member.userId) === String(userId ?? ''),
  );
  return Number.isInteger(match?.leafIndex) ? match.leafIndex : null;
}

// Calculates the number of leaves in the tree given the roster
function leafCountFromRoster(roster, extraLeafIndex = null) {
  const leafIndices = normalizeRoster(roster).map((member) => member.leafIndex);
  if (Number.isInteger(extraLeafIndex)) leafIndices.push(extraLeafIndex);
  if (leafIndices.length === 0) return 0;
  return Math.max(...leafIndices) + 1;
}

// Estimate leaf members the TreeKem tree currently represents based on total node slots
// 2n -1 = nodes, n = (nodes + 1)/2
function leafCountFromNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;
  return Math.floor((nodes.length + 1) / 2);
}

// Given the roster and the current tree nodes, estimate the leaf count needed to represent 
// all members in the roster and the tree, this is used to determine how many nodes the tree 
// should have when loading or creating a group state
function computeLeafCount({ roster = [], treeNodes = [], extraLeafIndex = null }) {
  return Math.max(
    leafCountFromRoster(roster, extraLeafIndex),
    leafCountFromNodes(treeNodes),
  );
}

// Creates a sanitized copy of one tree node object, checks that pk and sk are valid STRINGS
// and are not empty. Return if so, return null if not
function cloneNode(node) {
  return {
    publicKeyB64: typeof node?.publicKeyB64 === 'string' && node.publicKeyB64.length > 0
      ? node.publicKeyB64
      : null,
    privateKeyB64: typeof node?.privateKeyB64 === 'string' && node.privateKeyB64.length > 0
      ? node.privateKeyB64
      : null,
  };
}

// builds a new tree-node array of exact length "width"
// if resized to grow, creates empty nodes and cleans the others
function resizeNodes(nodes, width) {
  return Array.from({ length: width }, (_, index) => cloneNode(nodes?.[index]));
}

// turn the header object into raw bytes to feed into crypto functions
function makeHeaderBytes(header) {
  return TEXT_ENCODER.encode(JSON.stringify(header));
}

// turn the header object into base64 string to feed into MLS message fields
function makeHeaderB64(header) {
  return bytesToBase64(makeHeaderBytes(header));
}

// Turn incoming header bytes into an object, this is used when parsing incoming messages
function parseHeader(header) {
  if (typeof header === 'string') {
    return JSON.parse(TEXT_DECODER.decode(base64ToBytes(header)));
  }
  if (header && typeof header === 'object') return header;
  throw new Error('Missing MLS header');
}

// This encodes the label, context and length into a byte array to be fed into HKDF
// if already bytes return the normalized bytes
function normalizePlaintextBytes(plaintextBytes) {
  if (typeof plaintextBytes === 'string') {
    return TEXT_ENCODER.encode(plaintextBytes);
  }
  return normalizeBytes(plaintextBytes, 'plaintextBytes');
}

// Creates the AAD bytes for commit-related encryption
function makeCommitAadBytes(groupId, epoch) {
  return TEXT_ENCODER.encode(`EchoMLS/v1/Commit|${groupId}|${epoch}`);
}

// Creates the AAD bytes for path secret encryption
function makePathSecretAadBytes(nodeIndex) {
  return TEXT_ENCODER.encode(`EchoMLS/v1/PathSecret|nodeIndex:${nodeIndex}`);
}

// picks which stored group key to use, uses stae.applicationSecretB64 if available
// falls back to state.groupKeyB64 for legacy support, throws if neither are available
function resolveApplicationKey(state) {
  const applicationSecretB64 = typeof state?.applicationSecretB64 === 'string' && state.applicationSecretB64.length > 0
    ? state.applicationSecretB64
    : (
      typeof state?.groupKeyB64 === 'string' && state.groupKeyB64.length > 0
        ? state.groupKeyB64
        : null
    );

  if (!applicationSecretB64) {
    throw new Error(`Group state is missing application key material for group ${state?.groupId ?? ''}`);
  }

  return { applicationSecretB64, keyBytes: base64ToBytes(applicationSecretB64) };
}

// Combines known private keys with recieved list of public keys 
// to build a full tree representation with private keys in the correct nodes
function makeTreeFromPublicNodes(publicNodes, currentNodes = []) {
  if (!Array.isArray(publicNodes)) return [];
  return publicNodes.map((publicKeyB64, index) => ({
    publicKeyB64: typeof publicKeyB64 === 'string' && publicKeyB64.length > 0 ? publicKeyB64 : null,
    privateKeyB64: currentNodes[index]?.privateKeyB64 ?? null,
  }));
}

// Puts own private key into own node in the tree
function installOwnLeafPrivateKey(nodes, selfLeafIndex, selfPrivKeyB64) {
  if (!Number.isInteger(selfLeafIndex) || typeof selfPrivKeyB64 !== 'string' || selfPrivKeyB64.length === 0) {
    return;
  }

  const nodeIndex = leafNode(selfLeafIndex);
  if (nodeIndex >= nodes.length) return;

  const privBytes = base64ToBytes(selfPrivKeyB64);
  nodes[nodeIndex] = {
    publicKeyB64: bytesToBase64(generate_public_ephemeral_key(privBytes)),
    privateKeyB64: selfPrivKeyB64,
  };
}

// Normalize and sanitize group state ebfore being used or updated
function normalizeGroupState(state) {

  // throw if missing state
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid group state');
  }

  // normalize the roster and find the self leaf index
  const roster = normalizeRoster(state.roster);
  const selfLeafIndex = Number.isInteger(state.selfLeafIndex)
    ? state.selfLeafIndex
    : findLeafIndexForUser(roster, state.selfUserId);

  // computes the number of leaves 
  const leafCount = computeLeafCount({
    roster,
    treeNodes: state.tree?.nodes,
    extraLeafIndex: selfLeafIndex,
  });

  // compute the width of the tree and resize the tree nodes to match
  // this will clean all nodes and ensure the tree has the correct number of nodes to represent the roster
  const width = nodeWidth(leafCount);
  const treeNodes = resizeNodes(state.tree?.nodes, width);

  // normalize sender generations, stringifies keys and if own generation key is missing
  // but applicationMessageCounter and selfLeafIndex are available, add self generation to the map
  const rawSenderGenerations = state.senderGenerations && typeof state.senderGenerations === 'object'
    ? state.senderGenerations
    : {};
  const senderGenerations = Object.fromEntries(
    Object.entries(rawSenderGenerations)
      .filter(([, value]) => Number.isInteger(value))
      .map(([key, value]) => [String(key), value]),
  );

  if (
    Number.isInteger(selfLeafIndex)
    && Number.isInteger(state.applicationMessageCounter)
    && senderGenerations[String(selfLeafIndex)] === undefined
  ) {
    senderGenerations[String(selfLeafIndex)] = state.applicationMessageCounter;
  }

  // Resolve applicationSecretB64 with fallback to groupKeyB64
  const applicationSecretB64 = state.applicationSecretB64 === null
    ? null
    : (
      typeof state.applicationSecretB64 === 'string' && state.applicationSecretB64.length > 0
        ? state.applicationSecretB64
        : (
          state.groupKeyB64 === null
            ? null
            : (
              typeof state.groupKeyB64 === 'string' && state.groupKeyB64.length > 0
                ? state.groupKeyB64
                : null
            )
        )
    );

  // Resolve initSecret with fallback to state.secrets.initSecretsB64
  const initSecretB64 = state.initSecretB64 === null
    ? null
    : (
      typeof state.initSecretB64 === 'string' && state.initSecretB64.length > 0
        ? state.initSecretB64
        : (
          state.secrets?.initSecretB64 === null
            ? null
            : (
              typeof state.secrets?.initSecretB64 === 'string' && state.secrets.initSecretB64.length > 0
                ? state.secrets.initSecretB64
                : null
            )
        )
    );

  // returns canonical state object with normalized roster, tree and keys, this is the format that the rest of the code expects
  // basically returns a cleaned up version of the input state with fallbacks 
  return {
    stateVersion: state.stateVersion || MLS_STATE_VERSION,
    groupId: state.groupId,
    epoch: Number.isInteger(state.epoch) ? state.epoch : 0,
    cipherSuite: typeof state.cipherSuite === 'string' && state.cipherSuite.length > 0
      ? state.cipherSuite
      : DEFAULT_MLS_CIPHER_SUITE,
    selfUserId: state.selfUserId ?? null,
    selfLeafIndex,
    applicationSecretB64,
    initSecretB64,
    senderGenerations,
    roster,
    tree: { nodes: treeNodes },
    secrets: {
      initSecretB64,
      epochInitSecretB64: typeof state.secrets?.epochInitSecretB64 === 'string'
        ? state.secrets.epochInitSecretB64
        : null,
      epochCommitSecretB64: typeof state.secrets?.epochCommitSecretB64 === 'string'
        ? state.secrets.epochCommitSecretB64
        : null,
    },
    pendingCommits: Array.isArray(state.pendingCommits) ? state.pendingCommits : [],
    createdAt: state.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    groupKeyB64: applicationSecretB64,
    applicationMessageCounter: Number.isInteger(selfLeafIndex)
      ? (senderGenerations[String(selfLeafIndex)] ?? 0)
      : 0,
  };
}

// Builds the initial treeKEM node array from the group roster
async function initTreeFromRoster(roster, selfLeafIndex, selfPrivKeyB64, memberInitKeys) {

  // initialize crypto, this will load the WASM module 
  await init();

  // normalize the roster and size the tree
  const normalizedRoster = normalizeRoster(roster);
  const leafCount = leafCountFromRoster(normalizedRoster, selfLeafIndex);
  const width = nodeWidth(leafCount);
  const nodes = resizeNodes([], width);

  // Fill each members leaf node
  for (const member of normalizedRoster) {
    const nodeIndex = leafNode(member.leafIndex);
    if (nodeIndex >= width) continue;

    // If this leaf is self, install the private key and corresponding public key in the tree node
    if (member.leafIndex === selfLeafIndex && selfPrivKeyB64) {
      const privBytes = base64ToBytes(selfPrivKeyB64);
      nodes[nodeIndex] = {
        publicKeyB64: bytesToBase64(generate_public_ephemeral_key(privBytes)),
        privateKeyB64: selfPrivKeyB64,
      };
      continue;
    }

    // find initKeyB64 for this member, if found install the pk in the tree node, sk will be secret
    const memberInitKey = memberInitKeys?.find(
      (entry) => String(entry.userId) === String(member.userId),
    );
    if (memberInitKey?.initKeyB64) {
      nodes[nodeIndex] = {
        publicKeyB64: memberInitKey.initKeyB64,
        privateKeyB64: null,
      };
    }
  }

  return nodes;
}

// encrypts a group secret so only one recipient can decrypt it
async function wrapGroupKey(groupKeyB64, recipientInitKeyB64, aadBytes) {

  // initialize crypto, this will load the WASM module 
  await init();

  // Decode inputs from base64 to bytes
  const groupKeyBytes = base64ToBytes(groupKeyB64);
  const recipientPub = base64ToBytes(recipientInitKeyB64);

  // Generate an ephemeral key pair for this encryption
  const ephPriv = generate_private_ephemeral_key(randomBytes(32));
  const ephPub = generate_public_ephemeral_key(ephPriv);

  // Derive a shared secret using Diffie-Hellman between the ephemeral sk and the peers pk
  const sharedSecret = diffie_hellman(ephPriv, recipientPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), WRAP_INFO, 32);
  const nonce = randomBytes(12);
  const encryptedBytes = encrypt_aad_bytes(groupKeyBytes, wrapKey, nonce, aadBytes);

  // Return the encrypted bytes, the eph pk and the nonce
  return {
    encryptedB64: bytesToBase64(encryptedBytes),
    ephPubB64: bytesToBase64(ephPub),
    nonceB64: bytesToBase64(nonce),
  };
}

// decrypts a group secret that was encrypted for this recipient
async function unwrapGroupKey({ encryptedB64, ephPubB64, nonceB64 }, myInitPrivKeyB64, aadBytes) {
  // initialize crypto, this will load the WASM module 
  await init();

   // Decode inputs from base64 to bytes
  const encryptedBytes = base64ToBytes(encryptedB64);
  const ephPub = base64ToBytes(ephPubB64);
  const nonce = base64ToBytes(nonceB64);
  const myPriv = base64ToBytes(myInitPrivKeyB64);

  // derive shared secret using Diffe-Hellman and the ephemeral pk and own init sk
  const sharedSecret = diffie_hellman(myPriv, ephPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), WRAP_INFO, 32);

  // decrypt the group key using the derived shared secret
  const groupKeyBytes = decrypt_aad_bytes(encryptedBytes, wrapKey, nonce, aadBytes);
  return bytesToBase64(groupKeyBytes);
}

// encrypts a path secret for a recipient public key, used in the update path
async function wrapPathSecret(pathSecretBytes, recipientPubB64, aadBytes) {

  // initialize crypto, this will load the WASM module 
  await init();

  // Decode recipient public key from base64 to bytes 
  const recipientPub = base64ToBytes(recipientPubB64);

  // Generate an ephemeral key pair for this encryption
  const ephPriv = generate_private_ephemeral_key(randomBytes(32));
  const ephPub = generate_public_ephemeral_key(ephPriv);

  // Derive shared secret using Diffie-Hellman between the ephemeral sk and the peers pk 
  const sharedSecret = diffie_hellman(ephPriv, recipientPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), PATH_SECRET_WRAP_INFO, 32);
  const nonce = randomBytes(12);

  // encrypt the path secret using the derived shared secret, the nonce and the provided AAD
  const encryptedBytes = encrypt_aad_bytes(pathSecretBytes, wrapKey, nonce, aadBytes);

  return {
    encryptedB64: bytesToBase64(encryptedBytes),
    ephPubB64: bytesToBase64(ephPub),
    nonceB64: bytesToBase64(nonce),
  };
}

// decrypts a path secret that was encrypted for this recipient, used in the update path
async function unwrapPathSecret({ encryptedB64, ephPubB64, nonceB64 }, myPrivKeyB64, aadBytes) {
  // initialize crypto, this will load the WASM module 
  await init();

  // Decode inputs from base64 to bytes
  const encryptedBytes = base64ToBytes(encryptedB64);
  const ephPub = base64ToBytes(ephPubB64);
  const nonce = base64ToBytes(nonceB64);
  const myPriv = base64ToBytes(myPrivKeyB64);

  // derive shared secret using Diffe-Hellman and the ephemeral pk and own init sk
  const sharedSecret = diffie_hellman(myPriv, ephPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), PATH_SECRET_WRAP_INFO, 32);

  // decrypt the path secret using the derived shared secret, the nonce and the provided AAD
  return decrypt_aad_bytes(encryptedBytes, wrapKey, nonce, aadBytes);
}

// This function builds the update path for a given sender
// it generates new path secrets for each node in the direct path 
// and encrypts them for the appropriate recipients
async function buildUpdatePath(treeNodes, senderLeafIndex, leafCount) {
  // initialize crypto, this will load the WASM module 
  await init();

  // compute the direct path and copath nodes for the sender, these are used to determine which nodes
  // need to be updated and which recipients need to be sent the new path secrets
  const senderNodeIndex = leafNode(senderLeafIndex);
  const pathNodes = [senderNodeIndex, ...directPath(senderNodeIndex, leafCount)];
  const copathNodes = copath(senderNodeIndex, leafCount);

  // generate a random path secret for each node in the direct path, the path secret for each node
  // is derived from the previous one, this creates a chain of secrets that can be used to efficiently
  // update the tree and derive the new epoch secret for the commit, the final ps is the commit secret for the new epoch
  const pathSecrets = [randomBytes(32)];
  for (let index = 1; index < pathNodes.length; index++) {
    pathSecrets.push(await deriveSecret(pathSecrets[index - 1], 'path'));
  }

  // the commit secret for the new epoch is derived from the last ps, this is the secret that will be used to derive
  // the epoch secret and the application secret for the new epoch
  const commitSecret = await deriveSecret(pathSecrets[pathSecrets.length - 1], 'path');

  // for each node in the direct path, encrypt the corresponding ps for the appropriate recipients
  // the recipients for each node are determined by the copath, for the first node it's just the sender
  // for the rest it's the siblings of the nodes in the direct path
  const updatePath = [];
  for (let index = 0; index < pathNodes.length; index++) {
    const nodeIndex = pathNodes[index];
    const pathSecret = pathSecrets[index];
    const nodePrivBytes = await expandWithLabel(pathSecret, 'node', new Uint8Array(0), 32);
    const nodePubBytes = generate_public_ephemeral_key(nodePrivBytes);

    // the recipients for this node are determined by the copath, for the first node it's just the sender
    const recipientNodeIndices = new Set();
    if (index === 0) recipientNodeIndices.add(senderNodeIndex);

    // The recipients are the siblings of the nodes in the direct path, which are determined by the copath
    if (index < copathNodes.length) {
      for (const recipientNodeIdx of resolution(treeNodes, copathNodes[index], leafCount)) {
        recipientNodeIndices.add(recipientNodeIdx);
      }
    }

    // Encrypt the path secret for each recipient, the AAD for this encryption is the node index 
    const encryptedPathSecrets = [];
    for (const recipientNodeIdx of recipientNodeIndices) {
      const recipientPubB64 = treeNodes[recipientNodeIdx]?.publicKeyB64;
      if (!recipientPubB64) continue;

      const wrapped = await wrapPathSecret(
        pathSecret,
        recipientPubB64,
        makePathSecretAadBytes(nodeIndex),
      );

      encryptedPathSecrets.push({
        recipientNodeIdx,
        ...wrapped,
      });
    }

    // add the new public key for this node and the encrypted path secrets to the update path, 
    // the private key is only included if the sender is also the recipient of this node update
    updatePath.push({
      nodeIndex,
      publicKeyB64: bytesToBase64(nodePubBytes),
      privateKeyB64: bytesToBase64(nodePrivBytes),
      encryptedPathSecrets,
    });
  }

  return { updatePath, commitSecret };
}

// buids the post commit tree snapshot from an existing tree + update path 
function deriveCommitTree(treeNodes, updatePath, ownedLeafIndex, senderLeafIndex) {

  // the nextTree is resized to match the current tree
  const nextTree = resizeNodes(treeNodes, treeNodes.length);

  // for each node in the update path, replace the corresponding node in the tree with the new pk and
  // include the new sk if the sender is also the recipient of this node update, otherwise set sk to null
  for (const entry of updatePath) {
    nextTree[entry.nodeIndex] = {
      publicKeyB64: entry.publicKeyB64,
      privateKeyB64: (
        Number.isInteger(ownedLeafIndex)
        && ownedLeafIndex === senderLeafIndex
        && typeof entry.privateKeyB64 === 'string'
      )
        ? entry.privateKeyB64
        : null,
    };
  }

  return nextTree;
}

// Apply new pk path nodes into your local tree and try to recover the commitSecret for this commit
async function applyUpdatePath(treeNodes, updatePath, senderLeafIndex, leafCount, myLeafIndex, myPrivKeyB64) {
  
  // compute sender path geometry
  const senderNodeIndex = leafNode(senderLeafIndex);
  const pathNodes = [senderNodeIndex, ...directPath(senderNodeIndex, leafCount)];
  const copathNodes = copath(senderNodeIndex, leafCount);

  // for each entry in updatePath sets pkB64 to entry.pkB64 and skB64 to null
  for (const entry of updatePath) {
    treeNodes[entry.nodeIndex] = {
      publicKeyB64: entry.publicKeyB64,
      privateKeyB64: null,
    };
  }

  // verify we can decrypt (if missing or invalid returns null)
  const myNodeIdx = Number.isInteger(myLeafIndex) ? leafNode(myLeafIndex) : null;
  if (!Number.isInteger(myNodeIdx) || typeof myPrivKeyB64 !== 'string' || myPrivKeyB64.length === 0) {
    return null;
  }

  // internal helper, decrypts one encrypted ps with unwrapPsAaadBytes then repeatedly derives up the path
  // final extra derive fives the commitSecret
  const decryptCommitSecretFromPath = async (pathIndex, encrypted) => {
    const pathSecret = await unwrapPathSecret(
      encrypted,
      myPrivKeyB64,
      makePathSecretAadBytes(pathNodes[pathIndex]),
    );

    let current = pathSecret;
    for (let index = pathIndex + 1; index < pathNodes.length; index++) {
      current = await deriveSecret(current, 'path');
    }
    return deriveSecret(current, 'path');
  };

  // if you are the sender try to decrypt the self-targeted encrypted entry from updatePath[0]
  if (myLeafIndex === senderLeafIndex) {
    const selfEncrypted = updatePath[0]?.encryptedPathSecrets?.find(
      (entry) => entry.recipientNodeIdx === myNodeIdx,
    );
    if (selfEncrypted) {
      try {
        return await decryptCommitSecretFromPath(0, selfEncrypted);
      } catch {
        return null;
      }
    }
  }

  // If not sender, for each copath level check if you node is in resolution, find encrypted entry for your ndoe
  // try decrypting and deriving commitSecret
  for (let index = 0; index < copathNodes.length; index++) {
    const res = resolution(treeNodes, copathNodes[index], leafCount);
    if (!res.includes(myNodeIdx)) continue;

    const encrypted = updatePath[index]?.encryptedPathSecrets?.find(
      (entry) => entry.recipientNodeIdx === myNodeIdx,
    );
    if (!encrypted) continue;

    try {
      return await decryptCommitSecretFromPath(index, encrypted);
    } catch {
      return null;
    }
  }

  return null;
}

// wipes a members leaf node and all ancestor nodes on that leafs direct path
function blankNodeAndPath(treeNodes, leafIndex, leafCount) {
  if (!Number.isInteger(leafIndex)) return;

  // set that leafs pk and sk to null
  const targetNodeIndex = leafNode(leafIndex);
  if (targetNodeIndex < treeNodes.length) {
    treeNodes[targetNodeIndex] = { publicKeyB64: null, privateKeyB64: null };
  }

  // for every node in direct path set pk and sk to null
  for (const nodeIndex of directPath(targetNodeIndex, leafCount)) {
    if (nodeIndex < treeNodes.length) {
      treeNodes[nodeIndex] = { publicKeyB64: null, privateKeyB64: null };
    }
  }
}

// fils leaf nodes with members public init keys 
function installLeafPublicKeysFromMemberInitKeys(treeNodes, roster, memberInitKeys) {

  // build map from member init keys
  const initKeyMap = new Map(
    (Array.isArray(memberInitKeys) ? memberInitKeys : [])
      .filter((entry) => typeof entry?.initKeyB64 === 'string' && entry.initKeyB64.length > 0)
      .map((entry) => [String(entry.userId), entry.initKeyB64]),
  );

  // loop over normalized roster
  // for each member lookup pkB64 compute leaf node slot in leafnode
  for (const member of normalizeRoster(roster)) {
    if (!Number.isInteger(member.leafIndex)) continue;
    const publicKeyB64 = initKeyMap.get(String(member.userId));
    if (!publicKeyB64) continue;

    const nodeIndex = leafNode(member.leafIndex);
    if (nodeIndex >= treeNodes.length) continue;

    // install the pkB64 in the correct tree node, do not overwrite any existing skB64
    treeNodes[nodeIndex] = {
      publicKeyB64,
      privateKeyB64: treeNodes[nodeIndex]?.privateKeyB64 ?? null,
    };
  }
}

// Validates, normalizes and persits one groups MLS state in the ELD
export async function saveGroupState(groupId, state) {
  if (!eld.isUnlocked()) {
    throw new Error('ELD must be unlocked before saving group state');
  }

  const normalized = normalizeGroupState({ ...state, groupId });
  await eld.storeMlsGroupState(groupId, {
    id: getGroupState(groupId),
    groupId,
    state: normalized,
  });

  return normalized;
}

// Loads and validates one groups MLS state from the ELD 
export async function loadGroupState(groupId) {
  if (!eld.isUnlocked()) {
    throw new Error('ELD must be unlocked before loading group state');
  }

  const record = await eld.getMlsGroupState(groupId);
  if (!record?.state) return null;

  if (record.state.stateVersion !== MLS_STATE_VERSION) {
    throw new Error(`Incompatible group state version for group ${groupId}`);
  }

  return normalizeGroupState(record.state);
}

// Creates new group state
export async function createNewGroupState({
  groupId,
  creatorUserId,
  roster,
  cipherSuite = DEFAULT_MLS_CIPHER_SUITE,
  memberInitKeys = [],
  selfInitPrivKeyB64 = null,
}) {
  
  // normalize the roster and find the leaf index for the creator user
  const normalizedRoster = normalizeRoster(roster);
  const selfLeafIndex = findLeafIndexForUser(normalizedRoster, creatorUserId);

  // generate two random seed secrets for epoch 0
  const initSecret0 = randomBytes(32);
  const commitSecret0 = randomBytes(32);

  // advance the epoch using the generated secrets to derive the initial application secret and the 
  // next init secret for the group 
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: initSecret0,
    commitSecret: commitSecret0,
    groupId,
    epoch: 0,
  });

  // build the initial tree nodes for epoch 0 using the roster and the creator leaf index and init key
  const treeNodes = await initTreeFromRoster(
    normalizedRoster,
    selfLeafIndex,
    selfInitPrivKeyB64,
    memberInitKeys,
  );

  // return and save the initial group state, this will be the state for epoch 0
  return saveGroupState(groupId, {
    stateVersion: MLS_STATE_VERSION,
    groupId,
    epoch: 0,
    cipherSuite,
    selfUserId: creatorUserId,
    selfLeafIndex,
    applicationSecretB64: bytesToBase64(applicationSecret),
    initSecretB64: bytesToBase64(nextInitSecret),
    senderGenerations: {},
    roster: normalizedRoster,
    tree: { nodes: treeNodes },
    secrets: {
      initSecretB64: bytesToBase64(nextInitSecret),
      epochInitSecretB64: bytesToBase64(initSecret0),
      epochCommitSecretB64: bytesToBase64(commitSecret0),
    },
    pendingCommits: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// Build initial welcome message recieved by each member when they are added to a group 
export async function buildInitialWelcomes({ creatorState, roster, memberInitKeys }) {

  // Validate inputs and load state
  const state = normalizeGroupState(creatorState);
  const normalizedRoster = normalizeRoster(roster);
  const initSecretB64 = state.secrets.epochInitSecretB64;
  const commitSecretB64 = state.secrets.epochCommitSecretB64;

  // these secrets are required to build the welcome messages
  if (!initSecretB64 || !commitSecretB64) {
    throw new Error(`Creator state is missing epoch seed secrets for group ${state.groupId}`);
  }

  // builds commit AAD
  const aadBytes = makeCommitAadBytes(state.groupId, state.epoch);

  // collect current treePublicNodes
  const treePublicNodes = state.tree.nodes.map((node) => node?.publicKeyB64 ?? null);

  const welcomes = [];

  // for each memvber (except creator) find that members initKeyB64 from memberInitKeys
  // encryps init secret for that member via wrapGroupKey
  // creates welcome message object with group metadata, roster, recipients info, encrypted secrets tree pk's
  for (const member of normalizedRoster) {
    if (String(member.userId) === String(state.selfUserId)) continue;

    const initKeyB64 = memberInitKeys?.find(
      (entry) => String(entry.userId) === String(member.userId),
    )?.initKeyB64;
    if (!initKeyB64) {
      throw new Error(
        `Missing initKeyB64 for member ${member.userId} — fetch their KeyPackage before building Welcomes`,
      );
    }

    const wrappedInitSecret = await wrapGroupKey(initSecretB64, initKeyB64, aadBytes);
    const wrappedCommitSecret = await wrapGroupKey(commitSecretB64, initKeyB64, aadBytes);

    // returns welcome array with one welcome per member
    welcomes.push({
      groupId: state.groupId,
      epoch: state.epoch,
      cipherSuite: state.cipherSuite,
      roster: normalizedRoster,
      recipientUserId: member.userId,
      recipientLeafIndex: member.leafIndex,
      leafCount: computeLeafCount({ roster: normalizedRoster, treeNodes: state.tree.nodes }),
      wrappedInitSecret,
      wrappedCommitSecret,
      treePublicNodes,
    });
  }

  return welcomes;
}

// Takes in the welcome packet and turns it into a users local group state 
export async function processWelcome({ welcome, selfUserId = null, myInitPrivKeyB64 }) {

  // validates the welcome fields
  if (!welcome || typeof welcome !== 'object') throw new Error('Invalid welcome');
  if (typeof welcome.groupId !== 'string' || welcome.groupId.length === 0) {
    throw new Error('Welcome is missing groupId');
  }
  if (!Number.isInteger(welcome.recipientLeafIndex)) {
    throw new Error(`Welcome is missing recipientLeafIndex for group ${welcome.groupId}`);
  }
  if (!Array.isArray(welcome.roster)) {
    throw new Error(`Welcome is missing roster for group ${welcome.groupId}`);
  }
  if (!myInitPrivKeyB64) {
    throw new Error('myInitPrivKeyB64 required to process welcome');
  }
  if (!welcome.wrappedInitSecret || !welcome.wrappedCommitSecret) {
    throw new Error(`Welcome is missing encrypted key fields for group ${welcome.groupId}`);
  }

  // builds AAD for unwrapping secrets
  const aadBytes = makeCommitAadBytes(welcome.groupId, welcome.epoch);

  // decrypt the init and commit secrets from the welcome using the recipients init private key
  const initSecret = await unwrapGroupKey(welcome.wrappedInitSecret, myInitPrivKeyB64, aadBytes);
  const commitSecret = await unwrapGroupKey(welcome.wrappedCommitSecret, myInitPrivKeyB64, aadBytes);

  // advance epoch using the decrypted secrets to derive the application secret for this user 
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(initSecret),
    commitSecret: base64ToBytes(commitSecret),
    groupId: welcome.groupId,
    epoch: welcome.epoch,
  });

  // Rebuild tree from welcome treePublicNodes and install the recipients init private key
  const treeNodes = makeTreeFromPublicNodes(welcome.treePublicNodes);
  installOwnLeafPrivateKey(treeNodes, welcome.recipientLeafIndex, myInitPrivKeyB64);

  // return a normalized group state with epoch, roster, tree and derived secrets
  return normalizeGroupState({
    stateVersion: MLS_STATE_VERSION,
    groupId: welcome.groupId,
    epoch: Number.isInteger(welcome.epoch) ? welcome.epoch : 0,
    cipherSuite: typeof welcome.cipherSuite === 'string' && welcome.cipherSuite.length > 0
      ? welcome.cipherSuite
      : DEFAULT_MLS_CIPHER_SUITE,
    selfUserId: selfUserId ?? welcome.recipientUserId ?? null,
    selfLeafIndex: welcome.recipientLeafIndex,
    applicationSecretB64: bytesToBase64(applicationSecret),
    initSecretB64: bytesToBase64(nextInitSecret),
    senderGenerations: {},
    roster: normalizeRoster(welcome.roster),
    tree: { nodes: treeNodes },
    secrets: { initSecretB64: bytesToBase64(nextInitSecret) },
    pendingCommits: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// builds the commit and welcome messages for adding a new member to the group 
export async function buildAddCommit({ state, newMember, memberInitKeys }) {

  // Validate inputs and load state
  const currentState = normalizeGroupState(state);
  const newMemberUserId = String(newMember?.userId ?? '');

  // validates the new member fields and checks that the new member is not already in the roster
  if (!newMemberUserId) throw new Error('New member for add commit is missing userId');
  if (!Number.isInteger(newMember?.leafIndex)) {
    throw new Error('New member for add commit is missing leafIndex');
  }
  if (!currentState.initSecretB64) {
    throw new Error(`Group state is missing initSecretB64 for group ${currentState.groupId}`);
  }

  // normalize roster and check if new member is already in the roster 
  const roster = normalizeRoster(currentState.roster);
  if (roster.some((member) => String(member.userId) === newMemberUserId)) {
    throw new Error(`Member ${newMemberUserId} already exists in group ${currentState.groupId}`);
  }

  // build new roster with the new member added
  const newRoster = normalizeRoster([
    ...roster,
    {
      userId: newMemberUserId,
      username: newMember?.username ?? '',
      leafIndex: newMember.leafIndex,
    },
  ]);

  // recompute tree size 
  const nextEpoch = currentState.epoch + 1;
  const leafCount = computeLeafCount({
    roster: newRoster,
    treeNodes: currentState.tree.nodes,
    extraLeafIndex: newMember.leafIndex,
  });

  // resize the tree to fit the new leaf count, this will clone the existing nodes and
  // add null nodes for the new leaf if needed, then install any pk init keys 
  const width = nodeWidth(leafCount);
  const newTree = resizeNodes(currentState.tree.nodes, width);
  installLeafPublicKeysFromMemberInitKeys(newTree, newRoster, memberInitKeys);

  // find the new member initKeyB64 from memberInitKeys, this is required to add the new member to the tree
  const newMemberInitKeyB64 = memberInitKeys?.find(
    (entry) => String(entry.userId) === newMemberUserId,
  )?.initKeyB64;
  if (!newMemberInitKeyB64) {
    throw new Error(
      `Missing initKeyB64 for member ${newMemberUserId} — fetch their KeyPackage first`,
    );
  }

  // install the new members pk in their leaf node
  newTree[leafNode(newMember.leafIndex)] = {
    publicKeyB64: newMemberInitKeyB64,
    privateKeyB64: null,
  };

  // clears that leaf + ancestor path so old path are invalidated
  blankNodeAndPath(newTree, newMember.leafIndex, leafCount);

  // re-installs the new members leaf public key
  newTree[leafNode(newMember.leafIndex)] = {
    publicKeyB64: newMemberInitKeyB64,
    privateKeyB64: null,
  };

  // builds sender update path with new tree
  const { updatePath, commitSecret } = await buildUpdatePath(
    newTree,
    currentState.selfLeafIndex,
    leafCount,
  );

  // advances the epoch to derive the new epoch secrets based on the commit secret from the update path
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(currentState.initSecretB64),
    commitSecret,
    groupId: currentState.groupId,
    epoch: nextEpoch,
  });

  // builds post commit tree snapshot 
  const nextTree = deriveCommitTree(newTree, updatePath, currentState.selfLeafIndex, currentState.selfLeafIndex);
  const treePublicNodes = nextTree.map((node) => node?.publicKeyB64 ?? null);
  const aadBytes = makeCommitAadBytes(currentState.groupId, nextEpoch);

  // wraps secret for the new member only 
  const wrappedInitSecret = await wrapGroupKey(currentState.initSecretB64, newMemberInitKeyB64, aadBytes);
  const wrappedCommitSecret = await wrapGroupKey(bytesToBase64(commitSecret), newMemberInitKeyB64, aadBytes);

  // builds commit, welcome and next state object with 
  // group metadata, new member info, roster, tree snapshop and update path
  const commit = {
    groupId: currentState.groupId,
    epoch: nextEpoch,
    type: 'add',
    senderLeafIndex: currentState.selfLeafIndex,
    targetUserId: newMemberUserId,
    targetLeafIndex: newMember.leafIndex,
    roster: newRoster,
    leafCount,
    treePublicNodes,
    updatePath: updatePath.map((entry) => ({
      nodeIndex: entry.nodeIndex,
      publicKeyB64: entry.publicKeyB64,
      encryptedPathSecrets: entry.encryptedPathSecrets,
    })),
  };

  const welcome = {
    groupId: currentState.groupId,
    epoch: nextEpoch,
    cipherSuite: currentState.cipherSuite,
    roster: newRoster,
    recipientUserId: newMemberUserId,
    recipientLeafIndex: newMember.leafIndex,
    leafCount,
    wrappedInitSecret,
    wrappedCommitSecret,
    treePublicNodes,
  };

  const nextState = normalizeGroupState({
    ...currentState,
    epoch: nextEpoch,
    roster: newRoster,
    applicationSecretB64: bytesToBase64(applicationSecret),
    initSecretB64: bytesToBase64(nextInitSecret),
    senderGenerations: {},
    applicationMessageCounter: 0,
    tree: { nodes: nextTree },
    secrets: { initSecretB64: bytesToBase64(nextInitSecret) },
  });

  return { commit, welcome, nextState };
}

// Creates the next-epoch commit for kicking a member out of the group
export async function buildRemoveCommit({ state, targetUserId, memberInitKeys }) {

  // normalizes current state
  const currentState = normalizeGroupState(state);
  const targetUserIdStr = String(targetUserId ?? '');

  // validates the target userId and checks that the target member is in the roster
  if (!targetUserIdStr) {
    throw new Error('Invalid targetUserId for remove commit');
  }
  if (!currentState.initSecretB64) {
    throw new Error(`Group state is missing initSecretB64 for group ${currentState.groupId}`);
  }

  // normalize roster and find the target member in the roster to get their leaf index and init key
  const roster = normalizeRoster(currentState.roster);
  const targetMember = roster.find((member) => String(member.userId) === targetUserIdStr);
  if (!targetMember) {
    throw new Error(`Target userId ${targetUserIdStr} not found in group roster`);
  }

  // builds newRoster without the removed user
  const newRoster = roster.filter((member) => String(member.userId) !== targetUserIdStr);
  const leafCount = computeLeafCount({
    roster,
    treeNodes: currentState.tree.nodes,
    extraLeafIndex: targetMember.leafIndex,
  });

  // rebuilds the tree with the removed member's leaf and direct path blanked out and any new member init keys
  // installed, this will prepare the tree for building the update path for the remove commit
  const newTree = resizeNodes(currentState.tree.nodes, nodeWidth(leafCount));
  installLeafPublicKeysFromMemberInitKeys(newTree, roster, memberInitKeys);

  blankNodeAndPath(newTree, targetMember.leafIndex, leafCount);

  // builds sender update path with new tree
  const nextEpoch = currentState.epoch + 1;

  const { updatePath, commitSecret } = await buildUpdatePath(
    newTree,
    currentState.selfLeafIndex,
    leafCount,
  );

  // advances the epoch to derive the new epoch secrets based on the commit secret from the update path
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(currentState.initSecretB64),
    commitSecret,
    groupId: currentState.groupId,
    epoch: nextEpoch,
  });

  // Derives post-commit tree snapshot and tree public nodes for the commit
  const nextTree = deriveCommitTree(newTree, updatePath, currentState.selfLeafIndex, currentState.selfLeafIndex);
  const treePublicNodes = nextTree.map((node) => node?.publicKeyB64 ?? null);

  // builds commit object with group metadata, target member info, roster, tree snapshop and update path
  const commit = {
    groupId: currentState.groupId,
    epoch: nextEpoch,
    type: 'remove',
    senderLeafIndex: currentState.selfLeafIndex,
    targetUserId: targetUserIdStr,
    targetLeafIndex: targetMember.leafIndex,
    roster: newRoster,
    leafCount,
    treePublicNodes,
    updatePath: updatePath.map((entry) => ({
      nodeIndex: entry.nodeIndex,
      publicKeyB64: entry.publicKeyB64,
      encryptedPathSecrets: entry.encryptedPathSecrets,
    })),
  };

  // computes selfStillPresent to determine if the removed member is the same as the sender
  // if so the sender is also removed and should not include secrets or leaf index in the next state
  const selfStillPresent = newRoster.some(
    (member) => String(member.userId) === String(currentState.selfUserId),
  );

  // returns the normalized next state 
  const nextState = normalizeGroupState({
    ...currentState,
    epoch: nextEpoch,
    roster: newRoster,
    selfLeafIndex: selfStillPresent ? currentState.selfLeafIndex : null,
    applicationSecretB64: selfStillPresent ? bytesToBase64(applicationSecret) : null,
    initSecretB64: selfStillPresent ? bytesToBase64(nextInitSecret) : null,
    senderGenerations: {},
    applicationMessageCounter: 0,
    tree: { nodes: nextTree },
    secrets: {
      initSecretB64: selfStillPresent ? bytesToBase64(nextInitSecret) : null,
    },
  });

  return { commit, nextState };
}

// This is the function each member will call to apply a commit to their local state when they recieve a commit
export async function applyCommit({ state, commit, myInitPrivKeyB64 }) {

  // normalize current state
  const currentState = normalizeGroupState(state);

  // validate the commit fields and check that the commit is for the current group and has a valid epoch
  if (!commit || typeof commit !== 'object') throw new Error('Invalid commit');
  if (String(commit.groupId ?? '') !== String(currentState.groupId)) {
    throw new Error('Commit groupId mismatch');
  }
  if (!Number.isInteger(commit.epoch) || commit.epoch <= currentState.epoch) {
    throw new Error('Invalid commit epoch');
  }
  if (!Array.isArray(commit.roster)) throw new Error('Commit is missing roster');
  if (!Array.isArray(commit.updatePath)) throw new Error('Commit is missing updatePath');

  // computes the leafCount 
  const leafCount = Number.isInteger(commit.leafCount)
    ? commit.leafCount
    : computeLeafCount({
      roster: commit.roster,
      treeNodes: currentState.tree.nodes,
      extraLeafIndex: commit.targetLeafIndex,
    });

  // rebuilds the working tree from the commit treePublicNodes if included, otherwise resize to match leafCount
  const treeNodes = Array.isArray(commit.treePublicNodes)
    ? makeTreeFromPublicNodes(commit.treePublicNodes, currentState.tree.nodes)
    : resizeNodes(currentState.tree.nodes, nodeWidth(leafCount));

  // Find your new selfLeafIndex in the commit roster
  const selfLeafIndex = findLeafIndexForUser(commit.roster, currentState.selfUserId);

  // applies the commit path updates, installs new path pk into tree
  // tries to decrypt one encrypted ps intended for you to recover the commit secret
  const commitSecret = await applyUpdatePath(
    treeNodes,
    commit.updatePath,
    commit.senderLeafIndex,
    leafCount,
    selfLeafIndex,
    myInitPrivKeyB64,
  );

  // If it recovered commitSecret and has current initSecretB64 advance epoch to derive appSecret and initSecret
  const nextEpochSecrets = commitSecret && currentState.initSecretB64
    ? await advanceEpoch({
      initSecret: base64ToBytes(currentState.initSecretB64),
      commitSecret,
      groupId: currentState.groupId,
      epoch: commit.epoch,
    })
    : null;

  // return normalized next state with new epoch, new roster, new tree, reset sender generations and secrets
  return normalizeGroupState({
    ...currentState,
    epoch: commit.epoch,
    roster: commit.roster,
    selfLeafIndex,
    applicationSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.applicationSecret) : null,
    initSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.nextInitSecret) : null,
    senderGenerations: {},
    applicationMessageCounter: 0,
    tree: { nodes: treeNodes },
    secrets: {
      initSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.nextInitSecret) : null,
    },
  });
}

// This is the function to encrypt application messages using the current epoch application secret 
// and incrementing the sender generation for each message
export async function encryptApplicationMessage({ state, plaintextBytes, aadBytes }) {

  // normalize group state
  const normalizedState = normalizeGroupState(state);


  // validate groupId and selfLeafIndex
  if (!normalizedState.groupId) {
    throw new Error('Group state is missing groupId');
  }
  if (!Number.isInteger(normalizedState.selfLeafIndex)) {
    throw new Error(`Group state is missing selfLeafIndex for group ${normalizedState.groupId}`);
  }

  // derive the app key and nonce for this message using the current application secret, self leaf index and sender generation
  const { applicationSecretB64, keyBytes: appSecret } = resolveApplicationKey(normalizedState);

  // reads self current sender generation counter
  const generation = normalizedState.senderGenerations[String(normalizedState.selfLeafIndex)] ?? 0;
  const { key, nonce } = await deriveAppKeyAndNonce(
    appSecret,
    normalizedState.selfLeafIndex,
    generation,
  );

  // builds the header for this message, the header includes the groupId, epoch, sender leaf index, sender generation and cipher suite
  const header = {
    version: MLS_HEADER_VERSION,
    groupId: normalizedState.groupId,
    epoch: normalizedState.epoch,
    senderLeafIndex: normalizedState.selfLeafIndex,
    generation,
    cipherSuite: normalizedState.cipherSuite,
  };

  // Chooses AAD, if caller did not pass aadBytes it uses serialzied header bytes
  // otherwise normalizes provided aadBytes
  const resolvedAadBytes = aadBytes == null
    ? makeHeaderBytes(header)
    : normalizeBytes(aadBytes, 'aadBytes');

  // encrypts plaintext and base64 encodes the ciphertext
  const ciphertextB64 = bytesToBase64(
    encrypt_aad_bytes(normalizePlaintextBytes(plaintextBytes), key, nonce, resolvedAadBytes),
  );

  // creates new state where your sender generation is incremented by 1 
  const newState = normalizeGroupState({
    ...normalizedState,
    senderGenerations: {
      ...normalizedState.senderGenerations,
      [String(normalizedState.selfLeafIndex)]: generation + 1,
    },
  });

  // returns headers, ciphertext and state
  return {
    header,
    headerB64: makeHeaderB64(header),
    ciphertextB64,
    nonceB64: null,
    newState: {
      ...newState,
      groupKeyB64: newState.applicationSecretB64,
    },
  };
}

// This is the function to decrypt application messages using the current epoch application secret 
// and the sender generation in the message header
export async function decryptApplicationMessage({ state, header, ciphertext, aadBytes, includeNewState = false }) {
  
  // normalize group state and paarse header
  const normalizedState = normalizeGroupState(state);
  const parsedHeader = parseHeader(header);

  // Validate input fields
  if (!normalizedState.groupId) {
    throw new Error('Group state is missing groupId');
  }
  if (parsedHeader.version !== MLS_HEADER_VERSION) {
    throw new Error(`Unsupported MLS header version for group ${normalizedState.groupId}`);
  }
  if (String(parsedHeader.groupId ?? '') !== String(normalizedState.groupId)) {
    throw new Error(`MLS header groupId mismatch for group ${normalizedState.groupId}`);
  }
  if (!Number.isInteger(parsedHeader.senderLeafIndex)) {
    throw new Error(`MLS header is missing senderLeafIndex for group ${normalizedState.groupId}`);
  }
  if (!Number.isInteger(parsedHeader.generation)) {
    throw new Error(`MLS header is missing generation for group ${normalizedState.groupId}`);
  }
  if (Number.isInteger(parsedHeader.epoch) && parsedHeader.epoch !== normalizedState.epoch) {
    throw new Error(`MLS epoch mismatch for group ${normalizedState.groupId}`);
  }
  if (parsedHeader.cipherSuite && parsedHeader.cipherSuite !== normalizedState.cipherSuite) {
    throw new Error(`MLS cipher suite mismatch for group ${normalizedState.groupId}`);
  }
  if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
    throw new Error(`MLS ciphertext is missing for group ${normalizedState.groupId}`);
  }

  // validate that the sender generation in the header matches the expected sender generation in the state for this sender
  // (protects against replay attacks)
  const expectedGeneration = normalizedState.senderGenerations[String(parsedHeader.senderLeafIndex)] ?? 0;
  if (parsedHeader.generation !== expectedGeneration) {
    throw new Error(
      `MLS generation mismatch for group ${normalizedState.groupId}: expected ${expectedGeneration}, got ${parsedHeader.generation}`,
    );
  }

  // Resolves the application secret form state
  const { keyBytes: appSecret } = resolveApplicationKey(normalizedState);

  // Derives message key + nonce
  const { key, nonce } = await deriveAppKeyAndNonce(
    appSecret,
    parsedHeader.senderLeafIndex,
    parsedHeader.generation,
  );

  // Chooses AAD, if caller did not pass aadBytes it uses serialzied header bytes
  const resolvedAadBytes = aadBytes == null
    ? makeHeaderBytes(parsedHeader)
    : normalizeBytes(aadBytes, 'aadBytes');

  // Decrypts the ciphertext using the derived key and nonce and the resolved AAD, returns plaintext bytes
  const plaintextBytes = decrypt_aad_bytes(base64ToBytes(ciphertext), key, nonce, resolvedAadBytes);
  if (!includeNewState) {
    return plaintextBytes;
  }

  // creates new state with nromalized group state and increments the sender generation for this sender 
  const newState = normalizeGroupState({
    ...normalizedState,
    senderGenerations: {
      ...normalizedState.senderGenerations,
      [String(parsedHeader.senderLeafIndex)]: parsedHeader.generation + 1,
    },
  });

  // returns plaintext and new state with updated sender generation and group key (application secret)
  return {
    plaintextBytes,
    newState,
  };
}

const groupCryptoProvider = {
  saveGroupState,
  loadGroupState,
  createNewGroupState,
  encryptApplicationMessage,
  decryptApplicationMessage,
  applyCommit,
  processWelcome,
  buildAddCommit,
  buildRemoveCommit,
  buildInitialWelcomes,
};

export default groupCryptoProvider;
