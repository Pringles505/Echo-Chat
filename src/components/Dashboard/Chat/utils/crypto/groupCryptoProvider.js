import eld from '../../../../../utils/storage/EncryptedLocalDatabase';
import { decryptWithAad, encryptWithAad } from './aes';
import { base64ToBytes, bytesToBase64 } from '../helpers';

const MLS_STATE_VERSION = 1;
const MLS_STATE_PREFIX = 'mls:groupState:';
const DEFAULT_MLS_CIPHER_SUITE = 'MLS-MVP/X25519_AES256GCM_SHA256';
const MLS_HEADER_VERSION = 1;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });

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

function makeRandomGroupKeyB64() {
    return bytesToBase64(randomBytes(32));
}

function findLeafIndexForUser(roster, userId) {
    const match = Array.isArray(roster)
        ? roster.find((member) => String(member?.userId ?? '') === String(userId ?? ''))
        : null;

    return Number.isInteger(match?.leafIndex) ? match.leafIndex : null;
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

function makeHeaderBytes(header) {
    return TEXT_ENCODER.encode(JSON.stringify(header));
}

function makeHeaderB64(header) {
    return bytesToBase64(makeHeaderBytes(header));
}

function parseHeader(header) {
    if (typeof header === 'string') {
        const decoded = TEXT_DECODER.decode(base64ToBytes(header));
        return JSON.parse(decoded);
    }

    if (header && typeof header === 'object') {
        return header;
    }

    throw new Error('Missing MLS header');
}

function normalizePlaintextString(plaintextBytes) {
    if (typeof plaintextBytes === 'string') return plaintextBytes;
    return TEXT_DECODER.decode(normalizeBytes(plaintextBytes, 'plaintextBytes'));
}

function resolveApplicationKey(state) {
    const groupKeyB64 = typeof state?.groupKeyB64 === 'string' && state.groupKeyB64.length > 0
        ? state.groupKeyB64
        : null;

    if (!groupKeyB64) {
        throw new Error(`Group state is missing application key material for group ${state?.groupId ?? ''}`);
    }

    return { groupKeyB64, keyBytes: base64ToBytes(groupKeyB64) };
}

function makeEmptyGroupState({
    groupId,
    selfUserId,
    selfLeafIndex = null,
    roster = [],
    cipherSuite = DEFAULT_MLS_CIPHER_SUITE,
    applicationMessageCounter = 0,
    groupKeyB64 = makeRandomGroupKeyB64(),
}) {
    return {
        stateVersion: MLS_STATE_VERSION,
        groupId,
        epoch: 0,
        cipherSuite,
        selfUserId,
        selfLeafIndex,
        applicationMessageCounter,
        groupKeyB64,
        roster,
        tree: {
            nodes: [],
            root: null,
        },
        secrets: {
            epochSecretsB64: null,
            initSecretB64: null,
        },
        pendingCommits: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

function normalizeGroupState(state) {
    if (!state || typeof state !== 'object') {
        throw new Error('Invalid group state');
    }

    return {
        stateVersion: state.stateVersion || MLS_STATE_VERSION,
        groupId: state.groupId,
        epoch: Number.isInteger(state.epoch) ? state.epoch : 0,
        cipherSuite: typeof state.cipherSuite === 'string' && state.cipherSuite.length > 0
            ? state.cipherSuite
            : DEFAULT_MLS_CIPHER_SUITE,
        selfUserId: state.selfUserId ?? null,
        selfLeafIndex: Number.isInteger(state.selfLeafIndex) ? state.selfLeafIndex : null,
        applicationMessageCounter: Number.isInteger(state.applicationMessageCounter)
            ? state.applicationMessageCounter
            : 0,
        groupKeyB64: state.groupKeyB64 === null
            ? null
            : (typeof state.groupKeyB64 === 'string' && state.groupKeyB64.length > 0
                ? state.groupKeyB64
                : makeRandomGroupKeyB64()),
        roster: Array.isArray(state.roster) ? state.roster : [],
        tree: state.tree ?? { nodes: [], root: null },
        secrets: state.secrets ?? { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: Array.isArray(state.pendingCommits) ? state.pendingCommits : [],
        createdAt: state.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };
}

export async function saveGroupState(groupId, state) {
    if (!eld.isUnlocked()) {
        throw new Error('ELD must be unlocked before saving group state');
    }

    const normalized = normalizeGroupState({ ...state, groupId});
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
    applicationMessageCounter = 0,
    groupKeyB64 = undefined,
}) {
    const state = makeEmptyGroupState({
        groupId,
        selfUserId: creatorUserId,
        selfLeafIndex: findLeafIndexForUser(roster, creatorUserId),
        roster,
        cipherSuite,
        applicationMessageCounter,
        groupKeyB64: groupKeyB64 === undefined ? makeRandomGroupKeyB64() : groupKeyB64,
    });

    return saveGroupState(groupId, state);
}

export async function encryptApplicationMessage({ state, plaintextBytes, aadBytes }) {
    const normalizedState = normalizeGroupState(state);

    if (!normalizedState.groupId) {
        throw new Error('Group state is missing groupId');
    }

    if (!Number.isInteger(normalizedState.selfLeafIndex)) {
        throw new Error(`Group state is missing selfLeafIndex for group ${normalizedState.groupId}`);
    }

    const { groupKeyB64, keyBytes } = resolveApplicationKey(normalizedState);
    const counter = normalizedState.applicationMessageCounter;
    const nonceBytes = randomBytes(12);
    const nonceB64 = bytesToBase64(nonceBytes);

    const header = {
        version: MLS_HEADER_VERSION,
        groupId: normalizedState.groupId,
        epoch: normalizedState.epoch,
        senderLeafIndex: normalizedState.selfLeafIndex,
        counter,
        nonceB64,
        cipherSuite: normalizedState.cipherSuite,
    };

    const plaintext = normalizePlaintextString(plaintextBytes);
    const resolvedAadBytes = aadBytes == null ? makeHeaderBytes(header) : normalizeBytes(aadBytes, 'aadBytes');
    const ciphertextB64 = await encryptWithAad(plaintext, keyBytes, nonceBytes, resolvedAadBytes);

    const newState = normalizeGroupState({
        ...normalizedState,
        groupKeyB64,
        applicationMessageCounter: counter + 1,
    });

    return {
        header,
        headerB64: makeHeaderB64(header),
        ciphertextB64,
        nonceB64,
        newState,
    };
}

export async function decryptApplicationMessage({ state, header, ciphertext, aadBytes }) {
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

    if (Number.isInteger(parsedHeader.epoch) && parsedHeader.epoch !== normalizedState.epoch) {
        throw new Error(`MLS epoch mismatch for group ${normalizedState.groupId}`);
    }

    if (parsedHeader.cipherSuite && parsedHeader.cipherSuite !== normalizedState.cipherSuite) {
        throw new Error(`MLS cipher suite mismatch for group ${normalizedState.groupId}`);
    }

    if (typeof parsedHeader.nonceB64 !== 'string' || parsedHeader.nonceB64.length === 0) {
        throw new Error(`MLS header is missing nonce for group ${normalizedState.groupId}`);
    }

    if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
        throw new Error(`MLS ciphertext is missing for group ${normalizedState.groupId}`);
    }

    const { keyBytes } = resolveApplicationKey(normalizedState);
    const resolvedAadBytes = aadBytes == null ? makeHeaderBytes(parsedHeader) : normalizeBytes(aadBytes, 'aadBytes');
    const plaintext = await decryptWithAad(
        ciphertext,
        keyBytes,
        base64ToBytes(parsedHeader.nonceB64),
        resolvedAadBytes,
    );

    return TEXT_ENCODER.encode(plaintext);
}

export async function applyCommit( { state, commit } ) {
    const currentState = normalizeGroupState(state);

    if (!commit || typeof commit !== "object") {
      throw new Error("Invalid commit");
    }

    if (String(commit.groupId ?? "") !== String(currentState.groupId)) {
      throw new Error("Commit groupId mismatch");
    }

    if (!Number.isInteger(commit.epoch) || commit.epoch <= currentState.epoch) {
      throw new Error("Invalid commit epoch");
    }

    if (!Array.isArray(commit.roster)) {
      throw new Error("Commit is missing roster");
    }

    if (typeof commit.nextGroupKeyB64 !== "string" || commit.nextGroupKeyB64.length === 0) {
      throw new Error("Commit is missing nextGroupKeyB64");
    }

    const selfMember = commit.roster.find(
      (member) => String(member.userId) === String(currentState.selfUserId)
    );

    return normalizeGroupState({
        ...currentState,
        epoch: commit.epoch,
        roster: commit.roster,
        groupKeyB64: selfMember ? commit.nextGroupKeyB64 : null,
        selfLeafIndex: Number.isInteger(selfMember?.leafIndex) ? selfMember.leafIndex : null,
        applicationMessageCounter: 0,
    });
}

export async function processWelcome({ welcome, selfUserId = null }) {
    if (!welcome || typeof welcome !== 'object') {
        throw new Error('Invalid welcome');
    }

    if (typeof welcome.groupId !== 'string' || welcome.groupId.length === 0) {
        throw new Error('Welcome is missing groupId');
    }

    if (!Number.isInteger(welcome.recipientLeafIndex)) {
        throw new Error(`Welcome is missing recipientLeafIndex for group ${welcome.groupId}`);
    }

    if (typeof welcome.groupKeyB64 !== 'string' || welcome.groupKeyB64.length === 0) {
        throw new Error(`Welcome is missing groupKeyB64 for group ${welcome.groupId}`);
    }

    if (!Array.isArray(welcome.roster)) {
        throw new Error(`Welcome is missing roster for group ${welcome.groupId}`);
    }

    return normalizeGroupState({
        stateVersion: MLS_STATE_VERSION,
        groupId: welcome.groupId,
        epoch: Number.isInteger(welcome.epoch) ? welcome.epoch : 0,
        cipherSuite: typeof welcome.cipherSuite === 'string' && welcome.cipherSuite.length > 0
            ? welcome.cipherSuite
            : DEFAULT_MLS_CIPHER_SUITE,
        selfUserId: selfUserId ?? welcome.recipientUserId ?? null,
        selfLeafIndex: welcome.recipientLeafIndex,
        applicationMessageCounter: 0,
        groupKeyB64: welcome.groupKeyB64,
        roster: welcome.roster,
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
    });
}

export async function buildAddCommit({ state, newMember }) {
    const currentState = normalizeGroupState(state);

    if (!newMember || typeof newMember !== 'object') {
        throw new Error('Invalid new member for add commit');
    }

    const newMemberUserId = String(newMember.userId ?? '');
    if (newMemberUserId.length === 0) {
        throw new Error('New member for add commit is missing userId');
    }

    if (!Number.isInteger(newMember.leafIndex)) {
        throw new Error('New member for add commit is missing leafIndex');
    }

    const roster = normalizeRoster(currentState.roster);
    if (roster.some((member) => String(member.userId) === newMemberUserId)) {
        throw new Error(`Member ${newMemberUserId} already exists in group ${currentState.groupId}`);
    }

    const newRoster = normalizeRoster([
        ...roster,
        {
            userId: newMemberUserId,
            username: newMember.username ?? '',
            leafIndex: newMember.leafIndex,
        }
    ]);

    const nextEpoch = currentState.epoch + 1;
    const nextGroupKeyB64 = makeRandomGroupKeyB64();

    const commit = {
        groupId: currentState.groupId,
        epoch: nextEpoch,
        type: "add",
        senderLeafIndex: currentState.selfLeafIndex,
        roster: newRoster,
        nextGroupKeyB64,
        targetUserId: newMemberUserId,
        targetLeafIndex: newMember.leafIndex,
    };

    const welcome = {
        groupId: currentState.groupId,
        epoch: nextEpoch,
        cipherSuite: currentState.cipherSuite,
        roster: newRoster,
        recipientUserId: newMemberUserId,
        recipientLeafIndex: newMember.leafIndex,
        groupKeyB64: nextGroupKeyB64,
    };

    const nextState = normalizeGroupState({
        ...currentState,
        epoch: nextEpoch,
        roster: newRoster,
        groupKeyB64: nextGroupKeyB64,
        applicationMessageCounter: 0,
    });

    return {
        commit,
        welcome,
        nextState,
    };
}

export async function buildRemoveCommit({ state, targetUserId }) {
    const currentState = normalizeGroupState(state);

    const targetUserIdStr = String(targetUserId ?? '');
    if (!targetUserIdStr) {
        throw new Error('Invalid targetUserId for remove commit');
    }

    const roster = normalizeRoster(currentState.roster);
    const targetMember = roster.find((member) => String(member.userId) === targetUserIdStr);
    if (!targetMember) {
        throw new Error(`Target userId ${targetUserIdStr} not found in group roster`);
    }

    const newRoster = roster.filter((member) => String(member.userId) !== targetUserIdStr);

    const nextEpoch = currentState.epoch + 1;
    const nextGroupKeyB64 = makeRandomGroupKeyB64();

    const commit = {
        groupId: currentState.groupId,
        epoch: nextEpoch,
        type: "remove",
        senderLeafIndex: currentState.selfLeafIndex,
        roster: newRoster,
        nextGroupKeyB64,
        targetUserId: targetUserIdStr,
        targetLeafIndex: targetMember.leafIndex,
    }

    const selfStillPresent = newRoster.some((member) => String(member.userId) === String(currentState.selfUserId));
    
    const nextState = normalizeGroupState({
        ...currentState,
        epoch: nextEpoch,
        roster: newRoster,
        groupKeyB64: selfStillPresent ? nextGroupKeyB64 : null,
        selfLeafIndex: selfStillPresent ? findLeafIndexForUser(newRoster, currentState.selfUserId) : null,
        applicationMessageCounter: 0,
    });

    return {
        commit,
        nextState,
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
};

export default groupCryptoProvider;
