import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { getSocket } from "../../../socket";
import PropTypes from "prop-types";
import SendText from "./MessageInput/sendText";
import DisplayText from "./MessageDisplay/displayText";
import {
  getWallpaperComponent,
  getWallpaperClasses,
} from "../DashboardComponents/utils/wallpaper";
// Utility functions for encoding and decoding
import {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  hexToUint8Array,
} from "./utils/helpers";

// API functions for fetching messages and checking the first message
import { fetchLatestMessageNumber, checkFirstMessage } from "./utils/api";

// Key management functions for session keys
import {
  updateSavedMessages,
  getIdentityKeys,
  getSavedMessages,
  updateMessageSeenStatus,
  storePeerIdentityKeys,
} from "./utils/chat/keyManagement";

import { encryptOutgoingMessage } from "./utils/chat/messageEncryption";

// Main chat component
function Chat({ token: tokenProp, activeChat, currentWallpaper = "default" }) {
  // Use shared socket connection
  const socket = getSocket();

  // Allow Chat to be rendered from different routes/layouts.
  // If a parent does not pass a token prop, fall back to localStorage.
  const token = tokenProp ?? localStorage.getItem("token") ?? "";

  // Extract userId and targetUserId from the token and activeChat
  const userId = token ? jwtDecode(token).id : "";
  const targetUserId = activeChat;
  const username = token ? jwtDecode(token).username : "";
  const [messages, setMessages] = useState([]);
  const [privateKeyArray, setPrivateKeyArray] = useState(null);
  const [sendBlocked, setSendBlocked] = useState(false);
  const [sendBlockedReason, setSendBlockedReason] = useState("");
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const previousMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Reset on chat switch.
    setSendBlocked(false);
    setSendBlockedReason("");

    const onPeerIdentityChanged = (event) => {
      const peerId = String(event?.detail?.peerId ?? "");
      if (!peerId) return;
      if (peerId !== String(targetUserId ?? "")) return;

      setSendBlocked(true);
      setSendBlockedReason("Peer identity key changed. Verify this contact before sending.");
    };

    window.addEventListener("peerIdentityChanged", onPeerIdentityChanged);
    return () => window.removeEventListener("peerIdentityChanged", onPeerIdentityChanged);
  }, [targetUserId]);

  // Load private key from ELD on mount
  useEffect(() => {
    const loadPrivateKey = async () => {
      const keys = await getIdentityKeys();
      if (keys?.privateKeyX25519) {
        setPrivateKeyArray(base64ToArrayBuffer(keys.privateKeyX25519));
        console.log("[Chat] Loaded private key from ELD");
      } else {
        console.error("[Chat] No private key available in ELD");
      }
    };
    loadPrivateKey();
  }, []);

  // Reset scroll refs when switching chats so the new chat starts at the bottom instantly
  useEffect(() => {
    isInitialLoadRef.current = true;
    previousMessageCountRef.current = 0;
  }, [targetUserId]);

  // useEffect to handle the socket connection and message fetching
  useEffect(() => {
    // Check if userId and targetUserId are valid 
    if (!userId || !targetUserId) return;
    console.log(
      `🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`
    );

    // Load previously decrypted messages from ELD
    const loadSavedMessages = async () => {
      try {
        const savedMessages = await getSavedMessages(userId, targetUserId);
        if (savedMessages.length > 0) {
          console.log(`📂 Loaded ${savedMessages.length} messages from ELD`);
          setMessages(savedMessages);
        } else {
          console.log('📂 No saved messages found, starting fresh');
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading saved messages:', error);
        setMessages([]);
      }
    };
    loadSavedMessages();

    // Handle incoming chat messages in real-time
    const handleChatMessage = async (payload) => {
      // Check if the payload is an array or a single message
      const messages = Array.isArray(payload) ? payload : [payload];

      // Process each message one by one from the payload
      for (const message of messages) {
        const nonce = base64ToArrayBuffer(message.nonce);
        // Handle call event messages with special logic (check if user is involved)
        if (message.messageType === 'call_event') {
          const isInvolvedInCall =
            message.callData?.callerId === userId ||
            message.callData?.receiverId === userId;

          const isRelevantToActiveChat =
            (message.callData?.callerId === activeChat && message.callData?.receiverId === userId) ||
            (message.callData?.receiverId === activeChat && message.callData?.callerId === userId);

          if (isInvolvedInCall && isRelevantToActiveChat) {
            console.log("📞 Received call event message:", {
              callId: message.callData?.callId,
              caller: message.callData?.callerId,
              receiver: message.callData?.receiverId,
              currentUser: userId,
              activeChat: activeChat
            });

            // Save call event to localStorage
            updateSavedMessages(userId, activeChat, message, setMessages);
          }
          continue;
        }

        // If message is from user or to the user process
        if (message.userId == activeChat || message.userId == userId) {
          try {

            console.log("📩 Received real-time message:", message);

            // Check if the message is for the active chat
            const sender = String(message.userId);
            if (activeChat === sender) {
              socket.emit("messageSeen", { userId, targetUserId });
            }
            if (message.userId == userId) {
              continue;
            }

            // Dashboard handles decryption — Chat reloads via localStorageUpdated event
          } catch (err) {
            console.error("❌ Error handling message:", err, message);
            continue;
          }
        } else {
          console.log(
            "Message targetUserId: ",
            message.userId,
            "does not match activeChat: ",
            activeChat
          );
        }
      }
    };

    // Listen for read receipt updates, filtered to this chat
    const handleSeenUpdate = async ({ userId: seenByUserId, targetUserId: seenForUserId }) => {
      if (seenForUserId === userId && seenByUserId === targetUserId) {
        console.log("👀", seenForUserId, "Message seen by:", seenByUserId);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.userId === userId ? { ...msg, seenStatus: true } : msg
          )
        );

        // Also update ELD so messages have correct seenStatus
        try {
          await updateMessageSeenStatus(userId, targetUserId);
        } catch (e) {
          console.error('Error updating seen status in ELD:', e);
        }
      }
    };

    // Listen for Dashboard completing decryption + ELD save
    const handleEldUpdate = async (event) => {
      const { userId: updatedUserId, targetUserId: updatedTargetUserId } = event.detail;
      if (
        (updatedUserId === userId && updatedTargetUserId === targetUserId) ||
        (updatedUserId === targetUserId && updatedTargetUserId === userId)
      ) {
        const savedMessages = await getSavedMessages(userId, targetUserId);
        setMessages(savedMessages);
      }
    };

    window.addEventListener('localStorageUpdated', handleEldUpdate);

    // Register listeners at effect scope
    socket.on("newMessage", handleChatMessage);
    socket.on("messageSeenUpdate", handleSeenUpdate);

    // Async init (fetch message number, emit ready)
    const initChat = async () => {
      const latestMessageNumber = await fetchLatestMessageNumber(
        socket,
        userId,
        targetUserId
      );
      console.log("📩 Latest message number:", latestMessageNumber);
      socket.emit("ready", { userId, targetUserId });
    };
    initChat();

    // Cleanup removes the exact handlers registered above
    return () => {
      console.log(
        `🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`
      );
      socket.off("newMessage", handleChatMessage);
      socket.off("messageSeenUpdate", handleSeenUpdate);
      window.removeEventListener('localStorageUpdated', handleEldUpdate);
      console.log("✅ Chat cleanup complete (session keys preserved for ratchet continuity)");
    };
  }, [userId, targetUserId]);

  // Send message function
  const sendMessage = async (text, imageData = null) => {
    if (sendBlocked) {
      throw new Error(sendBlockedReason || "Sending is blocked");
    }

    const ensurePrivateKey = async () => {
      if (privateKeyArray instanceof Uint8Array) return privateKeyArray;
      const keys = await getIdentityKeys();
      if (keys?.privateKeyX25519) {
        const loaded = base64ToArrayBuffer(keys.privateKeyX25519);
        setPrivateKeyArray(loaded);
        console.log("[Chat] Lazy-loaded private key from ELD");
        return loaded;
      }
      throw new Error("No private key available in ELD");
    };

    const privateKey = await ensurePrivateKey();

    let outgoing;
    try {
      outgoing = await encryptOutgoingMessage({
        text,
        imageData,
        userId,
        targetUserId,
        username,
        socket,
        privateKeyArray: privateKey,
      });
    } catch (err) {
      if (err?.code === "PEER_IDENTITY_CHANGED") {
        setSendBlocked(true);
        setSendBlockedReason("Peer identity key changed. Verify this contact before sending.");
      }
      throw err;
    }

    // Save the peer IK on the sender side the first time we fetch it (TOFU),
    // but only after we successfully send a message that used that identity.
    socket.emit("newMessage", outgoing, (ack) => {
      if (!ack?.success) return;
      if (!outgoing?.peerIdentityToPin) return;
      storePeerIdentityKeys(targetUserId, { ...outgoing.peerIdentityToPin, firstSeenAt: Date.now() });
    });


    await updateSavedMessages(userId, targetUserId, {
      _id: crypto.randomUUID(),
      userId,
      targetUserId,
      username,
      text: text || '',
      image: imageData || null,
      seenStatus: false,
      createdAt: new Date().toISOString(),
    }, setMessages);
    return;
  };

  useEffect(() => {
    const messageCountIncreased = messages.length > previousMessageCountRef.current;

    if (autoScroll && messageCountIncreased && messagesEndRef.current) {
      const behavior = isInitialLoadRef.current ? "instant" : "smooth";
      messagesEndRef.current.scrollIntoView({ behavior });
      isInitialLoadRef.current = false;
    }

    // Update the previous message count
    previousMessageCountRef.current = messages.length;
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;

      setAutoScroll(isNearBottom);
    }
  };

    return (
    <div className="app-container h-full flex flex-col">

      <div className="chat-container flex-1 flex flex-col relative overflow-y-auto">
        <div
          ref={messagesContainerRef}
          className={`messages-container flex-1 relative ${getWallpaperClasses(
            currentWallpaper
          )}`}
          onScroll={handleScroll}
        >
          {getWallpaperComponent(currentWallpaper)}

          <div className="relative z-10 h-full flex flex-col">
            <DisplayText
              messages={messages}
              currentUserId={userId}
              wallpaperType={currentWallpaper}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      {sendBlocked && (
        <div className="px-4 py-2 text-sm bg-red-950/70 text-red-100 border-t border-red-900">
          {sendBlockedReason || "Sending is blocked due to a safety warning."}
        </div>
      )}
      <SendText sendMessage={sendMessage} disabled={sendBlocked} disabledReason={sendBlockedReason} />
    </div>
  );
};

Chat.propTypes = {
  token: PropTypes.string,
  activeChat: PropTypes.string.isRequired,
};

export default Chat;
