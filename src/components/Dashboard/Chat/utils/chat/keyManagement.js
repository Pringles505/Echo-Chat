// Hybrid key storage:
// - In-memory for active session (fast access)
// - localStorage for persistence across page refreshes (Double Ratchet requirement)
// - All keys cleared on logout for security
const sessionKeys = new Map(); // Map<sessionId, currentKey>

/**
 * Store a key in both memory (for fast access) and localStorage (for persistence)
 * Keys persist across page refreshes but are cleared on logout
 */
const setSessionKey = (userId, targetUserId, keyUint8Array) => {
  const sessionId = [userId, targetUserId].sort().join('-');

  // Store in memory for fast access
  sessionKeys.set(sessionId, keyUint8Array);

  // Store in localStorage for persistence (Base64 encoded)
  const keyBase64 = btoa(String.fromCharCode.apply(null, keyUint8Array));
  localStorage.setItem(`ratchetKey-${sessionId}`, keyBase64);

  console.log(`🔑 Set session key for ${sessionId} (memory + localStorage)`);
};

/**
 * Get the current session key from memory or localStorage
 * Returns null if no key exists
 */
const getSessionKey = (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].sort().join('-');

  // Try memory first (fastest)
  let key = sessionKeys.get(sessionId);
  if (key) {
    console.log(`🔑 Retrieved session key from memory for ${sessionId}`);
    return key;
  }

  // Fall back to localStorage
  const keyBase64 = localStorage.getItem(`ratchetKey-${sessionId}`);
  if (keyBase64) {
    // Decode from Base64 to Uint8Array
    const keyString = atob(keyBase64);
    key = new Uint8Array(keyString.length);
    for (let i = 0; i < keyString.length; i++) {
      key[i] = keyString.charCodeAt(i);
    }

    // Cache in memory for subsequent accesses
    sessionKeys.set(sessionId, key);
    console.log(`🔑 Retrieved session key from localStorage for ${sessionId}`);
    return key;
  }

  console.log(`⚠️ No session key found for ${sessionId}`);
  return null;
};

/**
 * Clear the session key from both memory and localStorage
 * Call this when switching chats or on component unmount
 */
const clearSessionKey = (userId, targetUserId) => {
  const sessionId = [userId, targetUserId].sort().join('-');
  sessionKeys.delete(sessionId);
  localStorage.removeItem(`ratchetKey-${sessionId}`);
  console.log(`🗑️ Cleared session key for ${sessionId}`);
};

/**
 * Clear all session keys from both memory and localStorage
 * Call this on logout or app close
 */
const clearAllSessionKeys = () => {
  // Clear memory
  sessionKeys.clear();

  // Clear all ratchetKey entries from localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ratchetKey-')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log(`🗑️ Cleared all session keys (${keysToRemove.length} from localStorage)`);
};

/**
 * Update saved messages in localStorage
 * Messages are stored in DECRYPTED form for display
 */
const updateSavedMessages = (userId, targetUserId, message, setMessages) => {
  console.log('📂 Updating saved messages');
  console.log('📂 Saved message:', message);

  const savedSessionKey = `chatSession-${userId}-${targetUserId}`;
  const savedSession = localStorage.getItem(savedSessionKey);
  let savedMessages = [];

  if (savedSession) {
    const parsedSession = JSON.parse(savedSession);
    savedMessages = parsedSession.savedMessages || [];

    if (savedMessages.some(msg => msg._id === message._id)) {
      console.log('⚠️ Duplicate message ignored:', message._id);
      return;
    }
  }

  savedMessages.push(message);
  const updatedSession = {
    savedMessages,
  };
  localStorage.setItem(savedSessionKey, JSON.stringify(updatedSession));

  // Dispatch custom event with message details so ConversationItem can update preview
  window.dispatchEvent(new CustomEvent('localStorageUpdated', {
    detail: {
      userId,
      targetUserId,
      latestMessage: message.text,
      timestamp: message.timestamp || message.createdAt
    }
  }));
  console.log('📂 Updated saved messages:', savedMessages);
  console.log('📂 Latest message text:', message.text);

  setMessages(savedMessages);
};

export {
  setSessionKey,
  getSessionKey,
  clearSessionKey,
  clearAllSessionKeys,
  updateSavedMessages
};
