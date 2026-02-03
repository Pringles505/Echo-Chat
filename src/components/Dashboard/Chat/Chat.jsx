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
  setSessionKey,
  getSessionKey,
  updateSavedMessages,
} from "./utils/chat/keyManagement";

// Double Ratchet Rust module
import {
  initializeDoubleRatchet,
  continueDoubleRatchetChain,
} from "./utils/crypto/dr";

// Diffie-Hellman Rust Module
import init_dh, {
  generate_private_ephemeral_key,
  generate_public_ephemeral_key,
} from "dh-wasm";

// AES Encryption primitives
import { encrypt } from "./utils/crypto/aes";

// Shared message decryption service
import { decryptIncomingMessage, decryptOwnMessage } from "./utils/chat/messageDecryption";

// Secret key and nonce for encryption
const nonce = "000102030405060708090a0b";

// Convert the nonce from hex to byteArray
const nonceArray = hexToUint8Array(nonce);

// For the purposes of this project, for now, keys and sensitive data are stored in local storage
// In production use this should be an encrypted local database

// Main chat component
function Chat({ token, activeChat, currentWallpaper = "default" }) {
  // Use shared socket connection
  const socket = getSocket();

  // Extract the private key from localstorage and convert it to a ByteArray
  const storedPrivateKey = localStorage.getItem("privateKeyX25519");
  const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

  // Extract userId and targetUserId from the token and activeChat
  const userId = token ? jwtDecode(token).id : "";
  const targetUserId = activeChat;
  const username = token ? jwtDecode(token).username : "";
  const [messages, setMessages] = useState([]);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const previousMessageCountRef = useRef(0);
  const chatMessageHandlerRef = useRef(null);
  const seenUpdateHandlerRef = useRef(null);

  // useEffect to handle the socket connection and message fetching
  useEffect(() => {
    // Check if userId and targetUserId are valid
    if (!userId || !targetUserId) return;
    console.log(
      `🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`
    );

    // Load previously decrypted messages from localStorage
    const savedSessionKey = `chatSession-${userId}-${targetUserId}`;
    const savedSession = localStorage.getItem(savedSessionKey);

    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        const savedMessages = parsedSession.savedMessages || [];
        console.log(`📂 Loaded ${savedMessages.length} previously decrypted messages from storage`);
        setMessages(savedMessages);
      } catch (error) {
        console.error('Error loading saved messages:', error);
        setMessages([]);
      }
    } else {
      console.log('📂 No saved messages found, starting fresh');
      setMessages([]);
    }

    // initialize the chat by fetching the latest message number and setting up real-time message handling
    const initChat = async () => {
      // Fetch the latest message number
      const latestMessageNumber = await fetchLatestMessageNumber(
        socket,
        userId,
        targetUserId
      );
      console.log("📩 Latest message number:", latestMessageNumber);

      // Initialize the socket connection and emit the 'ready' event
      socket.emit("ready", { userId, targetUserId });

      // Handle incoming chat messages in real-time
      const handleChatMessage = async (payload) => {
        // Check if the payload is an array or a single message
        const messages = Array.isArray(payload) ? payload : [payload];

        // Process each message one by one from the payload
        for (const message of messages) {
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

              // Process own messages differently
              if (message.userId === userId) {
                try {
                  await decryptOwnMessage(
                    message,
                    userId,
                    targetUserId,
                    setMessages
                  );
                } catch (error) {
                  console.error("❌ Error decrypting own message:", error);
                }
                continue;
              }
              console.log("📩 Received real-time message:", message);

              // Check if the message is for the active chat
              const sender = String(message.userId);
              if (activeChat === sender) {
                socket.emit("messageSeen", { userId, targetUserId });
              }

              // Use shared decryption service
              try {
                await decryptIncomingMessage(
                  message,
                  userId,
                  targetUserId,
                  privateKeyArray,
                  socket,
                  setMessages
                );
              } catch (error) {
                console.error("❌ Error decrypting incoming message:", error);
              }
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

      // Store handler ref so cleanup removes only this listener
      chatMessageHandlerRef.current = handleChatMessage;

      // Listen for incoming messages and initial messages
      socket.on("newMessage", handleChatMessage);

      // Listen for read receipt updates, filtered to this chat
      const handleSeenUpdate = ({ userId: seenByUserId, targetUserId: seenForUserId }) => {
        if (seenForUserId === userId && seenByUserId === targetUserId) {
          console.log("👀", seenForUserId, "Message seen by:", seenByUserId);
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.userId === userId ? { ...msg, seenStatus: true } : msg
            )
          );

          // Also update localStorage so updateSavedMessages doesn't
          // overwrite React state with stale seenStatus values
          const savedSessionKey = `chatSession-${userId}-${targetUserId}`;
          const savedSession = localStorage.getItem(savedSessionKey);
          if (savedSession) {
            try {
              const parsedSession = JSON.parse(savedSession);
              const savedMessages = (parsedSession.savedMessages || []).map((msg) =>
                msg.userId === userId ? { ...msg, seenStatus: true } : msg
              );
              localStorage.setItem(savedSessionKey, JSON.stringify({ savedMessages }));
            } catch (e) {
              console.error('Error updating seen status in localStorage:', e);
            }
          }
        }
      };
      seenUpdateHandlerRef.current = handleSeenUpdate;
      socket.on("messageSeenUpdate", handleSeenUpdate);
    };

    initChat();

    // Cleanup function to remove listeners when the component unmounts or when userId or targetUserId changes
    return () => {
      console.log(
        `🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`
      );
      socket.off("initChat");
      socket.off("newMessage", chatMessageHandlerRef.current);
      socket.off("messageSeenUpdate", seenUpdateHandlerRef.current);

      // Note: We no longer clear session keys when switching chats
      // The Double Ratchet state must persist for proper decryption
      // Keys are only cleared on logout via clearAllSessionKeys()
      console.log("✅ Chat cleanup complete (session keys preserved for ratchet continuity)");
    };
  }, [userId, targetUserId]);

  // Send message function
  const sendMessage = async (text, imageData = null) => {
    // Fetch the latest message number and derive the current message number
    const currentMessageNumber =
      (await fetchLatestMessageNumber(socket, userId, targetUserId)) + 1;
    console.log("🧮 Using message number:", currentMessageNumber);

    // Check if we have an existing session key (for continuing conversation)
    const currentKeyChain = getSessionKey(userId, targetUserId);
    console.log("🗝️ Current Session Key:", currentKeyChain ? "Found" : "Not found (will initialize)");

    // Intialize variables for the message state
    let isInitialMessage = false;
    let publicEphemeralKeyBase64 = null;
    let root_key = null;

    // If the current conversation has a key chain, continue the double ratchet logic
    if (currentKeyChain) {
      // Log the current key chain
      console.log("⛓️⛓️ Continuing ⛓️⛓️");
      console.log("currentKeyChain:", currentKeyChain);

      // Retrieve previous public ephemeral key from local storage
      // IMPORTANT: Use session-specific key to avoid conflicts between different chats
      const sessionId = [userId, targetUserId].sort().join('-');
      const previousTargetPublicEphemeralKey = localStorage.getItem(
        `previousTargetPublicEphemeralKey-${sessionId}`
      );

      // Intilialize the new root key variable
      let new_root_key = null;

      // If a previous target public ephemeral key exists, continue the double ratchet chain
      if (previousTargetPublicEphemeralKey) {
        // Generate random base seed 32 Byte Array
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));

        // Generate new ephemeral keys from base seed
        await init_dh();
        const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
        const publicEphemeralKey =
          generate_public_ephemeral_key(privateEphemeralKey);

        // Save private ephemeral key to local storage
        const sessionId = [userId, targetUserId].join("-");
        localStorage.setItem(
          `ephPriv-${sessionId}`,
          arrayBufferToBase64(privateEphemeralKey)
        );

        // Encode public ephemeral key to Base64 for transmission
        publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

        // Log new ephemeral keys and previous target public ephemeral key
        console.log("Saved To State: ", publicEphemeralKeyBase64);
        console.log(
          "🗝️🗝️ Generated ephemeral keys:",
          publicEphemeralKey,
          privateEphemeralKey
        );
        console.log(
          "Previous Target Public Ephemeral Key: ",
          previousTargetPublicEphemeralKey
        );

        // Continue the double ratchet chain with the previous target public ephemeral key
        new_root_key = await continueDoubleRatchetChain(
          socket,
          targetUserId,
          previousTargetPublicEphemeralKey,
          privateEphemeralKey
        );
        console.log("New Root Key: ", new_root_key);
      }
      // If no previous target public ephemeral key exists, use the current session key
      else {
        console.log("No previous target public ephemeral key found");
        new_root_key = getSessionKey(userId, targetUserId);

        // Save the initial public ephemeral key to local storage
        publicEphemeralKeyBase64 = localStorage.getItem(
          "initialSelfPublicEphemeralKey"
        );
      }

      // Store the new root key in memory for this session only
      // Will be used to encrypt this message and then kept for potential next message
      setSessionKey(userId, targetUserId, new_root_key);
      console.log("🔑 Ephemeral key stored in memory for this session");
    }
    // If no key chain is found, initialize a new double ratchet session
    else {
      console.log("⛓️⛓️ No chain, initializing new chain ⛓️⛓️");

      // If no session data is found, check if it's the first message
      isInitialMessage = !(await checkFirstMessage(
        socket,
        userId,
        targetUserId
      ));
      console.log("Is this the first message?", isInitialMessage);
      console.log("📂No session data found, generating new session...📂");

      // Generate random base seed 32 Byte Array
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));

      // Generate new ephemeral keys from base seed
      await init_dh();
      const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
      const publicEphemeralKey =
        generate_public_ephemeral_key(privateEphemeralKey);

      // Encode public ephemeral key to Base64 for transmission
      publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

      // Save the initial public ephemeral key to local storage
      localStorage.setItem(
        "initialSelfPublicEphemeralKey",
        publicEphemeralKeyBase64
      );
      console.log("Saved To State: ", publicEphemeralKeyBase64);
      console.log(
        "🗝️ Generated ephemeral keys:",
        publicEphemeralKey,
        privateEphemeralKey
      );

      const sessionId = [userId, targetUserId].join("-");
      localStorage.setItem(
        `ephPriv-${sessionId}`,
        arrayBufferToBase64(privateEphemeralKey)
      );

      if (isInitialMessage) {
        console.log("🔐 Initializing Double Ratchet");
        const root = await initializeDoubleRatchet(
          socket,
          targetUserId,
          privateEphemeralKey,
          publicEphemeralKey,
          privateKeyArray
        );
        root_key = root;
        // Store the root key in memory ONLY for this session
        setSessionKey(userId, targetUserId, root_key);
        console.log("✅ Root key generated and stored in memory (ephemeral)");
      } else {
        // If not initial but no session key exists, we need to derive one
        // This happens when the page is refreshed or chat is reopened
        console.log("⚠️ No initial message flag, but checking for existing session key...");
        const existingKey = getSessionKey(userId, targetUserId);
        if (!existingKey) {
          console.log("🔄 No session key found, initializing new key for existing conversation");
          const root = await initializeDoubleRatchet(
            socket,
            targetUserId,
            privateEphemeralKey,
            publicEphemeralKey,
            privateKeyArray
          );
          root_key = root;
          setSessionKey(userId, targetUserId, root_key);
          console.log("✅ New session key initialized for existing conversation");
        } else {
          // Use existing key
          root_key = existingKey;
        }
      }
    }

    // check if the text is empty
    if (!text.trim() && !imageData) return;

    try {
      // Encrypt the message AND the image using the ephemeral key
      const payload = JSON.stringify({ text: text || '', image: imageData || null });

      // Get the current session key (either from initialization or continuation)
      // If we have root_key (from new initialization), use it; otherwise get from session
      const encryptionKey = root_key || getSessionKey(userId, targetUserId);

      if (!encryptionKey) {
        console.error("❌ No encryption key available! This should not happen.");
        console.error("Debug info:", { isInitialMessage, root_key, hasSessionKey: !!getSessionKey(userId, targetUserId) });
        return;
      }

      console.log("🔐 Encrypting with ephemeral session key");
      const encryptedPayload = await encrypt(payload, encryptionKey, nonceArray);

      // Key remains in memory for receiving our own echo message
      // No need to re-store it as it's already in memory
      console.log("✅ Message encrypted, key kept in memory for echo decryption");

      // Emit the message to the server with additional fields
      if (isInitialMessage) {
        socket.emit("newMessage", {
          payload: encryptedPayload,
          userId,
          targetUserId,
          username,
          is_initial: isInitialMessage,
          messageNumber: isInitialMessage ? 0 : currentMessageNumber,
          publicEphemeralKey: publicEphemeralKeyBase64,
        });
      } else {
        socket.emit("newMessage", {
          payload: encryptedPayload,
          userId,
          targetUserId,
          username,
          is_initial: isInitialMessage,
          messageNumber: currentMessageNumber,
          publicEphemeralKey: publicEphemeralKeyBase64,
        });
      }

      console.log("📤 Sent message:", {
        payload: encryptedPayload,
        is_initial: isInitialMessage,
        messageNumber: currentMessageNumber,
        publicEphemeralKey: publicEphemeralKeyBase64,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  useEffect(() => {
    const messageCountIncreased = messages.length > previousMessageCountRef.current;

    if (autoScroll && messageCountIncreased && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      <SendText sendMessage={sendMessage} />
    </div>
  );
};

Chat.propTypes = {
  token: PropTypes.string.isRequired,
  activeChat: PropTypes.string.isRequired,
};

export default Chat;