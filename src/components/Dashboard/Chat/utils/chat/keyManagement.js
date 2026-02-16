import { tr } from 'date-fns/locale';
import eld from '../../../../../utils/storage/EncryptedLocalDatabase';

// In-memory caches
const ephemeralCache = new Map();

const sendingChainKeyCache = new Map();
const receivingChainKeyCache = new Map();
const rootKeyCache = new Map();
const sessionKeyCache = new Map(); 

export const setOwnEphemeralKeys = async (userId, targetUserId, publicKey, privateKey) => {
  if (!publicKey || !privateKey) {
    throw new Error('Invalid keys: must provide both public and private');
  }

  const existingData = await getEphemeralData(userId, targetUserId) || {};

  await setEphemeralData(userId, targetUserId, {
    ...existingData,
    ephPub: publicKey,
    ephPriv: privateKey
  });

  console.log(`[KeyMgmt] Stored own ephemeral keys for ${userId}-${targetUserId}`);
}

export const getOwnEphemeralKeys = async (userId, targetUserId) => {
  const data = await getEphemeralData(userId, targetUserId);

  if (data?.ephPriv && data?.ephPub) {
    console.log(`[KeyMgmt] Retrieved own ephemeral keys for ${userId}-${targetUserId}`);
    return {
      private: data.ephPriv,
      public: data.ephPub
    };
  }

  console.log(`[KeyMgmt] No own ephemeral keys found for ${userId}-${targetUserId}`);
  return null;
}

export const deleteOwnEphemeralKeys = async (userId, targetUserId) => {
  const existingData = await getEphemeralData(userId, targetUserId);

  if (existingData) {
    // Remove only the ephemeral key fields, keep other data
    delete existingData.ephPriv;
    delete existingData.ephPub;
    await setEphemeralData(userId, targetUserId, existingData);
    console.log(`[KeyMgmt] 🗑️ Deleted own ephemeral keys for ${userId}-${targetUserId}`);
  }
}

// SESSION KEYS (temporary in-memory storage for message keys, used for echo decryption)
export const setSessionKey = (userId, targetUserId, messageKey) => {
  const sessionId = `${userId}->${targetUserId}`;
  sessionKeyCache.set(sessionId, messageKey);
  console.log(`[KeyMgmt] Stored session key for ${sessionId}`);
};

export const getSessionKey = (userId, targetUserId) => { 
  const sessionId = `${userId}->${targetUserId}`;
  const key = sessionKeyCache.get(sessionId);
  if (key) {
    console.log(`[KeyMgmt] Retrieved session key for ${sessionId}`);
  } else {
    console.log(`[KeyMgmt] No session key found for ${sessionId}`);
  }
  return key || null;
};

// ROOT KEYS 

// Get Root key for given session  
export const getRootKey = async (userId, targetUserId) => {
  const rootKeyId = [userId, targetUserId].sort().join('-');

  if (rootKeyCache.has(rootKeyId)) {
    console.log(`[KeyMgmt] Retrieved root key from memory for ${rootKeyId}`);
    return rootKeyCache.get(rootKeyId);
  }

  if (eld.isUnlocked()) {
    try {
      const data = await eld.getRootKey(targetUserId);
      if (data?.rootKey) {
        rootKeyCache.set(rootKeyId, data.rootKey);
        console.log(`[KeyMgmt] Retrieved root key from ELD for ${rootKeyId}`);
        return data.rootKey;
      }
    } catch (err) {
      console.error('[KeyMgmt] Failed to get root key:', err);
    }
  }
  return null;
}

// Set Root Key for given session
export const setRootKey = async (userId, targetUserId, rootKey) => {
  const rootKeyId = [userId, targetUserId].sort().join('-');

  let normalizedKey = rootKey;
  if (!(normalizedKey instanceof Uint8Array)) {
    if (normalizedKey instanceof ArrayBuffer) {
      normalizedKey = new Uint8Array(normalizedKey);
    } else if (Array.isArray(normalizedKey)) {
      normalizedKey = new Uint8Array(normalizedKey);
    }
  }

  if (!(normalizedKey instanceof Uint8Array) || normalizedKey.length !== 32) {
    console.error('[KeyMgmt] Refusing to store invalid root key', {
      rootKeyId,
      keyType: Object.prototype.toString.call(rootKey),
      keyLength: normalizedKey?.length
    });
    return;
  }

  rootKeyCache.set(rootKeyId, normalizedKey);

  if (eld.isUnlocked()) {
    try {
      await eld.storeRootKey(targetUserId, normalizedKey);
      console.log(`[KeyMgmt] Stored root key for ${rootKeyId}`);
    } catch (err) {
      console.error('[KeyMgmt] Failed to store root key:', err);
    }
  }
}

// SENDING CHAIN KEYS
export const setSendingChainKey = async (userId, targetUserId, chainKey) => {
  const sendingId = `${userId}->${targetUserId}`;
  let normalizedKey = chainKey instanceof Uint8Array ? chainKey : new Uint8Array(chainKey);

  sendingChainKeyCache.set(sendingId, normalizedKey);

  if (eld.isUnlocked()) {
    await eld.storeSendingChainKey(targetUserId, normalizedKey);
  }
};

export const getSendingChainKey = async (userId, targetUserId) => {
  const sendingId = `${userId}->${targetUserId}`;

  if (sendingChainKeyCache.has(sendingId)) {
    return sendingChainKeyCache.get(sendingId);
  }

  if (eld.isUnlocked()) {
    const data = await eld.getSendingChainKey(targetUserId);
    if (data?.sendingChainKey) {
      sendingChainKeyCache.set(sendingId, data.sendingChainKey);
      return data.sendingChainKey;
    }
  }

  return null;
};

// RECEIVING CHAIN KEYS
export const setReceivingChainKey = async (userId, targetUserId, chainKey) => {
  const receivingId = `${targetUserId}->${userId}`;
  let normalizedKey = chainKey instanceof Uint8Array ? chainKey : new Uint8Array(chainKey);

  receivingChainKeyCache.set(receivingId, normalizedKey);

  if (eld.isUnlocked()) {
    await eld.storeReceivingChainKey(targetUserId, normalizedKey);
  }
};

export const getReceivingChainKey = async (userId, targetUserId) => {
  const receivingId = `${targetUserId}->${userId}`;

  if (receivingChainKeyCache.has(receivingId)) {
    return receivingChainKeyCache.get(receivingId);
  }

  if (eld.isUnlocked()) {
    const data = await eld.getReceivingChainKey(targetUserId);
    if (data?.receivingChainKey) {
      receivingChainKeyCache.set(receivingId, data.receivingChainKey);
      return data.receivingChainKey;
    }
  }

  return null;
};

// IDENTITY KEYS

export const getIdentityKeys = async () => {
  if (!eld.isUnlocked()) {
    console.error('[KeyMgmt] Database locked - cannot get identity keys');
    return null;
  }
  return await eld.getIdentityKeys();
};

// EPHEMERAL KEYS 

export const setEphemeralData = async (userId, targetUserId, data) => {
  const sessionId = [userId, targetUserId].sort().join('-');
  ephemeralCache.set(sessionId, data);

  if (eld.isUnlocked()) {
    try {
      await eld.storeEphemeralData(targetUserId, data);
      console.log(`[KeyMgmt] Stored ephemeral data for ${sessionId}`);
    } catch (err) {
      console.error('[KeyMgmt] Failed to store ephemeral data:', err);
    }
  }
};

export const getEphemeralData = async (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].sort().join('-');

  if (ephemeralCache.has(sessionId)) {
    console.log(`[KeyMgmt] Retrieved ephemeral data from memory for ${sessionId}`);
    return ephemeralCache.get(sessionId);
  }

  if (eld.isUnlocked()) {
    try {
      const data = await eld.getEphemeralData(targetUserId);
      if (data) {
        ephemeralCache.set(sessionId, data);
        console.log(`[KeyMgmt] Retrieved ephemeral data from ELD for ${sessionId}`);
        return data;
      }
    } catch (err) {
      console.error('[KeyMgmt] Failed to get ephemeral data:', err);
    }
  }

  return null;
};

// MESSAGES 

export const updateSavedMessages = async (userId, targetUserId, message, setMessages) => {
  if (eld.isUnlocked()) {
    try {
      await eld.storeMessage(targetUserId, message);
      console.log('[KeyMgmt] Stored message in ELD');
    } catch (err) {
      console.error('[KeyMgmt] Failed to store message:', err);
    }
  }

  if (setMessages) {
    setMessages(prev => {
      if (prev.some(msg => msg._id === message._id)) return prev;
      return [...prev, message];
    });
  }

  window.dispatchEvent(new CustomEvent('localStorageUpdated', {
    detail: {
      userId,
      targetUserId,
      latestMessage: message.text,
      timestamp: message.timestamp || message.createdAt
    }
  }));
};

export const getSavedMessages = async (userId, targetUserId) => {
  if (!eld.isUnlocked()) {
    console.warn('[KeyMgmt] Database locked - cannot get messages');
    return [];
  }

  try {
    return await eld.getMessages(targetUserId);
  } catch (err) {
    console.error('[KeyMgmt] Failed to get messages:', err);
    return [];
  }
};

export const updateMessageSeenStatus = async (userId, targetUserId) => {
  if (!eld.isUnlocked()) return;

  try {
    const messages = await eld.getMessages(targetUserId);
    for (const msg of messages) {
      if (msg.userId === userId && !msg.seenStatus) {
        msg.seenStatus = true;
        await eld.storeMessage(targetUserId, msg);
      }
    }
    console.log('[KeyMgmt] Updated seen status for messages');
  } catch (err) {
    console.error('[KeyMgmt] Failed to update seen status:', err);
  }
};