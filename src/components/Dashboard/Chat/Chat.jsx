import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import Logo from '../../Logo/logo';
import './Chat.css';
import SendText from './MessageInput/sendText';
import DisplayText from './MessageDisplay/displayText';

// Utility functions for encoding and decoding
import { base64ToArrayBuffer, arrayBufferToBase64, hexToUint8Array } from './utils/helpers'

// API functions for fetching messages and checking the first message
import { fetchLatestMessageNumber, checkFirstMessage } from './utils/api';

// Key management functions for storing and retrieving keys
import { storeKey, getLatestKey, getKey, updateSavedMessages } from './utils/chat/keyManagement';

// Double Ratchet Rust module
import {
  initializeDoubleRatchet,
  initializeDoubleRatchetResponse,
  continueDoubleRatchetChain
} from './utils/crypto/dr';

// Diffie-Hellman Rust Module
import init_dh, {
  generate_private_ephemeral_key,
  generate_public_ephemeral_key
} from 'dh-wasm';

// AES Encryption primitives
import { encrypt, decrypt } from './utils/crypto/aes';



// Secret key and nonce for encryption
const nonce = '000102030405060708090a0b';

// Convert the nonce from hex to byteArray
const nonceArray = hexToUint8Array(nonce);


// For the purposes of this project, for now, keys and sensitive data are stored in local storage
// In production use this should be an encrypted local database


// Main chat component
function Chat({ token, activeChat }) {

  // Initialize the socket connection with the provided token
  const socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
  });

  // Extract the private key from localstorage and convert it to a ByteArray
  const storedPrivateKey = localStorage.getItem('privateKeyX25519');
  const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

  // Extract userId and targetUserId from the token and activeChat
  const userId = token ? jwtDecode(token).id : '';
  const targetUserId = activeChat;
  const username = token ? jwtDecode(token).username : '';
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // useEffect to handle the socket connection and message fetching
  useEffect(() => {

    // Check if userId and targetUserId are valid
    if (!userId || !targetUserId) return;
    console.log(`🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`);

    // Clear messages when switching chats, messages are not stored in local storage
    // Clear derivedKey
    setMessages([]);

    // Remove any saved session data from local storage
    const savedSessionKey = `chatSession-${userId}-${targetUserId}`;
    localStorage.removeItem(savedSessionKey);

    // initialize the chat by fetching the latest message number and setting up real-time message handling
    const initChat = async () => {

      // Fetch the latest message number
      const latestMessageNumber = await fetchLatestMessageNumber(socket, userId, targetUserId);
      console.log('📩 Latest message number:', latestMessageNumber);

      // Initialize the socket connection and emit the 'ready' event
      socket.emit('ready', { userId, targetUserId });

      // Handle incoming chat messages in real-time
      const handleChatMessage = async (payload) => {

        // Check if the payload is an array or a single message
        const messages = Array.isArray(payload) ? payload : [payload];

        // Process each message one by one from the payload
        for (const message of messages) {

          // If message is from user or to the user process
          if (message.userId == activeChat || message.userId == userId) {
            try {

              // Process own messages differently
              if (message.userId === userId) {
                console.log("📩 Received my own message");

                // Get key from storage instead of deriving it
                const derivedKey = getKey(userId, targetUserId, message.messageNumber);

                // Error out in case no key is found
                if (!derivedKey) {
                  console.error(`❌ No key found for self message number ${message.messageNumber}`);
                  return;
                }

                // Decrypt the message text using the derived key
                const decryptedMessage = {
                  ...message,
                  text: await decrypt(message.text, derivedKey, nonceArray),
                };

                // Update the saved messages with the decrypted message
                updateSavedMessages(userId, targetUserId, decryptedMessage, setMessages);
                continue;
              }
              console.log('📩 Received real-time message:', message);

              // Retrieve the previous target public ephemeral key from local storage if it exists
              const previousTargetPublicEphemeralKey = localStorage.getItem('previousTargetPublicEphemeralKey');

              // Check if the message is for the active chat
              const sender = String(message.userId);
              if (activeChat === sender) {
                socket.emit('messageSeen', { userId, targetUserId });
              }

              console.log("🐸message.publicEphemeralKey: ", message.publicEphemeralKey)
              console.log("🐸previousTargetPublicEphemeralKey: ", previousTargetPublicEphemeralKey)

              // Initialize the derived root key
              let derived_rootKey = null;

              // If the RECIEVED message is initial initialize double ratchet RESPONSE
              if (message.is_initial == true) {

                derived_rootKey = await initializeDoubleRatchetResponse(socket, message, userId, targetUserId, privateKeyArray);

              }
              // If the RECIEVED message has continued the RATCHET advance the RECIEVING chain
              else if (message.publicEphemeralKey != previousTargetPublicEphemeralKey) {

                const sessionId = [userId, targetUserId].join('-');

                // Retrieve the private ephemeral key from local storage and decode
                const privateEphemeralBase64 = localStorage.getItem(`ephPriv-${sessionId}`)
                const privateEphemeral = base64ToArrayBuffer(privateEphemeralBase64);

                derived_rootKey = await continueDoubleRatchetChain(socket, targetUserId, message.publicEphemeralKey, privateEphemeral);

              }
              // If the RECIEVED message has NOT continued the RATCHET, use the latest key
              else {
                derived_rootKey = getLatestKey(userId, targetUserId);
              }

              // Store derived key
              console.log("Computed Derived Key", derived_rootKey)
              storeKey(userId, message.userId, message.messageNumber, derived_rootKey)

            } catch (err) {
              console.error('❌ Error handling message:', err, message);
            }

            // Retrieve the derived key for decryption 
            const derivedKey = getKey(userId, targetUserId, message.messageNumber);
            console.log("🔑Derived Key: ", derivedKey)

            if (!derivedKey) {
              console.error(`❌ No key found for message number ${message.messageNumber}`);
              return;
            }

            // Store the target public ephemeral key for future ratchet continuation
            const targetPublicEphemeralKeyBase64 = message.publicEphemeralKey;
            localStorage.setItem('previousTargetPublicEphemeralKey', targetPublicEphemeralKeyBase64);


            // Compute decryped message text using the derived key
            const decryptedMessage = {
              ...message,
              text: await decrypt(message.text, derivedKey, nonceArray),
            };

            // Save the decrypted message to local storage and update the state
            updateSavedMessages(userId, targetUserId, decryptedMessage, setMessages);
            localStorage.setItem('messages', JSON.stringify(decryptedMessage));

          } else {
            console.log("Message targetUserId: ", message.userId, "does not match activeChat: ", activeChat);
          }
        }
      };

      // Listen for incoming messages and initial messages
      socket.on('newMessage', handleChatMessage);
    };

    initChat();

    // Cleanup function to remove listeners when the component unmounts or when userId or targetUserId changes
    return () => {
      console.log(`🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`);
      socket.off('initChat');
      socket.off('newMessage');
    };
  }, [userId, targetUserId]);


  // AutoScroll when new messages are added
  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Send message function
  const sendMessage = async (text) => {

    // Fetch the latest message number and derive the current message number
    const currentMessageNumber = (await fetchLatestMessageNumber(socket, userId, targetUserId) + 1);
    console.log("🧮 Using message number:", currentMessageNumber);

    const currentKeyChain = getLatestKey(userId, targetUserId);
    console.log("🗝️Current Key Chain: ", currentKeyChain)

    // Intialize variables for the message state
    let isInitialMessage = false;
    let publicEphemeralKeyBase64 = null;
    let root_key = null;

    // If the current conversation has a key chain, continue the double ratchet logic
    if (currentKeyChain) {

      // Log the current key chain
      console.log("⛓️⛓️ Continuing ⛓️⛓️");
      console.log('currentKeyChain:', currentKeyChain);

      // Retrieve previous public ephemeral key from local storage
      const previousTargetPublicEphemeralKey = localStorage.getItem('previousTargetPublicEphemeralKey');

      // Intilialize the new root key variable
      let new_root_key = null;

      // If a previous target public ephemeral key exists, continue the double ratchet chain
      if (previousTargetPublicEphemeralKey) {

        // Generate random base seed 32 Byte Array
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));

        // Generate new ephemeral keys from base seed
        await init_dh();
        const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
        const publicEphemeralKey = generate_public_ephemeral_key(privateEphemeralKey);

        // Save private ephemeral key to local storage
        const sessionId = [userId, targetUserId].join('-');
        localStorage.setItem(`ephPriv-${sessionId}`, arrayBufferToBase64(privateEphemeralKey));

        // Encode public ephemeral key to Base64 for transmission
        publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

        // Log new ephemeral keys and previous target public ephemeral key
        console.log('Saved To State: ', publicEphemeralKeyBase64);
        console.log('🗝️🗝️ Generated ephemeral keys:', publicEphemeralKey, privateEphemeralKey);
        console.log("Previous Target Public Ephemeral Key: ", previousTargetPublicEphemeralKey)

        // Continue the double ratchet chain with the previous target public ephemeral key
        new_root_key = await continueDoubleRatchetChain(socket, targetUserId, previousTargetPublicEphemeralKey, privateEphemeralKey);
        console.log("New Root Key: ", new_root_key)
      } 
      // If no previous target public ephemeral key exists, use the latest key
      else {
        console.log("No previous target public ephemeral key found")
        new_root_key = getLatestKey(userId, targetUserId);

        // Save the initial public ephemeral key to local storage
        publicEphemeralKeyBase64 = localStorage.getItem('initialSelfPublicEphemeralKey');
      }
      const latestMessageNumber = await fetchLatestMessageNumber(socket, userId, targetUserId);
      console.log('📩 Latest message number:', latestMessageNumber);
      storeKey(userId, targetUserId, latestMessageNumber + 1, new_root_key);
    } 
    // If no key chain is found, initialize a new double ratchet session
    else {
      console.log("⛓️⛓️ No chain, initializing new chain ⛓️⛓️")

      // If no session data is found, check if it's the first message
      isInitialMessage = !(await checkFirstMessage(socket, userId, targetUserId));
      console.log('Is this the first message?', isInitialMessage);
      console.log('📂No session data found, generating new session...📂');

      // Generate random base seed 32 Byte Array 
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));

      // Generate new ephemeral keys from base seed
      await init_dh();
      const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
      const publicEphemeralKey = generate_public_ephemeral_key(privateEphemeralKey);

      // Encode public ephemeral key to Base64 for transmission
      publicEphemeralKeyBase64 = arrayBufferToBase64(publicEphemeralKey);

      // Save the initial public ephemeral key to local storage
      localStorage.setItem('initialSelfPublicEphemeralKey', publicEphemeralKeyBase64);
      console.log('Saved To State: ', publicEphemeralKeyBase64);
      console.log('🗝️ Generated ephemeral keys:', publicEphemeralKey, privateEphemeralKey);

      const sessionId = [userId, targetUserId].join('-');
      localStorage.setItem(`ephPriv-${sessionId}`, arrayBufferToBase64(privateEphemeralKey));

      if (isInitialMessage) {
        console.log("🤪🤪🤪🤪🤪")
        const root = await initializeDoubleRatchet(socket, targetUserId, privateEphemeralKey, publicEphemeralKey, privateKeyArray);
        root_key = root
        localStorage.setItem('derivedKey', root_key);
        console.log('✅Setting The Derived Key to the Root:', root_key);
      }
    }

    // check if the text is empty
    if (!text.trim()) return;


    try {
      // Encrypt the message using the derived key

      let encryptedText = null;
      if (!isInitialMessage) {
        console.log("🚧🚧Encrypting with: ", currentKeyChain)

        const currentKeyChainU8 = getLatestKey(userId, targetUserId);

        encryptedText = await encrypt(text, currentKeyChainU8, nonceArray);
        storeKey(userId, targetUserId, currentMessageNumber, currentKeyChainU8);


      } else {
        console.log("🚧Encrypting with: ", root_key)
        encryptedText = await encrypt(text, root_key, nonceArray);

        if (isInitialMessage) {
          storeKey(userId, targetUserId, 0, root_key);
        } else {
          storeKey(userId, targetUserId, currentMessageNumber, root_key);
        }
      }

      // Emit the message to the server with additional fields
      if (isInitialMessage) {
        socket.emit('newMessage', {
          text: encryptedText,
          userId,
          targetUserId,
          username,
          is_initial: isInitialMessage,
          messageNumber: 0,
          publicEphemeralKey: publicEphemeralKeyBase64,
        });
      } else {
        socket.emit('newMessage', {
          text: encryptedText,
          userId,
          targetUserId,
          username,
          is_initial: isInitialMessage,
          messageNumber: currentMessageNumber,
          publicEphemeralKey: publicEphemeralKeyBase64,
        });
      }

      console.log('📤 Sent message:', {
        text: encryptedText,
        is_initial: isInitialMessage,
        messageNumber: currentMessageNumber,
        publicEphemeralKey: publicEphemeralKeyBase64,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Listen for messageSeenUpdatem wehn the target user sees the message
  // In this case, targetUserId=userId and userId=targetUserId, since its sent from the target user
  socket.on('messageSeenUpdate', ({ userId, targetUserId }) => {
    console.log('👀', targetUserId, 'Message seen by:', userId);
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        return { ...msg, seenStatus: true };
      })
    );
  });

  return (
    <div className="app-container">
      <div className="logo-container">
        <Logo />
      </div>
      <div className="chat-container">
        <div className="messages-container">
          <DisplayText messages={messages} currentUserId={userId} />
          <div ref={messagesEndRef} />
        </div>
        <SendText sendMessage={sendMessage} />
      </div>
    </div>
  );
}

Chat.propTypes = {
  token: PropTypes.string.isRequired,
  activeChat: PropTypes.string.isRequired,
};

export default Chat;
