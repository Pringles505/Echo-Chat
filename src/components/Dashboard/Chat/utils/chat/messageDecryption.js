// Shared message decryption service
// Handles Double Ratchet decryption for both foreground (Chat) and background (Dashboard) messages

import { base64ToArrayBuffer, arrayBufferToBase64, hexToUint8Array } from "../helpers";
import { getSessionKey, setSessionKey, updateSavedMessages, getEphemeralData, setEphemeralData } from "./keyManagement";
import { initializeDoubleRatchetResponse, continueDoubleRatchetChain } from "../crypto/dr";
import { decrypt } from "../crypto/aes";

// Secret key and nonce for encryption
const nonce = "000102030405060708090a0b";
const nonceArray = hexToUint8Array(nonce);

/**
 * Decrypt an incoming message using the Double Ratchet protocol
 * This function can be used by both Chat (foreground) and Dashboard (background)
 *
 * @param {Object} message - The encrypted message object
 * @param {string} userId - Current user's ID
 * @param {string} targetUserId - Target user's ID (sender of the message)
 * @param {Uint8Array} privateKeyArray - User's X25519 private key
 * @param {Object} socket - Socket.IO connection
 * @param {Function} setMessages - Optional setState function (for Chat component)
 * @returns {Object} - Decrypted message object
 */
export const decryptIncomingMessage = async (
  message,
  userId,
  targetUserId,
  privateKeyArray,
  socket,
  setMessages = null
) => {
  try {
    console.log(`🔐 [Decryption Service] Processing message from ${targetUserId}`);

    // Retrieve the previous target public ephemeral key from ELD if it exists
    // IMPORTANT: Use session-specific key to avoid conflicts between different chats
    const sessionId = [userId, targetUserId].sort().join('-');
    const ephData = await getEphemeralData(userId, targetUserId);
    const previousTargetPublicEphemeralKey = ephData?.previousTargetPublicEphemeralKey || null;

    console.log("🔑 [Decryption Service] Previous ephemeral key:", previousTargetPublicEphemeralKey);
    console.log("🔑 [Decryption Service] Current message ephemeral key:", message.publicEphemeralKey);

    // Initialize the derived root key
    let derived_rootKey = null;

    // If the RECEIVED message is initial, initialize double ratchet RESPONSE
    if (message.is_initial === true) {
      console.log("🆕 [Decryption Service] Initial message - initializing Double Ratchet response");
      derived_rootKey = await initializeDoubleRatchetResponse(
        socket,
        message,
        userId,
        targetUserId,
        privateKeyArray
      );
    }
    // If the RECEIVED message has continued the RATCHET, advance the RECEIVING chain
    else if (message.publicEphemeralKey != previousTargetPublicEphemeralKey) {
      console.log("⛓️ [Decryption Service] Ratchet advanced - continuing chain");

      // Retrieve the private ephemeral key from ELD and decode
      const currentEphData = await getEphemeralData(userId, targetUserId);
      const privateEphemeralBase64 = currentEphData?.ephPriv;
      if (!privateEphemeralBase64) {
        throw new Error("Missing private ephemeral key (ephPriv) for ratchet continuation");
      }
      const privateEphemeral = base64ToArrayBuffer(privateEphemeralBase64);

      derived_rootKey = await continueDoubleRatchetChain(
        socket,
        targetUserId,
        message.publicEphemeralKey,
        privateEphemeral
      );
    }
    // If the RECEIVED message has NOT continued the RATCHET, use the current session key
    else {
      console.log("🔑 [Decryption Service] Using existing session key");
      derived_rootKey = await getSessionKey(userId, targetUserId);
    }

    // Verify we got a key
    if (!derived_rootKey) {
      console.error("❌ [Decryption Service] Failed to derive key for incoming message");
      throw new Error("Failed to derive decryption key");
    }

    console.log("✅ [Decryption Service] Derived key obtained, decrypting...");

    // IMMEDIATELY decrypt the message using the derived key
    const decryptedPayloadStr = await decrypt(message.payload, derived_rootKey, nonceArray);
    const decryptedPayload = JSON.parse(decryptedPayloadStr);
    const decryptedMessage = {
      ...message,
      text: decryptedPayload.text,
      image: decryptedPayload.image,
    };

    console.log("✅ [Decryption Service] Message decrypted:", decryptedMessage.text);

    // Store the target public ephemeral key for future ratchet continuation
    // IMPORTANT: Use session-specific key to avoid conflicts between different chats
    const targetPublicEphemeralKeyBase64 = message.publicEphemeralKey;
    const existingEphData = await getEphemeralData(userId, targetUserId) || {};
    await setEphemeralData(userId, targetUserId, {
      ...existingEphData,
      previousTargetPublicEphemeralKey: targetPublicEphemeralKeyBase64
    });

    // Save the DECRYPTED message to local storage
    // If setMessages is provided (foreground mode), update state
    // If not provided (background mode), just save to localStorage
    updateSavedMessages(
      userId,
      targetUserId,
      decryptedMessage,
      setMessages || (() => {}) // Provide no-op function for background mode
    );

    // Save the derived key temporarily for potential next message in same session
    setSessionKey(userId, targetUserId, derived_rootKey);

    console.log("✅ [Decryption Service] Message saved and key stored in session");

    return decryptedMessage;
  } catch (error) {
    console.error("❌ [Decryption Service] Error decrypting message:", error);
    throw error;
  }
};

/**
 * Decrypt own message (echo from server)
 * Used when receiving our own sent message back from the server
 *
 * @param {Object} message - The encrypted message object
 * @param {string} userId - Current user's ID
 * @param {string} targetUserId - Target user's ID (recipient of the message)
 * @param {Function} setMessages - Optional setState function (for Chat component)
 * @returns {Object} - Decrypted message object
 */
export const decryptOwnMessage = async (
  message,
  userId,
  targetUserId,
  setMessages = null
) => {
  try {
    console.log("📩 [Decryption Service] Decrypting own message (echo)");

    // Get ephemeral key from memory (saved when we sent the message)
    const derivedKey = await getSessionKey(userId, targetUserId);

    // Error out in case no key is found
    if (!derivedKey) {
      console.error(`❌ [Decryption Service] No ephemeral key found for self message`);
      throw new Error("No session key found for own message");
    }

    // Decrypt the message text using the derived key
    const decryptedPayloadStr = await decrypt(message.payload, derivedKey, nonceArray);
    const decryptedPayload = JSON.parse(decryptedPayloadStr);
    const decryptedMessage = {
      ...message,
      text: decryptedPayload.text,
      image: decryptedPayload.image,
    };

    console.log("✅ [Decryption Service] Own message decrypted:", decryptedMessage.text);

    // Update the saved messages with the decrypted message
    updateSavedMessages(
      userId,
      targetUserId,
      decryptedMessage,
      setMessages || (() => {})
    );

    return decryptedMessage;
  } catch (error) {
    console.error("❌ [Decryption Service] Error decrypting own message:", error);
    throw error;
  }
};
