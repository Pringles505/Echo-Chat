import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const encryptWithAadMock = vi.fn();
const decryptWithAadMock = vi.fn();

vi.mock('../../../../../../utils/storage/EncryptedLocalDatabase', () => ({
  default: {
    isUnlocked: vi.fn(() => true),
    storeMlsGroupState: vi.fn(async () => {}),
    getMlsGroupState: vi.fn(async () => null),
  },
}));

vi.mock('../aes', () => ({
  encryptWithAad: (...args) => encryptWithAadMock(...args),
  decryptWithAad: (...args) => decryptWithAadMock(...args),
}));

const { bytesToBase64 } = await import('../../helpers');
const {
  applyCommit,
  buildAddCommit,
  buildRemoveCommit,
  createNewGroupState,
  decryptApplicationMessage,
  encryptApplicationMessage,
  processWelcome,
} = await import('../groupCryptoProvider');

describe('groupCryptoProvider encryptApplicationMessage', () => {
  beforeEach(() => {
    encryptWithAadMock.mockReset();
    decryptWithAadMock.mockReset();
    encryptWithAadMock.mockResolvedValue('ciphertext-b64');
    decryptWithAadMock.mockResolvedValue('hello group');
  });

  it('builds an MLS header, encrypts with the stored group key, and advances the counter', async () => {
    const groupKeyBytes = new Uint8Array(32).fill(7);
    const state = {
      stateVersion: 1,
      groupId: 'group-1',
      epoch: 3,
      cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
      selfUserId: 'alice',
      selfLeafIndex: 2,
      applicationMessageCounter: 4,
      groupKeyB64: bytesToBase64(groupKeyBytes),
      roster: [],
      tree: { nodes: [], root: null },
      secrets: { epochSecretsB64: null, initSecretB64: null },
      pendingCommits: [],
    };

    const plaintextBytes = new TextEncoder().encode('hello group');
    const aadBytes = new TextEncoder().encode('aad');

    const result = await encryptApplicationMessage({ state, plaintextBytes, aadBytes });

    expect(encryptWithAadMock).toHaveBeenCalledTimes(1);
    expect(encryptWithAadMock).toHaveBeenCalledWith(
      'hello group',
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      aadBytes
    );

    const [_, keyBytes, nonceBytes] = encryptWithAadMock.mock.calls[0];
    expect(keyBytes).toEqual(groupKeyBytes);
    expect(nonceBytes).toBeInstanceOf(Uint8Array);
    expect(nonceBytes).toHaveLength(12);

    expect(result.ciphertextB64).toBe('ciphertext-b64');
    expect(result.header.groupId).toBe('group-1');
    expect(result.header.epoch).toBe(3);
    expect(result.header.senderLeafIndex).toBe(2);
    expect(result.header.counter).toBe(4);
    expect(result.header.cipherSuite).toBe('MLS-MVP/X25519_AES256GCM_SHA256');
    expect(typeof result.header.nonceB64).toBe('string');
    expect(result.nonceB64).toBe(result.header.nonceB64);

    const decodedHeader = JSON.parse(Buffer.from(result.headerB64, 'base64').toString('utf8'));
    expect(decodedHeader).toEqual(result.header);

    expect(result.newState.applicationMessageCounter).toBe(5);
    expect(result.newState.groupKeyB64).toBe(state.groupKeyB64);
  });

  it('creates a usable initial state with a leaf assignment and stored group key', async () => {
    const state = await createNewGroupState({
      groupId: 'group-2',
      creatorUserId: 'alice',
      roster: [
        { userId: 'alice', username: 'Alice', leafIndex: 0 },
        { userId: 'bob', username: 'Bob', leafIndex: 1 },
      ],
    });

    expect(state.selfLeafIndex).toBe(0);
    expect(state.applicationMessageCounter).toBe(0);
    expect(typeof state.groupKeyB64).toBe('string');
    expect(state.groupKeyB64.length).toBeGreaterThan(0);
  });

  it('fails closed when the state has no leaf assignment', async () => {
    await expect(
      encryptApplicationMessage({
        state: {
          stateVersion: 1,
          groupId: 'group-3',
          epoch: 0,
          selfUserId: 'alice',
          selfLeafIndex: null,
          roster: [],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        plaintextBytes: new TextEncoder().encode('hello'),
      })
    ).rejects.toThrow('selfLeafIndex');
  });

  it('fails closed when the group key is missing', async () => {
    await expect(
      encryptApplicationMessage({
        state: {
          stateVersion: 1,
          groupId: 'group-4',
          epoch: 0,
          selfUserId: 'alice',
          selfLeafIndex: 0,
          groupKeyB64: null,
          roster: [],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        plaintextBytes: new TextEncoder().encode('hello'),
      })
    ).rejects.toThrow('application key material');
  });

  it('decrypts ciphertext using the header nonce and validates the header', async () => {
    const groupKeyBytes = new Uint8Array(32).fill(9);
    const header = {
      version: 1,
      groupId: 'group-5',
      epoch: 7,
      senderLeafIndex: 1,
      counter: 3,
      nonceB64: Buffer.from(new Uint8Array(12).fill(5)).toString('base64'),
      cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
    };

    const plaintextBytes = await decryptApplicationMessage({
      state: {
        stateVersion: 1,
        groupId: 'group-5',
        epoch: 7,
        cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
        selfUserId: 'alice',
        selfLeafIndex: 0,
        groupKeyB64: bytesToBase64(groupKeyBytes),
        roster: [],
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
      },
      header: Buffer.from(JSON.stringify(header), 'utf8').toString('base64'),
      ciphertext: 'ciphertext-b64',
    });

    expect(decryptWithAadMock).toHaveBeenCalledWith(
      'ciphertext-b64',
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      expect.any(Uint8Array)
    );
    expect(new TextDecoder().decode(plaintextBytes)).toBe('hello group');
  });

  it('processWelcome builds usable local state from a valid welcome payload', async () => {
    const state = await processWelcome({
      welcome: {
        groupId: 'group-6',
        epoch: 2,
        cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
        ],
        recipientUserId: 'bob',
        recipientLeafIndex: 1,
        groupKeyB64: 'group-key-b64',
      },
      selfUserId: 'bob',
    });

    expect(state).toEqual(expect.objectContaining({
      groupId: 'group-6',
      epoch: 2,
      cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
      selfUserId: 'bob',
      selfLeafIndex: 1,
      groupKeyB64: 'group-key-b64',
      applicationMessageCounter: 0,
      roster: [
        { userId: 'alice', username: 'Alice', leafIndex: 0 },
        { userId: 'bob', username: 'Bob', leafIndex: 1 },
      ],
    }));
  });

  it('processWelcome rejects a welcome without key material', async () => {
    await expect(
      processWelcome({
        welcome: {
          groupId: 'group-7',
          epoch: 0,
          roster: [],
          recipientUserId: 'bob',
          recipientLeafIndex: 1,
        },
        selfUserId: 'bob',
      })
    ).rejects.toThrow('groupKeyB64');
  });

  it('processWelcome rejects a welcome without a recipient leaf index', async () => {
    await expect(
      processWelcome({
        welcome: {
          groupId: 'group-8',
          epoch: 0,
          roster: [],
          recipientUserId: 'bob',
          groupKeyB64: 'group-key-b64',
        },
        selfUserId: 'bob',
      })
    ).rejects.toThrow('recipientLeafIndex');
  });

  it('applyCommit advances epoch, replaces the group key, and resets the counter', async () => {
    const nextState = await applyCommit({
      state: {
        stateVersion: 1,
        groupId: 'group-9',
        epoch: 2,
        cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
        selfUserId: 'alice',
        selfLeafIndex: 0,
        applicationMessageCounter: 9,
        groupKeyB64: 'old-group-key',
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
        ],
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
      },
      commit: {
        groupId: 'group-9',
        epoch: 3,
        type: 'update',
        senderLeafIndex: 0,
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
          { userId: 'carol', username: 'Carol', leafIndex: 2 },
        ],
        nextGroupKeyB64: 'new-group-key',
      },
    });

    expect(nextState).toEqual(expect.objectContaining({
      groupId: 'group-9',
      epoch: 3,
      selfUserId: 'alice',
      selfLeafIndex: 0,
      groupKeyB64: 'new-group-key',
      applicationMessageCounter: 0,
    }));
    expect(nextState.roster).toHaveLength(3);
  });

  it('applyCommit rejects a commit for the wrong group', async () => {
    await expect(
      applyCommit({
        state: {
          stateVersion: 1,
          groupId: 'group-10',
          epoch: 2,
          selfUserId: 'alice',
          selfLeafIndex: 0,
          applicationMessageCounter: 1,
          groupKeyB64: 'group-key',
          roster: [],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        commit: {
          groupId: 'other-group',
          epoch: 3,
          roster: [],
          nextGroupKeyB64: 'new-group-key',
        },
      })
    ).rejects.toThrow('groupId mismatch');
  });

  it('applyCommit rejects a stale epoch', async () => {
    await expect(
      applyCommit({
        state: {
          stateVersion: 1,
          groupId: 'group-11',
          epoch: 4,
          selfUserId: 'alice',
          selfLeafIndex: 0,
          applicationMessageCounter: 1,
          groupKeyB64: 'group-key',
          roster: [],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        commit: {
          groupId: 'group-11',
          epoch: 4,
          roster: [],
          nextGroupKeyB64: 'new-group-key',
        },
      })
    ).rejects.toThrow('Invalid commit epoch');
  });

  it('applyCommit clears local sending state when the current user is removed', async () => {
    const nextState = await applyCommit({
      state: {
        stateVersion: 1,
        groupId: 'group-12',
        epoch: 1,
        selfUserId: 'bob',
        selfLeafIndex: 1,
        applicationMessageCounter: 2,
        groupKeyB64: 'group-key',
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
        ],
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
      },
      commit: {
        groupId: 'group-12',
        epoch: 2,
        type: 'remove',
        senderLeafIndex: 0,
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
        ],
        nextGroupKeyB64: 'new-group-key',
        targetUserId: 'bob',
        targetLeafIndex: 1,
      },
    });

    expect(nextState).toEqual(expect.objectContaining({
      epoch: 2,
      selfLeafIndex: null,
      groupKeyB64: null,
      applicationMessageCounter: 0,
    }));
  });

  it('buildAddCommit advances epoch, rotates the group key, and returns a matching welcome', async () => {
    const result = await buildAddCommit({
      state: {
        stateVersion: 1,
        groupId: 'group-13',
        epoch: 4,
        cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
        selfUserId: 'alice',
        selfLeafIndex: 0,
        applicationMessageCounter: 6,
        groupKeyB64: 'old-group-key',
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
        ],
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
      },
      newMember: {
        userId: 'carol',
        username: 'Carol',
        leafIndex: 2,
      },
    });

    expect(result.commit).toEqual(expect.objectContaining({
      groupId: 'group-13',
      epoch: 5,
      type: 'add',
      senderLeafIndex: 0,
      targetUserId: 'carol',
      targetLeafIndex: 2,
    }));
    expect(result.commit.roster).toEqual([
      { userId: 'alice', username: 'Alice', leafIndex: 0 },
      { userId: 'bob', username: 'Bob', leafIndex: 1 },
      { userId: 'carol', username: 'Carol', leafIndex: 2 },
    ]);
    expect(result.welcome).toEqual(expect.objectContaining({
      groupId: 'group-13',
      epoch: 5,
      cipherSuite: 'MLS-MVP/X25519_AES256GCM_SHA256',
      recipientUserId: 'carol',
      recipientLeafIndex: 2,
      roster: result.commit.roster,
      groupKeyB64: result.commit.nextGroupKeyB64,
    }));
    expect(result.nextState).toEqual(expect.objectContaining({
      epoch: 5,
      selfLeafIndex: 0,
      groupKeyB64: result.commit.nextGroupKeyB64,
      applicationMessageCounter: 0,
    }));
  });

  it('buildAddCommit rejects duplicate members', async () => {
    await expect(
      buildAddCommit({
        state: {
          stateVersion: 1,
          groupId: 'group-14',
          epoch: 1,
          selfUserId: 'alice',
          selfLeafIndex: 0,
          applicationMessageCounter: 0,
          groupKeyB64: 'group-key',
          roster: [
            { userId: 'alice', username: 'Alice', leafIndex: 0 },
            { userId: 'bob', username: 'Bob', leafIndex: 1 },
          ],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        newMember: {
          userId: 'bob',
          username: 'Bob',
          leafIndex: 1,
        },
      })
    ).rejects.toThrow('already exists');
  });

  it('buildRemoveCommit advances epoch, rotates the group key, and removes the target member', async () => {
    const result = await buildRemoveCommit({
      state: {
        stateVersion: 1,
        groupId: 'group-15',
        epoch: 2,
        selfUserId: 'alice',
        selfLeafIndex: 0,
        applicationMessageCounter: 3,
        groupKeyB64: 'group-key',
        roster: [
          { userId: 'alice', username: 'Alice', leafIndex: 0 },
          { userId: 'bob', username: 'Bob', leafIndex: 1 },
          { userId: 'carol', username: 'Carol', leafIndex: 2 },
        ],
        tree: { nodes: [], root: null },
        secrets: { epochSecretsB64: null, initSecretB64: null },
        pendingCommits: [],
      },
      targetUserId: 'bob',
    });

    expect(result.commit).toEqual(expect.objectContaining({
      groupId: 'group-15',
      epoch: 3,
      type: 'remove',
      senderLeafIndex: 0,
      targetUserId: 'bob',
      targetLeafIndex: 1,
    }));
    expect(result.commit.roster).toEqual([
      { userId: 'alice', username: 'Alice', leafIndex: 0 },
      { userId: 'carol', username: 'Carol', leafIndex: 2 },
    ]);
    expect(result.nextState).toEqual(expect.objectContaining({
      epoch: 3,
      selfLeafIndex: 0,
      groupKeyB64: result.commit.nextGroupKeyB64,
      applicationMessageCounter: 0,
    }));
  });

  it('buildRemoveCommit rejects missing targets', async () => {
    await expect(
      buildRemoveCommit({
        state: {
          stateVersion: 1,
          groupId: 'group-16',
          epoch: 2,
          selfUserId: 'alice',
          selfLeafIndex: 0,
          applicationMessageCounter: 0,
          groupKeyB64: 'group-key',
          roster: [
            { userId: 'alice', username: 'Alice', leafIndex: 0 },
          ],
          tree: { nodes: [], root: null },
          secrets: { epochSecretsB64: null, initSecretB64: null },
          pendingCommits: [],
        },
        targetUserId: 'bob',
      })
    ).rejects.toThrow('not found');
  });
});
