import eld from '../../../../../utils/storage/EncryptedLocalDatabase';
import { base64ToBytes, bytesToBase64 } from '../helpers';

import init, {
  decrypt_aad_bytes,
  diffie_hellman,
  encrypt_aad_bytes,
  generate_private_ephemeral_key,
  generate_public_ephemeral_key,
  hkdf_derive,
} from '@mascaro101/echo-protocol';

import {
  copath,
  directPath,
  leafNode,
  nodeWidth,
  resolution,
} from './treemath.js';
import {
  advanceEpoch,
  deriveAppKeyAndNonce,
  deriveSecret,
  expandWithLabel,
  ratchetAppSecret,
} from './keySchedule.js';

const MLS_STATE_VERSION = 1;
const MLS_STATE_PREFIX = 'mls:groupState:';
const DEFAULT_MLS_CIPHER_SUITE = 'MLS-MVP/X25519_AES256GCM_SHA256';
const MLS_HEADER_VERSION = 1;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });
const WRAP_INFO = TEXT_ENCODER.encode('EchoMLS/v1/WelcomeWrap');
const PATH_SECRET_WRAP_INFO = TEXT_ENCODER.encode('EchoMLS/v1/PathSecretWrap');

function getGroupState(groupId) {
  return `${MLS_STATE_PREFIX}${groupId}`;
}

function normalizeBytes(value, fieldName) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  throw new Error(`Invalid ${fieldName}; expected byte array input`);
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function normalizeRoster(roster) {
  if (!Array.isArray(roster)) return [];

  return roster
    .map((member, index) => ({
      userId: String(member?.userId ?? ''),
      username: member?.username ?? 'Member',
      leafIndex: Number.isInteger(member?.leafIndex) ? member.leafIndex : index,
    }))
    .filter((member) => member.userId.length > 0)
    .sort((a, b) => a.leafIndex - b.leafIndex);
}

function findLeafIndexForUser(roster, userId) {
  const match = normalizeRoster(roster).find(
    (member) => String(member.userId) === String(userId ?? ''),
  );
  return Number.isInteger(match?.leafIndex) ? match.leafIndex : null;
}

function leafCountFromRoster(roster, extraLeafIndex = null) {
  const leafIndices = normalizeRoster(roster).map((member) => member.leafIndex);
  if (Number.isInteger(extraLeafIndex)) leafIndices.push(extraLeafIndex);
  if (leafIndices.length === 0) return 0;
  return Math.max(...leafIndices) + 1;
}

function leafCountFromNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0;
  return Math.floor((nodes.length + 1) / 2);
}

function computeLeafCount({ roster = [], treeNodes = [], extraLeafIndex = null }) {
  return Math.max(
    leafCountFromRoster(roster, extraLeafIndex),
    leafCountFromNodes(treeNodes),
  );
}

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

function resizeNodes(nodes, width) {
  return Array.from({ length: width }, (_, index) => cloneNode(nodes?.[index]));
}

function makeHeaderBytes(header) {
  return TEXT_ENCODER.encode(JSON.stringify(header));
}

function makeHeaderB64(header) {
  return bytesToBase64(makeHeaderBytes(header));
}

function parseHeader(header) {
  if (typeof header === 'string') {
    return JSON.parse(TEXT_DECODER.decode(base64ToBytes(header)));
  }
  if (header && typeof header === 'object') return header;
  throw new Error('Missing MLS header');
}

function normalizePlaintextBytes(plaintextBytes) {
  if (typeof plaintextBytes === 'string') {
    return TEXT_ENCODER.encode(plaintextBytes);
  }
  return normalizeBytes(plaintextBytes, 'plaintextBytes');
}

function makeCommitAadBytes(groupId, epoch) {
  return TEXT_ENCODER.encode(`EchoMLS/v1/Commit|${groupId}|${epoch}`);
}

function makePathSecretAadBytes(nodeIndex) {
  return TEXT_ENCODER.encode(`EchoMLS/v1/PathSecret|nodeIndex:${nodeIndex}`);
}

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

function makeTreeFromPublicNodes(publicNodes, currentNodes = []) {
  if (!Array.isArray(publicNodes)) return [];
  return publicNodes.map((publicKeyB64, index) => ({
    publicKeyB64: typeof publicKeyB64 === 'string' && publicKeyB64.length > 0 ? publicKeyB64 : null,
    privateKeyB64: currentNodes[index]?.privateKeyB64 ?? null,
  }));
}

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

function normalizeGroupState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid group state');
  }

  const roster = normalizeRoster(state.roster);
  const selfLeafIndex = Number.isInteger(state.selfLeafIndex)
    ? state.selfLeafIndex
    : findLeafIndexForUser(roster, state.selfUserId);

  const leafCount = computeLeafCount({
    roster,
    treeNodes: state.tree?.nodes,
    extraLeafIndex: selfLeafIndex,
  });
  const width = nodeWidth(leafCount);
  const treeNodes = resizeNodes(state.tree?.nodes, width);

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

async function initTreeFromRoster(roster, selfLeafIndex, selfPrivKeyB64, memberInitKeys) {
  await init();

  const normalizedRoster = normalizeRoster(roster);
  const leafCount = leafCountFromRoster(normalizedRoster, selfLeafIndex);
  const width = nodeWidth(leafCount);
  const nodes = resizeNodes([], width);

  for (const member of normalizedRoster) {
    const nodeIndex = leafNode(member.leafIndex);
    if (nodeIndex >= width) continue;

    if (member.leafIndex === selfLeafIndex && selfPrivKeyB64) {
      const privBytes = base64ToBytes(selfPrivKeyB64);
      nodes[nodeIndex] = {
        publicKeyB64: bytesToBase64(generate_public_ephemeral_key(privBytes)),
        privateKeyB64: selfPrivKeyB64,
      };
      continue;
    }

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

async function wrapGroupKey(groupKeyB64, recipientInitKeyB64, aadBytes) {
  await init();

  const groupKeyBytes = base64ToBytes(groupKeyB64);
  const recipientPub = base64ToBytes(recipientInitKeyB64);
  const ephPriv = generate_private_ephemeral_key(randomBytes(32));
  const ephPub = generate_public_ephemeral_key(ephPriv);

  const sharedSecret = diffie_hellman(ephPriv, recipientPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), WRAP_INFO, 32);
  const nonce = randomBytes(12);
  const encryptedBytes = encrypt_aad_bytes(groupKeyBytes, wrapKey, nonce, aadBytes);

  return {
    encryptedB64: bytesToBase64(encryptedBytes),
    ephPubB64: bytesToBase64(ephPub),
    nonceB64: bytesToBase64(nonce),
  };
}

async function unwrapGroupKey({ encryptedB64, ephPubB64, nonceB64 }, myInitPrivKeyB64, aadBytes) {
  await init();

  const encryptedBytes = base64ToBytes(encryptedB64);
  const ephPub = base64ToBytes(ephPubB64);
  const nonce = base64ToBytes(nonceB64);
  const myPriv = base64ToBytes(myInitPrivKeyB64);

  const sharedSecret = diffie_hellman(myPriv, ephPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), WRAP_INFO, 32);
  const groupKeyBytes = decrypt_aad_bytes(encryptedBytes, wrapKey, nonce, aadBytes);
  return bytesToBase64(groupKeyBytes);
}

async function wrapPathSecret(pathSecretBytes, recipientPubB64, aadBytes) {
  await init();

  const recipientPub = base64ToBytes(recipientPubB64);
  const ephPriv = generate_private_ephemeral_key(randomBytes(32));
  const ephPub = generate_public_ephemeral_key(ephPriv);

  const sharedSecret = diffie_hellman(ephPriv, recipientPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), PATH_SECRET_WRAP_INFO, 32);
  const nonce = randomBytes(12);
  const encryptedBytes = encrypt_aad_bytes(pathSecretBytes, wrapKey, nonce, aadBytes);

  return {
    encryptedB64: bytesToBase64(encryptedBytes),
    ephPubB64: bytesToBase64(ephPub),
    nonceB64: bytesToBase64(nonce),
  };
}

async function unwrapPathSecret({ encryptedB64, ephPubB64, nonceB64 }, myPrivKeyB64, aadBytes) {
  await init();

  const encryptedBytes = base64ToBytes(encryptedB64);
  const ephPub = base64ToBytes(ephPubB64);
  const nonce = base64ToBytes(nonceB64);
  const myPriv = base64ToBytes(myPrivKeyB64);

  const sharedSecret = diffie_hellman(myPriv, ephPub);
  const wrapKey = hkdf_derive(sharedSecret, new Uint8Array(0), PATH_SECRET_WRAP_INFO, 32);
  return decrypt_aad_bytes(encryptedBytes, wrapKey, nonce, aadBytes);
}

async function buildUpdatePath(treeNodes, senderLeafIndex, leafCount) {
  await init();

  const senderNodeIndex = leafNode(senderLeafIndex);
  const pathNodes = [senderNodeIndex, ...directPath(senderNodeIndex, leafCount)];
  const copathNodes = copath(senderNodeIndex, leafCount);

  const pathSecrets = [randomBytes(32)];
  for (let index = 1; index < pathNodes.length; index++) {
    pathSecrets.push(await deriveSecret(pathSecrets[index - 1], 'path'));
  }
  const commitSecret = await deriveSecret(pathSecrets[pathSecrets.length - 1], 'path');

  const updatePath = [];

  for (let index = 0; index < pathNodes.length; index++) {
    const nodeIndex = pathNodes[index];
    const pathSecret = pathSecrets[index];
    const nodePrivBytes = await expandWithLabel(pathSecret, 'node', new Uint8Array(0), 32);
    const nodePubBytes = generate_public_ephemeral_key(nodePrivBytes);

    const recipientNodeIndices = new Set();
    if (index === 0) recipientNodeIndices.add(senderNodeIndex);
    if (index < copathNodes.length) {
      for (const recipientNodeIdx of resolution(treeNodes, copathNodes[index], leafCount)) {
        recipientNodeIndices.add(recipientNodeIdx);
      }
    }

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

    updatePath.push({
      nodeIndex,
      publicKeyB64: bytesToBase64(nodePubBytes),
      privateKeyB64: bytesToBase64(nodePrivBytes),
      encryptedPathSecrets,
    });
  }

  return { updatePath, commitSecret };
}

function deriveCommitTree(treeNodes, updatePath, ownedLeafIndex, senderLeafIndex) {
  const nextTree = resizeNodes(treeNodes, treeNodes.length);

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

async function applyUpdatePath(treeNodes, updatePath, senderLeafIndex, leafCount, myLeafIndex, myPrivKeyB64) {
  const senderNodeIndex = leafNode(senderLeafIndex);
  const pathNodes = [senderNodeIndex, ...directPath(senderNodeIndex, leafCount)];
  const copathNodes = copath(senderNodeIndex, leafCount);

  for (const entry of updatePath) {
    treeNodes[entry.nodeIndex] = {
      publicKeyB64: entry.publicKeyB64,
      privateKeyB64: null,
    };
  }

  const myNodeIdx = Number.isInteger(myLeafIndex) ? leafNode(myLeafIndex) : null;
  if (!Number.isInteger(myNodeIdx) || typeof myPrivKeyB64 !== 'string' || myPrivKeyB64.length === 0) {
    return null;
  }

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

function blankNodeAndPath(treeNodes, leafIndex, leafCount) {
  if (!Number.isInteger(leafIndex)) return;

  const targetNodeIndex = leafNode(leafIndex);
  if (targetNodeIndex < treeNodes.length) {
    treeNodes[targetNodeIndex] = { publicKeyB64: null, privateKeyB64: null };
  }

  for (const nodeIndex of directPath(targetNodeIndex, leafCount)) {
    if (nodeIndex < treeNodes.length) {
      treeNodes[nodeIndex] = { publicKeyB64: null, privateKeyB64: null };
    }
  }
}

function installLeafPublicKeysFromMemberInitKeys(treeNodes, roster, memberInitKeys) {
  const initKeyMap = new Map(
    (Array.isArray(memberInitKeys) ? memberInitKeys : [])
      .filter((entry) => typeof entry?.initKeyB64 === 'string' && entry.initKeyB64.length > 0)
      .map((entry) => [String(entry.userId), entry.initKeyB64]),
  );

  for (const member of normalizeRoster(roster)) {
    if (!Number.isInteger(member.leafIndex)) continue;
    const publicKeyB64 = initKeyMap.get(String(member.userId));
    if (!publicKeyB64) continue;

    const nodeIndex = leafNode(member.leafIndex);
    if (nodeIndex >= treeNodes.length) continue;

    treeNodes[nodeIndex] = {
      publicKeyB64,
      privateKeyB64: treeNodes[nodeIndex]?.privateKeyB64 ?? null,
    };
  }
}

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

export async function createNewGroupState({
  groupId,
  creatorUserId,
  roster,
  cipherSuite = DEFAULT_MLS_CIPHER_SUITE,
  memberInitKeys = [],
  selfInitPrivKeyB64 = null,
}) {
  const normalizedRoster = normalizeRoster(roster);
  const selfLeafIndex = findLeafIndexForUser(normalizedRoster, creatorUserId);

  const initSecret0 = randomBytes(32);
  const commitSecret0 = randomBytes(32);
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: initSecret0,
    commitSecret: commitSecret0,
    groupId,
    epoch: 0,
  });

  const treeNodes = await initTreeFromRoster(
    normalizedRoster,
    selfLeafIndex,
    selfInitPrivKeyB64,
    memberInitKeys,
  );

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

export async function buildInitialWelcomes({ creatorState, roster, memberInitKeys }) {
  const state = normalizeGroupState(creatorState);
  const normalizedRoster = normalizeRoster(roster);
  const initSecretB64 = state.secrets.epochInitSecretB64;
  const commitSecretB64 = state.secrets.epochCommitSecretB64;

  if (!initSecretB64 || !commitSecretB64) {
    throw new Error(`Creator state is missing epoch seed secrets for group ${state.groupId}`);
  }

  const aadBytes = makeCommitAadBytes(state.groupId, state.epoch);
  const treePublicNodes = state.tree.nodes.map((node) => node?.publicKeyB64 ?? null);
  const welcomes = [];

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

export async function processWelcome({ welcome, selfUserId = null, myInitPrivKeyB64 }) {
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

  const aadBytes = makeCommitAadBytes(welcome.groupId, welcome.epoch);
  const initSecret = await unwrapGroupKey(welcome.wrappedInitSecret, myInitPrivKeyB64, aadBytes);
  const commitSecret = await unwrapGroupKey(welcome.wrappedCommitSecret, myInitPrivKeyB64, aadBytes);
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(initSecret),
    commitSecret: base64ToBytes(commitSecret),
    groupId: welcome.groupId,
    epoch: welcome.epoch,
  });

  const treeNodes = makeTreeFromPublicNodes(welcome.treePublicNodes);
  installOwnLeafPrivateKey(treeNodes, welcome.recipientLeafIndex, myInitPrivKeyB64);

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

export async function buildAddCommit({ state, newMember, memberInitKeys }) {
  const currentState = normalizeGroupState(state);
  const newMemberUserId = String(newMember?.userId ?? '');

  if (!newMemberUserId) throw new Error('New member for add commit is missing userId');
  if (!Number.isInteger(newMember?.leafIndex)) {
    throw new Error('New member for add commit is missing leafIndex');
  }
  if (!currentState.initSecretB64) {
    throw new Error(`Group state is missing initSecretB64 for group ${currentState.groupId}`);
  }

  const roster = normalizeRoster(currentState.roster);
  if (roster.some((member) => String(member.userId) === newMemberUserId)) {
    throw new Error(`Member ${newMemberUserId} already exists in group ${currentState.groupId}`);
  }

  const newRoster = normalizeRoster([
    ...roster,
    {
      userId: newMemberUserId,
      username: newMember?.username ?? '',
      leafIndex: newMember.leafIndex,
    },
  ]);
  const nextEpoch = currentState.epoch + 1;
  const leafCount = computeLeafCount({
    roster: newRoster,
    treeNodes: currentState.tree.nodes,
    extraLeafIndex: newMember.leafIndex,
  });
  const width = nodeWidth(leafCount);
  const newTree = resizeNodes(currentState.tree.nodes, width);
  installLeafPublicKeysFromMemberInitKeys(newTree, newRoster, memberInitKeys);

  const newMemberInitKeyB64 = memberInitKeys?.find(
    (entry) => String(entry.userId) === newMemberUserId,
  )?.initKeyB64;
  if (!newMemberInitKeyB64) {
    throw new Error(
      `Missing initKeyB64 for member ${newMemberUserId} — fetch their KeyPackage first`,
    );
  }

  newTree[leafNode(newMember.leafIndex)] = {
    publicKeyB64: newMemberInitKeyB64,
    privateKeyB64: null,
  };
  blankNodeAndPath(newTree, newMember.leafIndex, leafCount);
  newTree[leafNode(newMember.leafIndex)] = {
    publicKeyB64: newMemberInitKeyB64,
    privateKeyB64: null,
  };

  const { updatePath, commitSecret } = await buildUpdatePath(
    newTree,
    currentState.selfLeafIndex,
    leafCount,
  );
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(currentState.initSecretB64),
    commitSecret,
    groupId: currentState.groupId,
    epoch: nextEpoch,
  });

  const nextTree = deriveCommitTree(newTree, updatePath, currentState.selfLeafIndex, currentState.selfLeafIndex);
  const treePublicNodes = nextTree.map((node) => node?.publicKeyB64 ?? null);
  const aadBytes = makeCommitAadBytes(currentState.groupId, nextEpoch);
  const wrappedInitSecret = await wrapGroupKey(currentState.initSecretB64, newMemberInitKeyB64, aadBytes);
  const wrappedCommitSecret = await wrapGroupKey(bytesToBase64(commitSecret), newMemberInitKeyB64, aadBytes);

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
    tree: { nodes: nextTree },
    secrets: { initSecretB64: bytesToBase64(nextInitSecret) },
  });

  return { commit, welcome, nextState };
}

export async function buildRemoveCommit({ state, targetUserId, memberInitKeys }) {
  const currentState = normalizeGroupState(state);
  const targetUserIdStr = String(targetUserId ?? '');

  if (!targetUserIdStr) {
    throw new Error('Invalid targetUserId for remove commit');
  }
  if (!currentState.initSecretB64) {
    throw new Error(`Group state is missing initSecretB64 for group ${currentState.groupId}`);
  }

  const roster = normalizeRoster(currentState.roster);
  const targetMember = roster.find((member) => String(member.userId) === targetUserIdStr);
  if (!targetMember) {
    throw new Error(`Target userId ${targetUserIdStr} not found in group roster`);
  }

  const newRoster = roster.filter((member) => String(member.userId) !== targetUserIdStr);
  const leafCount = computeLeafCount({
    roster,
    treeNodes: currentState.tree.nodes,
    extraLeafIndex: targetMember.leafIndex,
  });
  const newTree = resizeNodes(currentState.tree.nodes, nodeWidth(leafCount));
  installLeafPublicKeysFromMemberInitKeys(newTree, roster, memberInitKeys);

  blankNodeAndPath(newTree, targetMember.leafIndex, leafCount);

  const nextEpoch = currentState.epoch + 1;
  const { updatePath, commitSecret } = await buildUpdatePath(
    newTree,
    currentState.selfLeafIndex,
    leafCount,
  );
  const { applicationSecret, nextInitSecret } = await advanceEpoch({
    initSecret: base64ToBytes(currentState.initSecretB64),
    commitSecret,
    groupId: currentState.groupId,
    epoch: nextEpoch,
  });

  const nextTree = deriveCommitTree(newTree, updatePath, currentState.selfLeafIndex, currentState.selfLeafIndex);
  const treePublicNodes = nextTree.map((node) => node?.publicKeyB64 ?? null);

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

  const selfStillPresent = newRoster.some(
    (member) => String(member.userId) === String(currentState.selfUserId),
  );

  const nextState = normalizeGroupState({
    ...currentState,
    epoch: nextEpoch,
    roster: newRoster,
    selfLeafIndex: selfStillPresent ? currentState.selfLeafIndex : null,
    applicationSecretB64: selfStillPresent ? bytesToBase64(applicationSecret) : null,
    initSecretB64: selfStillPresent ? bytesToBase64(nextInitSecret) : null,
    senderGenerations: {},
    tree: { nodes: nextTree },
    secrets: {
      initSecretB64: selfStillPresent ? bytesToBase64(nextInitSecret) : null,
    },
  });

  return { commit, nextState };
}

export async function applyCommit({ state, commit, myInitPrivKeyB64 }) {
  const currentState = normalizeGroupState(state);

  if (!commit || typeof commit !== 'object') throw new Error('Invalid commit');
  if (String(commit.groupId ?? '') !== String(currentState.groupId)) {
    throw new Error('Commit groupId mismatch');
  }
  if (!Number.isInteger(commit.epoch) || commit.epoch <= currentState.epoch) {
    throw new Error('Invalid commit epoch');
  }
  if (!Array.isArray(commit.roster)) throw new Error('Commit is missing roster');
  if (!Array.isArray(commit.updatePath)) throw new Error('Commit is missing updatePath');

  const leafCount = Number.isInteger(commit.leafCount)
    ? commit.leafCount
    : computeLeafCount({
      roster: commit.roster,
      treeNodes: currentState.tree.nodes,
      extraLeafIndex: commit.targetLeafIndex,
    });

  const treeNodes = Array.isArray(commit.treePublicNodes)
    ? makeTreeFromPublicNodes(commit.treePublicNodes, currentState.tree.nodes)
    : resizeNodes(currentState.tree.nodes, nodeWidth(leafCount));

  const selfLeafIndex = findLeafIndexForUser(commit.roster, currentState.selfUserId);
  const commitSecret = await applyUpdatePath(
    treeNodes,
    commit.updatePath,
    commit.senderLeafIndex,
    leafCount,
    selfLeafIndex,
    myInitPrivKeyB64,
  );

  const nextEpochSecrets = commitSecret && currentState.initSecretB64
    ? await advanceEpoch({
      initSecret: base64ToBytes(currentState.initSecretB64),
      commitSecret,
      groupId: currentState.groupId,
      epoch: commit.epoch,
    })
    : null;

  return normalizeGroupState({
    ...currentState,
    epoch: commit.epoch,
    roster: commit.roster,
    selfLeafIndex,
    applicationSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.applicationSecret) : null,
    initSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.nextInitSecret) : null,
    senderGenerations: {},
    tree: { nodes: treeNodes },
    secrets: {
      initSecretB64: nextEpochSecrets ? bytesToBase64(nextEpochSecrets.nextInitSecret) : null,
    },
  });
}

export async function encryptApplicationMessage({ state, plaintextBytes, aadBytes }) {
  const normalizedState = normalizeGroupState(state);

  if (!normalizedState.groupId) {
    throw new Error('Group state is missing groupId');
  }
  if (!Number.isInteger(normalizedState.selfLeafIndex)) {
    throw new Error(`Group state is missing selfLeafIndex for group ${normalizedState.groupId}`);
  }

  const { applicationSecretB64, keyBytes: appSecret } = resolveApplicationKey(normalizedState);
  const generation = normalizedState.senderGenerations[String(normalizedState.selfLeafIndex)] ?? 0;
  const { key, nonce } = await deriveAppKeyAndNonce(
    appSecret,
    normalizedState.selfLeafIndex,
    generation,
  );

  const header = {
    version: MLS_HEADER_VERSION,
    groupId: normalizedState.groupId,
    epoch: normalizedState.epoch,
    senderLeafIndex: normalizedState.selfLeafIndex,
    generation,
    cipherSuite: normalizedState.cipherSuite,
  };

  const resolvedAadBytes = aadBytes == null
    ? makeHeaderBytes(header)
    : normalizeBytes(aadBytes, 'aadBytes');
  const ciphertextB64 = bytesToBase64(
    encrypt_aad_bytes(normalizePlaintextBytes(plaintextBytes), key, nonce, resolvedAadBytes),
  );
  const nextAppSecret = await ratchetAppSecret(
    appSecret,
    normalizedState.selfLeafIndex,
    generation,
  );

  const newState = normalizeGroupState({
    ...normalizedState,
    applicationSecretB64: bytesToBase64(nextAppSecret),
    senderGenerations: {
      ...normalizedState.senderGenerations,
      [String(normalizedState.selfLeafIndex)]: generation + 1,
    },
  });

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

export async function decryptApplicationMessage({ state, header, ciphertext, aadBytes, includeNewState = false }) {
  const normalizedState = normalizeGroupState(state);
  const parsedHeader = parseHeader(header);

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

  const expectedGeneration = normalizedState.senderGenerations[String(parsedHeader.senderLeafIndex)] ?? 0;
  if (parsedHeader.generation !== expectedGeneration) {
    throw new Error(
      `MLS generation mismatch for group ${normalizedState.groupId}: expected ${expectedGeneration}, got ${parsedHeader.generation}`,
    );
  }

  const { keyBytes: appSecret } = resolveApplicationKey(normalizedState);
  const { key, nonce } = await deriveAppKeyAndNonce(
    appSecret,
    parsedHeader.senderLeafIndex,
    parsedHeader.generation,
  );
  const resolvedAadBytes = aadBytes == null
    ? makeHeaderBytes(parsedHeader)
    : normalizeBytes(aadBytes, 'aadBytes');

  const plaintextBytes = decrypt_aad_bytes(base64ToBytes(ciphertext), key, nonce, resolvedAadBytes);
  if (!includeNewState) {
    return plaintextBytes;
  }

  const nextAppSecret = await ratchetAppSecret(
    appSecret,
    parsedHeader.senderLeafIndex,
    parsedHeader.generation,
  );
  const newState = normalizeGroupState({
    ...normalizedState,
    applicationSecretB64: bytesToBase64(nextAppSecret),
    senderGenerations: {
      ...normalizedState.senderGenerations,
      [String(parsedHeader.senderLeafIndex)]: parsedHeader.generation + 1,
    },
  });

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
