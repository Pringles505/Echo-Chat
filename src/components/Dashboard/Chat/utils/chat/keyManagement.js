// Key Management with ELD (Encrypted Local Database)
// - In-memory cache for fast access during session
// - ELD for encrypted persistence
// - All keys cleared on logout for security

import eld from '../../../../../utils/storage/EncryptedLocalDatabase';

// In-memory caches
const sessionKeyCache = new Map();
const ephemeralCache = new Map();

// ============== SESSION KEYS ==============

const setSessionKey = async (userId, targetUserId, keyUint8Array) => {
  const sessionId = [userId, targetUserId].sort().join('-');

  let normalizedKey = keyUint8Array;
  if (!(normalizedKey instanceof Uint8Array)) {
    if (normalizedKey instanceof ArrayBuffer) {
      normalizedKey = new Uint8Array(normalizedKey);
    } else if (Array.isArray(normalizedKey)) {
      normalizedKey = new Uint8Array(normalizedKey);
    }
  }

  if (!(normalizedKey instanceof Uint8Array) || normalizedKey.length !== 32) {
    console.error('[KeyMgmt] Refusing to store invalid session key', {
      sessionId,
      keyType: Object.prototype.toString.call(keyUint8Array),
      keyLength: normalizedKey?.length
    });
    return;
  }

  sessionKeyCache.set(sessionId, normalizedKey);

  if (eld.isUnlocked()) {
    try {
      await eld.storeSessionKey(targetUserId, normalizedKey);
      console.log(`[KeyMgmt] Stored session key for ${sessionId}`);
    } catch (err) {
      console.error('[KeyMgmt] Failed to store session key:', err);
    }
  }
};

const getSessionKey = async (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].sort().join('-');

  // Memory first
  if (sessionKeyCache.has(sessionId)) {
    console.log(`[KeyMgmt] Retrieved session key from memory for ${sessionId}`);
    return sessionKeyCache.get(sessionId);
  }

  // Fall back to ELD
  if (eld.isUnlocked()) {
    try {
      const data = await eld.getSessionKey(targetUserId);
      if (data?.sessionKey) {
        sessionKeyCache.set(sessionId, data.sessionKey);
        console.log(`[KeyMgmt] Retrieved session key from ELD for ${sessionId}`);
        return data.sessionKey;
      }
    } catch (err) {
      console.error('[KeyMgmt] Failed to get session key:', err);
    }
  }

  console.log(`[KeyMgmt] No session key found for ${sessionId}`);
  return null;
};

const clearSessionKey = async (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].sort().join('-');
  sessionKeyCache.delete(sessionId);
  ephemeralCache.delete(sessionId);

  if (eld.isUnlocked()) {
    try {
      await eld.deleteSessionKey(targetUserId);
    } catch (err) {
      console.error('[KeyMgmt] Failed to delete session key:', err);
    }
  }
  console.log(`[KeyMgmt] Cleared session key for ${sessionId}`);
};

const clearAllSessionKeys = () => {
  sessionKeyCache.clear();
  ephemeralCache.clear();
  console.log('[KeyMgmt] Cleared all session keys from memory');
};

// ============== IDENTITY KEYS ==============

const getIdentityKeys = async () => {
  if (!eld.isUnlocked()) {
    console.error('[KeyMgmt] Database locked - cannot get identity keys');
    return null;
  }
  return await eld.getIdentityKeys();
};

// ============== EPHEMERAL KEYS ==============

const setEphemeralData = async (userId, targetUserId, data) => {
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

const getEphemeralData = async (userId, targetUserId) => {
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

// ============== MESSAGES ==============

const updateSavedMessages = async (userId, targetUserId, message, setMessages) => {
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

const getSavedMessages = async (userId, targetUserId) => {
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

const updateMessageSeenStatus = async (userId, targetUserId) => {
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

export {
  setSessionKey,
  getSessionKey,
  clearSessionKey,
  clearAllSessionKeys,
  getIdentityKeys,
  setEphemeralData,
  getEphemeralData,
  updateSavedMessages,
  getSavedMessages,
  updateMessageSeenStatus
};
