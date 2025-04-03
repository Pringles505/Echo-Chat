import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import Logo from '../canLogo/logo';
import './UserChat.css';
import SendText from './sendText';
import DisplayText from './displayText';

// Import DH and AES Rust Modules
import init, { encrypt as wasmEncrypt, decrypt as wasmDecrypt } from './../../../aes-wasm/pkg';
import init_dh, { derive_symmetric_key, diffie_hellman, generate_private_ephemeral_key, 
  generate_public_ephemeral_key  } from './../../../dh-wasm/pkg';
import init_xeddsa, {verify_signature, convert_x25519_to_xeddsa} from './../../../xeddsa-wasm/pkg';

// Secret key and nonce for encryption
const nonce = '000102030405060708090a0b'; 

const hexToUint8Array = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
};

// Convert the nonce from hex to byteArray
const nonceArray = hexToUint8Array(nonce);

// Encrypt and decrypt functions from WebAssembly module
const encrypt = async (text, derivedKey) => {
  await init();
  console.log('derivedKey:', derivedKey);

  try {
    // Ensure derivedKey is a Uint8Array
    if (!(derivedKey instanceof Uint8Array)) {
      derivedKey = new Uint8Array(derivedKey);
    }
    // Call the WebAssembly encrypt function
    const encryptedText = await wasmEncrypt(text, derivedKey, nonceArray);
    return encryptedText;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

const decrypt = async (text, derivedKey) => {
  await init();

  // Ensure the derived key is computed before decryption
  if (!derivedKey) {
    console.error('Derived key is missing');
  }
  try {
    return wasmDecrypt(text, derivedKey, nonceArray);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Main chat component
function Chat({ token, activeChat }) {
  const socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
  });

  // Convert the Base64 string into a Uint8Array
  // Used when extracting the private key from localstorage, localstorage only stores strings
  const base64ToArrayBuffer = (base64String) => {
    const binaryString = atob(base64String);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
    return byteArray;
  };

  // Extract the private key from localstorage and convert it to a ByteArray
  const storedPrivateKey = localStorage.getItem('publicKeyX25519');
  const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

  // Fetches the pubIK from the current targetUser
  const fetchPublicIdentityKeyX25519 = async (targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('getPublicIdentityKeyX25519', { targetUserId }, (response) => {
        if (response.success) {
          console.log(response)
          console.log('✅ Fetched publicIdentityKey:', response.publicIdentityKeyX25519);
          resolve(response.publicIdentityKeyX25519);
        } else {
          console.error('❌ Failed to fetch publicIdentityKey:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  };

  // Fetches the pubIK from the current targetUser
  const fetchPublicIdentityKeyEd25519 = async (targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('getPublicIdentityKeyEd25519', { targetUserId }, (response) => {
        if (response.success) {
          console.log(response)
          console.log('✅ Fetched PublicIdentityKeyEd25519:', response.publicIdentityKeyEd25519);
          resolve(response.publicIdentityKeyEd25519);
        } else {
          console.error('❌ Failed to fetch publicIdentityKey:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  };

  // Fetches the pubSPK from the current targetUser
  const fetchSignedPreKey = async (targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('getSignedPreKey', { targetUserId }, (response) => {
        if (response.success) {
          console.log('✅ Fetched getSignedPreKey:', response.signedPreKey, response.signature);

          resolve({signedPreKey: response.signedPreKey, signature: response.signature});
        } else {
          console.error('❌ Failed to fetch getSignedPreKey:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  };

  const userId = token ? jwtDecode(token).id : '';
  const targetUserId = activeChat;
  const username = token ? jwtDecode(token).username : '';
  const [messages, setMessages] = useState([]);
  const [globalDerivedKey, setDerivedKey] = useState();

  const messagesEndRef = useRef(null);

  // Compute the derived key using Diffie-Hellman key exchange
  // and derive a symmetric key from the shared secret
  const computeDerivedKey = async () => {
    await init_dh();

    // Fetch the pubIk and convert it to a ByteArray
    const encTargetPublicIdentityKey = await fetchPublicIdentityKeyX25519(targetUserId);
    const targetPublicIdentityKey = base64ToArrayBuffer(encTargetPublicIdentityKey);

    console.log('Target Public Identity Key:', targetPublicIdentityKey);
    console.log('Private Key:', privateKeyArray);

    // Compute the shared secret using X3DH
    const sharedSecret = await diffie_hellman(privateKeyArray, targetPublicIdentityKey);
    const derivedKey = await derive_symmetric_key(sharedSecret);


    console.log('🖥️Derived key:', derivedKey);
    setDerivedKey(derivedKey);
    return derivedKey;
  };

  const initializeDoubleRatchet = async (ephemeralKey_private) => {
    await init_dh();
    console.log('🗝️⚠️⚠️Initializing Double Ratchet...');
    const encTargetPublicIdentityKeyEd25519 = await fetchPublicIdentityKeyEd25519(targetUserId);
    const targetPublicIdentityKeyEd25519 = base64ToArrayBuffer(encTargetPublicIdentityKeyEd25519);
    console.log('BINGO');
    const { signedPreKey, signature } = await fetchSignedPreKey(targetUserId);
    const targetSignedPreKey = base64ToArrayBuffer(signedPreKey);
    const targetSignature = base64ToArrayBuffer(signature);

    console.log('🗝️⚠️⚠️Init XEdDSA with', targetSignedPreKey, targetSignature, targetPublicIdentityKeyEd25519);

    await init_xeddsa();
    const isValidSignature = await verify_signature(
      targetSignature,
      targetSignedPreKey,
      targetPublicIdentityKeyEd25519);
    console.log('Signature valid:', isValidSignature);

    await init_xeddsa();

    const dh1 = await diffie_hellman(privateKeyArray, targetSignedPreKey);
    const dh2 = await diffie_hellman(ephemeralKey_private, targetPublicIdentityKeyEd25519);
    const dh3 = await diffie_hellman(ephemeralKey_private, targetSignedPreKey);

    console.log('DH1:', dh1);
    console.log('DH2:', dh2);
    console.log('DH3:', dh3);
    
    const IKM = new Uint8Array(dh1.length + dh2.length + dh3.length);
    IKM.set(dh1, 0);
    IKM.set(dh2, dh1.length);
    IKM.set(dh3, dh1.length + dh2.length);
    console.log('IKM:', IKM);

    return IKM

  }

  useEffect(() => {
    if (!userId || !targetUserId) return;
  
    console.log(`🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`);

    // Clear messages when switching chats, messages are not stored in local storage
    // Clear derivedKey
    setMessages([]);
    setDerivedKey(null);
  
    const initChat = async () => {

      // Initialize Diffie-Hellman and compute the derived key
      await init_dh();
      console.log('🧑‍🤝‍🧑 Checking Session State 🧑‍🤝‍🧑')

      // THIS WILL BE CHANGED TO AN ENCRYPTED LOCAL DB INSTEAD OF THE PUBLIC ACCESS LOCALSTORAGE
      const savedSessions = localStorage.getItem(`chatSession-${userId}-${targetUserId}`);
      if (savedSessions) {
        const {savedMessages, savedDerivedKey} = JSON.parse(savedSessions);
        setMessages(savedMessages || []);
        setDerivedKey(savedDerivedKey || null);
        console.log('📂Loaded session data from local📂');
      } else {
        console.log('📂No session data found, generating new session...📂');
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));
        const privateEphemeralKey = generate_private_ephemeral_key(randomBytes);
        const publicEphemeralKey = generate_public_ephemeral_key(privateEphemeralKey);
        console.log('🗝️ Generated ephemeral keys:', publicEphemeralKey, privateEphemeralKey);
        initializeDoubleRatchet(privateEphemeralKey);
      }

      console.log("🗝️⚠️Computing derived key...");
      const derivedKey = await computeDerivedKey();
      
      // Cache the derived key
      setDerivedKey(derivedKey); 
  
      // Initialize the socket connection and emit the 'ready' event
      socket.emit('ready', { userId, targetUserId });
  
      // Handle intial messages when chat loads
      const handleInitMessages = async (messages) => {
        console.log('✅ Received initial messages:', messages);
  
        // Decrypt all messages using the derived key
        const decryptedMessages = await Promise.all(
          messages.map(async (message) => ({
            ...message,
            text: await decrypt(message.text, derivedKey),
          }))
        );
  
        // Once decrypted set as seen
        console.log('✅ Decrypted messages:', decryptedMessages);
        markMessagesAsSeen(decryptedMessages);
        setMessages(decryptedMessages);

        localStorage.setItem(
          `chatSession-${userId}-${targetUserId}`,
          JSON.stringify({ savedMessages: decryptedMessages, savedDerivedKey: derivedKey })
        )
      };
  
      // Handle incoming chat messages in real-time
      const handleChatMessage = async (message) => {
        console.log('📩 Received real-time message:', message);
  
        // Sender is the user who sent the message
        const sender = String(message.userId);
  
        // Set messages as seen if the message is in the currently opened chat
        if (activeChat === sender) {
          socket.emit('messageSeen', { userId, targetUserId });
        }
  
        // If the messages on chat belong to the current user or target user decrypt 
        // Messages are encrypted/decrypted regardless of sender
        if (
          (message.userId === userId && message.targetUserId === targetUserId) ||
          (message.userId === targetUserId && message.targetUserId === userId)
        ) {
          const decryptedMessage = {
            ...message,
            text: await decrypt(message.text, derivedKey),
          };
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages, decryptedMessage];
  
            // Save updated session data to localStorage
            localStorage.setItem(
              `chatSession-${userId}-${targetUserId}`,
              JSON.stringify({ savedMessages: updatedMessages, savedDerivedKey: derivedKey })
            );
  
            return updatedMessages;
          });
        }
      };
  
      // Listen for incoming messages and initial messages
      socket.on('initChat', handleInitMessages);
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
  

  // Scroll to the bottom of the messages container when new messages are added
  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Mark messages as seen when the user opens the chat
  const markMessagesAsSeen = (messages) => {
    // Check if the current user is the target user of the messages
    const unseenMessages = messages.filter((msg) => msg.userId !== userId);
    // if the messages are not seen and belong to the target user mark as seen
    if (unseenMessages.length > 0 && unseenMessages.seenStatus === false) {
      socket.emit('messageSeen', { userId, targetUserId });
      console.log('👀 Marking all UnseenMessages as seen');
    }
  };

  // Send message function
  const sendMessage = async (text) => {

    // Compute the derived key 
    await init_dh();
    computeDerivedKey();

    // Check if the derived key is available before sending the message
    if (!globalDerivedKey) {
      console.error('Derived key is not available yet. Please wait for it to be computed.');
      return;
    }

    // check if the text is empty
    if (!text.trim()) return;

    try {
      // Encrypt the message using the derived key
      const encryptedText = await encrypt(text, globalDerivedKey);

      // Emit message to the server
      socket.emit('newMessage', { text: encryptedText, userId, targetUserId, username });

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
