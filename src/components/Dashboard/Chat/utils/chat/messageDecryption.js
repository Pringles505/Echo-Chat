// Shared message decryption service
// Handles Double Ratchet decryption for both foreground (Chat) and background (Dashboard) messages

import { base64ToArrayBuffer, arrayBufferToBase64, hexToUint8Array } from "../helpers";
import { getSessionKey, setSessionKey, updateSavedMessages, getEphemeralData, setEphemeralData, setOwnEphemeralKeys } from "./keyManagement";
import { initializeDoubleRatchetResponse, continueDoubleRatchetChain } from "../crypto/dr";
import { decrypt } from "../crypto/aes";
import init_dh, { generate_private_ephemeral_key, generate_public_ephemeral_key, diffie_hellman, hkdf_derive } from "dh-wasm";

import { chain_key_KDF, deriveChainKeys  } from "../crypto/hkdf";
import { getRootKey, setRootKey, setReceivingChainKey, getReceivingChainKey, setSendingChainKey } from "./keyManagement";

export const decryptIncomingMessage = async (
  message,
  nonce,
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


    let root_key = await getRootKey(userId, targetUserId);
    let messageKey = null;
    console.log("🔑 TARGET USER ID ", targetUserId);

    if (!root_key) {
      console.log("🔐 [Decryption Service] No existing root key found, storing derived root key");

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));

      await init_dh();
      const privateEphemeralKey = await generate_private_ephemeral_key(randomBytes);
      const publicEphemeralKey = await generate_public_ephemeral_key(privateEphemeralKey);

      root_key = await initializeDoubleRatchetResponse(
        socket,
        message,
        targetUserId,
        privateKeyArray
      );

      await setRootKey(userId, targetUserId, root_key);

      const { receivingChainKey } = deriveChainKeys(root_key, userId, targetUserId);

      const chain_key_material = chain_key_KDF(receivingChainKey);
      messageKey = chain_key_material.slice(0, 32);
      const newChainKey = chain_key_material.slice(32);

      await setReceivingChainKey(userId, targetUserId, newChainKey);

      console.log("✅ Receiving chain initialized and message key derived for first message");

      const publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);
      await setOwnEphemeralKeys(userId, targetUserId, publicEphemeralKeyBase64, arrayBufferToBase64(privateEphemeralKey));
      console.log("✅ Own ephemeral keys stored");
    }
    // If the RECEIVED message has continued the RATCHET, advance the RECEIVING chain
    else if (message.publicEphemeralKey != previousTargetPublicEphemeralKey && previousTargetPublicEphemeralKey) {
      console.log("⛓️ [Decryption Service] Ratchet advanced - continuing chain");

      // Retrieve the private ephemeral key from ELD and decode
      const currentEphData = await getEphemeralData(userId, targetUserId);
      let privateEphemeralBase64 = currentEphData?.ephPriv;

      const privateEphemeral = base64ToArrayBuffer(privateEphemeralBase64);

      const { receivingChainKey, newRootKey } = await continueDoubleRatchetChain(
        socket,
        targetUserId,
        message.publicEphemeralKey,
        privateEphemeral,
        root_key
      );

      await setRootKey(userId, targetUserId, newRootKey);
      //update local variable for same session use
      root_key = newRootKey;

      const chain_key_material = chain_key_KDF(receivingChainKey);
      messageKey = chain_key_material.slice(0, 32);
      const nextReceivingChainKey = chain_key_material.slice(32);

      await setReceivingChainKey(userId, targetUserId, nextReceivingChainKey);

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      await init_dh();
      const newPrivateEph = await generate_private_ephemeral_key(randomBytes);
      const newPublicEph = await generate_public_ephemeral_key(newPrivateEph);
      await setOwnEphemeralKeys(userId, targetUserId, arrayBufferToBase64(newPublicEph), arrayBufferToBase64(newPrivateEph));

      const INFO_RK = new TextEncoder().encode('EchoProtocol/v1/KDF_RK');

      const DH4 = await diffie_hellman(newPrivateEph, base64ToArrayBuffer(message.publicEphemeralKey));
      const hkdf_expand = hkdf_derive(DH4, newRootKey, INFO_RK, 64);

      const { sendingKeyChain, newRootKey2 } = {
        sendingKeyChain: hkdf_expand.slice(0, 32),
        newRootKey2: hkdf_expand.slice(32)
      };

      await setRootKey(userId, targetUserId, newRootKey2);
      root_key = newRootKey2;
      await setSendingChainKey(userId, targetUserId, sendingKeyChain);
    }
    else {
      console.log("🔐 [Decryption Service] No ratchet advance - deriving message key from existing chain")
      let receivingChainKey = await getReceivingChainKey(userId, targetUserId);
      if (!receivingChainKey) {
        const { receivingChainKey: derivedReceivingChainKey } = deriveChainKeys(root_key, userId, targetUserId);
        receivingChainKey = derivedReceivingChainKey;
      }

      const chain_key_material = chain_key_KDF(receivingChainKey);
      messageKey = chain_key_material.slice(0, 32);
      const newChainKey = chain_key_material.slice(32);

      await setReceivingChainKey(userId, targetUserId, newChainKey);
    }

    // Verify we got a key
    if (!root_key) {
      console.error("❌ [Decryption Service] Failed to derive key for incoming message");
      throw new Error("Failed to derive decryption key");
    }

    console.log("✅ [Decryption Service] Derived key obtained, decrypting...");

    // IMMEDIATELY decrypt the message using the derived key
    const decryptedPayloadStr = await decrypt(message.payload, messageKey, nonce);
    const decryptedPayload = JSON.parse(decryptedPayloadStr);
    const decryptedMessage = {
      ...message,
      text: decryptedPayload.text,
      image: decryptedPayload.image,
    };

    console.log("✅ [Decryption Service] Message decrypted:", decryptedMessage.text);

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
      setMessages || (() => { }) // Provide no-op function for background mode
    );



    // Save the derived key temporarily for potential next message in same session
    setSessionKey(userId, targetUserId, root_key);

    console.log("✅ [Decryption Service] Message saved and key stored in session");

    return decryptedMessage;
  } catch (error) {
    console.error("❌ [Decryption Service] Error decrypting message:", error);
    throw error;
  }
};
