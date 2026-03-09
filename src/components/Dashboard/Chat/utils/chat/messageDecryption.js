import { base64ToArrayBuffer, arrayBufferToBase64, hexToUint8Array } from "../helpers";
import { setSessionKey, updateSavedMessages, getEphemeralData, setEphemeralData, setOwnEphemeralKeys, deleteOPKPrivateKey, storePeerIdentityKeys } from "./keyManagement";
import { initializeDoubleRatchetResponse, continueDoubleRatchetChain } from "../crypto/dr";
import { buildAadBytes, decryptWithAad } from "../crypto/aes";
import init_dh, { generate_private_ephemeral_key, generate_public_ephemeral_key, diffie_hellman, hkdf_derive } from '@mascaro101/echo-protocol';

import { chain_key_KDF, deriveChainKeys } from "../crypto/hkdf";
import {
  getRootKey, setRootKey, setReceivingChainKey, getReceivingChainKey,
  setSendingChainKey, setCurrentSendingNumber, getCurrentSendingNumber,
  setCurrentReceivingNumber, setPreviousSendingNumber, getCurrentReceivingNumber, setSkippedMessages, getSkippedMessages
} from "./keyManagement";

const INFO_RK = new TextEncoder().encode("EchoProtocol/v1/KDF_RK");

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

    const ephData = await getEphemeralData(userId, targetUserId);

    const currentTargetPublicEphemeralKey =
      ephData?.currentTargetPublicEphemeralKey ?? ephData?.previousTargetPublicEphemeralKey ?? null;
    let knownTargetPublicEphemeralKeys = ephData?.knownTargetPublicEphemeralKeys;
    if (typeof knownTargetPublicEphemeralKeys !== "object" || knownTargetPublicEphemeralKeys == null || Array.isArray(knownTargetPublicEphemeralKeys)) {
      knownTargetPublicEphemeralKeys = {};
    }
    if (currentTargetPublicEphemeralKey) {
      knownTargetPublicEphemeralKeys[currentTargetPublicEphemeralKey] = true;
    }

    console.log("🔑 [Decryption Service] Current receiving DH key:", currentTargetPublicEphemeralKey);
    console.log("🔑 [Decryption Service] Current message ephemeral key:", message.publicEphemeralKey);

    let root_key = await getRootKey(userId, targetUserId);
    let messageKey = null;
    console.log("🔑 TARGET USER ID ", targetUserId);

    const MAX_SKIP = 2000;

    const dh = message.publicEphemeralKey;
    const n = Number(message.sendingNumber ?? 0);
    const pn = Number(message.previousSendingNumber ?? 0);

    let skipped = (await getSkippedMessages(targetUserId)) ?? {};
    if (typeof skipped !== "object" || skipped == null || Array.isArray(skipped)) skipped = {};

    let usedSkippedKey = false;
    const postDecryptActions = [];
    let derivedSendingFromDh = false;

    // Always try skipped message keys first (covers late/out-of-order across DH ratchet steps).
    if (dh && Number.isFinite(n)) {
      const mkB64 = skipped?.[dh]?.[n];
      if (mkB64) {
        usedSkippedKey = true;
        messageKey = base64ToArrayBuffer(mkB64);

        console.log(`🔐 [Decryption Service] Using cached skipped key for dh=${dh} n=${n}`);

        // Only consume skipped keys after successful decrypt.
        postDecryptActions.push(async () => {
          const nextSkipped = { ...skipped };
          const bucket = nextSkipped?.[dh];
          if (bucket && typeof bucket === "object" && !Array.isArray(bucket)) {
            const nextBucket = { ...bucket };
            delete nextBucket[n];
            if (Object.keys(nextBucket).length === 0) {
              delete nextSkipped[dh];
            } else {
              nextSkipped[dh] = nextBucket;
            }
            await setSkippedMessages(targetUserId, nextSkipped);
          }
        });
      }
    }

    if (!root_key) {
      console.log("🔐 [Decryption Service] No existing root key found, storing derived root key");

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));

      await init_dh();
      const privateEphemeralKey = await generate_private_ephemeral_key(randomBytes);
      const publicEphemeralKey = await generate_public_ephemeral_key(privateEphemeralKey);

      const init = await initializeDoubleRatchetResponse(
        socket,
        message,
        targetUserId,
        privateKeyArray
      );
      root_key = init?.root_key ?? null;
      if (init?.peerIdentityToPin) {
        postDecryptActions.push(() =>
          storePeerIdentityKeys(targetUserId, { ...init.peerIdentityToPin, firstSeenAt: Date.now() })
        );
      }

      postDecryptActions.push(() => setRootKey(userId, targetUserId, root_key));
      if (message?.opkId) postDecryptActions.push(() => deleteOPKPrivateKey(message.opkId));

      const { receivingChainKey } = deriveChainKeys(root_key, userId, targetUserId);

      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Invalid sendingNumber: ${message.sendingNumber}`);
      }
      if (n > MAX_SKIP) {
        throw new Error(`Refusing to skip ${n} messages on first receive (MAX_SKIP=${MAX_SKIP})`);
      }

      // Initialize skipped storage for this DH and derive message key at index n.
      if (dh && (!skipped[dh] || typeof skipped[dh] !== "object" || Array.isArray(skipped[dh]))) skipped[dh] = {};

      let ckr = receivingChainKey;
      for (let i = 0; i < n; i++) {
        const material = chain_key_KDF(ckr);
        const mk_i = material.slice(0, 32);
        ckr = material.slice(32);
        if (dh) skipped[dh][i] = arrayBufferToBase64(mk_i);
      }

      const materialN = chain_key_KDF(ckr);
      messageKey = materialN.slice(0, 32);
      const nextReceivingChainKey = materialN.slice(32);

      postDecryptActions.push(() => setReceivingChainKey(userId, targetUserId, nextReceivingChainKey));
      postDecryptActions.push(() => setCurrentReceivingNumber(targetUserId, n + 1));
      postDecryptActions.push(() => setSkippedMessages(targetUserId, skipped));

      console.log("✅ Receiving chain initialized and message key derived for first message");

      const publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);
      postDecryptActions.push(() =>
        setOwnEphemeralKeys(userId, targetUserId, publicEphemeralKeyBase64, arrayBufferToBase64(privateEphemeralKey))
      );
      console.log("✅ Own ephemeral keys stored");

      if (dh) {
        const DH4 = await diffie_hellman(privateEphemeralKey, base64ToArrayBuffer(dh));
        const okm = hkdf_derive(DH4, root_key, INFO_RK, 64);

        const sendingKeyChain = okm.slice(0, 32);
        const newRootKey2 = okm.slice(32);

        postDecryptActions.push(() => setRootKey(userId, targetUserId, newRootKey2));
        root_key = newRootKey2;
        postDecryptActions.push(() => setSendingChainKey(userId, targetUserId, sendingKeyChain));
        derivedSendingFromDh = true;

        let currentSendingNumber = await getCurrentSendingNumber(targetUserId);
        if (currentSendingNumber == null) currentSendingNumber = 0;
        postDecryptActions.push(() => setPreviousSendingNumber(targetUserId, currentSendingNumber));
        postDecryptActions.push(() => setCurrentSendingNumber(targetUserId, 0));
      }
    }
    // If the RECEIVED message has continued the RATCHET, advance the RECEIVING chain.
    else if (!messageKey && dh && dh != currentTargetPublicEphemeralKey) {
      if (dh && knownTargetPublicEphemeralKeys[dh]) {
        console.warn(`⚠️ [Decryption Service] Message for old DH without skipped key dh=${dh} n=${n}; ignoring`);
        return null;
      }

      console.log("⛓️ [Decryption Service] Ratchet advanced - continuing chain");

      let Nr = await getCurrentReceivingNumber(targetUserId);
      if (Nr == null) Nr = 0;

      // 1) Close out OLD receiving chain: derive/store skipped keys Nr..pn-1 (if we have an old DH).
      const oldDh = currentTargetPublicEphemeralKey || null;
      let oldCkr = null;
      if (oldDh) {
        if (!skipped[oldDh] || typeof skipped[oldDh] !== "object" || Array.isArray(skipped[oldDh])) skipped[oldDh] = {};

        oldCkr = await getReceivingChainKey(userId, targetUserId);
        if (!oldCkr) {
          const { receivingChainKey } = deriveChainKeys(root_key, userId, targetUserId);
          oldCkr = receivingChainKey;
        }
      }

      if (!Number.isFinite(pn) || pn < 0) {
        throw new Error(`Invalid previousSendingNumber: ${message.previousSendingNumber}`);
      }
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Invalid sendingNumber: ${message.sendingNumber}`);
      }
      if (pn - Nr > MAX_SKIP || n > MAX_SKIP) {
        throw new Error(`Refusing to skip too many messages (Nr=${Nr}, pn=${pn}, n=${n}, MAX_SKIP=${MAX_SKIP})`);
      }

      if (oldDh && oldCkr) {
        for (let i = Nr; i < pn; i++) {
          const material = chain_key_KDF(oldCkr);
          const mk_i = material.slice(0, 32);
          oldCkr = material.slice(32);

          skipped[oldDh][i] = arrayBufferToBase64(mk_i);
        }
      } else if (pn !== 0) {
        // We don't know the previous DH/chain, so we can't derive skipped keys for pn>0 safely.
        console.warn(`⚠️ [Decryption Service] Missing old DH for pn=${pn}; skipped keys for old chain cannot be derived`);
      }

      // Retrieve the private ephemeral key from ELD and decode
      const currentEphData = await getEphemeralData(userId, targetUserId);
      let privateEphemeralBase64 = currentEphData?.ephPriv;

      const privateEphemeral = base64ToArrayBuffer(privateEphemeralBase64);

      // 2) DH ratchet: derive NEW receiving chain seed + new root key
      const { receivingChainKey: newCkrSeed, newRootKey } = await continueDoubleRatchetChain(
        socket,
        targetUserId,
        message.publicEphemeralKey,
        privateEphemeral,
        root_key
      );

      postDecryptActions.push(() => setRootKey(userId, targetUserId, newRootKey));
      //update local variable for same session use
      root_key = newRootKey;

      // 3) Process message number n on NEW receiving chain (Nr resets to 0 on new chain)
      const newDh = message.publicEphemeralKey;
      if (!skipped[newDh] || typeof skipped[newDh] !== "object" || Array.isArray(skipped[newDh])) skipped[newDh] = {};

      let newCkr = newCkrSeed;

      for (let i = 0; i < n; i++) {
        const material = chain_key_KDF(newCkr);
        const mk_i = material.slice(0, 32);
        newCkr = material.slice(32);

        skipped[newDh][i] = arrayBufferToBase64(mk_i);
      }

      const materialN = chain_key_KDF(newCkr);
      messageKey = materialN.slice(0, 32);
      const nextReceivingChainKey = materialN.slice(32);

      postDecryptActions.push(() => setReceivingChainKey(userId, targetUserId, nextReceivingChainKey));
      postDecryptActions.push(() => setCurrentReceivingNumber(targetUserId, n + 1));
      postDecryptActions.push(() => setSkippedMessages(targetUserId, skipped));

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      await init_dh();
      const newPrivateEph = await generate_private_ephemeral_key(randomBytes);
      const newPublicEph = await generate_public_ephemeral_key(newPrivateEph);
      postDecryptActions.push(() =>
        setOwnEphemeralKeys(
          userId,
          targetUserId,
          arrayBufferToBase64(newPublicEph),
          arrayBufferToBase64(newPrivateEph)
        )
      );

      const DH4 = await diffie_hellman(newPrivateEph, base64ToArrayBuffer(message.publicEphemeralKey));
      const hkdf_expand = hkdf_derive(DH4, newRootKey, INFO_RK, 64);

      const { sendingKeyChain, newRootKey2 } = {
        sendingKeyChain: hkdf_expand.slice(0, 32),
        newRootKey2: hkdf_expand.slice(32)
      };

      postDecryptActions.push(() => setRootKey(userId, targetUserId, newRootKey2));
      root_key = newRootKey2;
      postDecryptActions.push(() => setSendingChainKey(userId, targetUserId, sendingKeyChain));
      derivedSendingFromDh = true;

      let currentSendingNumber = await getCurrentSendingNumber(targetUserId);
      if (currentSendingNumber == null) {
        currentSendingNumber = 0;
      }
      postDecryptActions.push(() => setPreviousSendingNumber(targetUserId, currentSendingNumber));
      postDecryptActions.push(() => setCurrentSendingNumber(targetUserId, 0));
    }
    else {
      console.log("🔐 [Decryption Service] No ratchet advance - deriving message key from existing chain")

      // If we already found a cached skipped key for this (dh, n), don't touch ratchet state.
      if (usedSkippedKey) {
        console.log("🔐 [Decryption Service] Using cached skipped key; not advancing chain/Nr");
      } else {
        let Nr = await getCurrentReceivingNumber(targetUserId);
        if (Nr == null) Nr = 0;

        let receivingChainKey = await getReceivingChainKey(userId, targetUserId);
        if (!receivingChainKey) {
          const { receivingChainKey: derivedReceivingChainKey } = deriveChainKeys(root_key, userId, targetUserId);
          receivingChainKey = derivedReceivingChainKey;
        }

        if (!Number.isFinite(n) || n < 0) {
          throw new Error(`Invalid sendingNumber: ${message.sendingNumber}`);
        }

        // 1) Late/duplicate: n < Nr. If we didn't find a skipped key earlier, treat as duplicate/unrecoverable.
        if (n < Nr) {
          console.warn(`⚠️ [Decryption Service] Duplicate/late message (n=${n} < Nr=${Nr}); ignoring`);
          return null;
        }

        if (n - Nr > MAX_SKIP) {
          throw new Error(`Refusing to skip ${n - Nr} messages (MAX_SKIP=${MAX_SKIP})`);
        }

        // Ensure we have a JSON-safe container for skipped message keys for this DH chain.
        // (Defensive: avoids crashes if storage was corrupted or returned an unexpected type.)
        let skippedBucket = null;
        if (dh) {
          const existing = skipped[dh];
          if (existing && typeof existing === "object" && !Array.isArray(existing)) {
            skippedBucket = existing;
          } else {
            skippedBucket = {};
            skipped[dh] = skippedBucket;
          }
        }

        // 2) Future/out-of-order: derive and cache Nr..n-1
        for (let i = Nr; i < n; i++) {
          const material = chain_key_KDF(receivingChainKey);
          const mk_i = material.slice(0, 32);
          receivingChainKey = material.slice(32); // advance chain

          if (skippedBucket) skippedBucket[i] = arrayBufferToBase64(mk_i); // JSON-safe
        }

        // 3) Derive key for n
        const materialN = chain_key_KDF(receivingChainKey);
        messageKey = materialN.slice(0, 32);
        const nextChainKey = materialN.slice(32);

        postDecryptActions.push(() => setReceivingChainKey(userId, targetUserId, nextChainKey));
        postDecryptActions.push(() => setCurrentReceivingNumber(targetUserId, n + 1));
        postDecryptActions.push(() => setSkippedMessages(targetUserId, skipped));
      }
    }

    // Verify we got a key
    if (!root_key && !usedSkippedKey) {
      console.error("❌ [Decryption Service] Failed to derive key for incoming message");
      throw new Error("Failed to derive decryption key");
    }
    if (!messageKey) {
      console.warn("⚠️ [Decryption Service] No message key derived; ignoring message");
      return null;
    }

    console.log("✅ [Decryption Service] Derived key obtained, decrypting...");

    // IMMEDIATELY decrypt the message using the derived key
    const aadBytes = buildAadBytes({
      userId: message.userId,
      targetUserId: message.targetUserId,
      publicEphemeralKey: message.publicEphemeralKey,
      sendingNumber: message.sendingNumber,
      previousSendingNumber: message.previousSendingNumber,
      spkId: message.spkId,
      opkId: message.opkId,
    });

    const decryptedPayloadStr = await decryptWithAad(message.payload, messageKey, nonce, aadBytes);
    const decryptedPayload = JSON.parse(decryptedPayloadStr);
    const decryptedMessage = {
      ...message,
      text: decryptedPayload.text,
      image: decryptedPayload.image,
    };

    console.log("✅ [Decryption Service] Message decrypted:", decryptedMessage.text);

    // Commit ratchet state only after successful decrypt (prevents desync on tampered ciphertext).
    for (const action of postDecryptActions) {
      // eslint-disable-next-line no-await-in-loop
      await action();
    }

    // Only update the "current receiving DH" when we actually processed a message on that chain.
    // If we decrypted using a skipped key from an older chain, do NOT move DHr backwards.
    if (dh) {
      const existingEphData = await getEphemeralData(userId, targetUserId) || {};
      const existingKnown = existingEphData?.knownTargetPublicEphemeralKeys;
      const nextKnown =
        (typeof existingKnown === "object" && existingKnown != null && !Array.isArray(existingKnown))
          ? { ...existingKnown, [dh]: true }
          : { [dh]: true };

      await setEphemeralData(userId, targetUserId, {
        ...existingEphData,
        knownTargetPublicEphemeralKeys: nextKnown,
        ...(usedSkippedKey ? {} : {
          currentTargetPublicEphemeralKey: dh,
          // Back-compat (older code reads this)
          previousTargetPublicEphemeralKey: dh,
          ...(derivedSendingFromDh ? { lastSendingKdfDh: dh } : {})
        })
      });
    }

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

    // Surface identity key changes to the UI so the user can decide whether to trust the new key.
    if (error?.code === "PEER_IDENTITY_CHANGED") {
      try {
        window.dispatchEvent(new CustomEvent("peerIdentityChanged", {
          detail: {
            peerId: String(error.peerId ?? targetUserId ?? ""),
            savedPeer: error.savedPeer ?? null,
            fetchedPeer: error.fetchedPeer ?? null,
          }
        }));
      } catch { }
    }
    throw error;
  }
};
