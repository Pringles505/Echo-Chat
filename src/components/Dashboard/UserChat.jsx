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
import init_dh, { derive_symmetric_key, diffie_hellman  } from './../../../dh-wasm/pkg';

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
  const storedPrivateKey = localStorage.getItem('privateKey');
  const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

  // Fetches the pubIK from the current targetUser
  const fetchPublicIdentityKey = async (targetUserId) => {
    return new Promise((resolve, reject) => {
      socket.emit('getPublicIdentityKey', { targetUserId }, (response) => {
        if (response.success) {
          console.log('✅ Fetched publicIdentityKey:', response.publicIdentityKey);
          resolve(response.publicIdentityKey);
        } else {
          console.error('❌ Failed to fetch publicIdentityKey:', response.error);
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
    const targetPublicKey = await fetchPublicIdentityKey(targetUserId);
    const targetPublicIdentityKey = base64ToArrayBuffer(targetPublicKey);

    // Compute the shared secret using Diffie-Hellman and derive the symmetric key
    const sharedSecret = await diffie_hellman(privateKeyArray, targetPublicIdentityKey);
    const derivedKey = await derive_symmetric_key(sharedSecret);

    console.log('🖥️Derived key:', derivedKey);
    setDerivedKey(derivedKey);
    return derivedKey;
  };

  useEffect(() => {
    if (!userId || !targetUserId) return;
  
    console.log(`🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`);
  
    setMessages([]);
  
    const initChat = async () => {
      await init_dh();
      const derivedKey = await computeDerivedKey();
      
      // Cache the derived key
      setDerivedKey(derivedKey); 
  
      socket.emit('ready', { userId, targetUserId });
  
      const handleInitMessages = async (messages) => {
        console.log('✅ Received init messages:', messages);
  
        const decryptedMessages = await Promise.all(
          messages.map(async (message) => ({
            ...message,
            text: await decrypt(message.text, derivedKey),
          }))
        );
  
        console.log('✅ Decrypted messages:', decryptedMessages);
        markMessagesAsSeen(decryptedMessages);
        setMessages(decryptedMessages);
      };
  
      const handleChatMessage = async (message) => {
        console.log('📩 Received real-time message:', message);
  
        const sender = String(message.userId);
  
        if (activeChat === sender) {
          socket.emit('messageSeen', { userId, targetUserId });
        }
  
        if (
          (message.userId === userId && message.targetUserId === targetUserId) ||
          (message.userId === targetUserId && message.targetUserId === userId)
        ) {
          const decryptedMessage = {
            ...message,
            text: await decrypt(message.text, derivedKey),
          };
          setMessages((prevMessages) => [...prevMessages, decryptedMessage]);
        }
      };
  
      socket.on('init', handleInitMessages);
      socket.on('chat message', handleChatMessage);
    };
  
    initChat();
  
    return () => {
      console.log(`🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`);
      socket.off('init');
      socket.off('chat message');
    };
  }, [userId, targetUserId]);
  

  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const markMessagesAsSeen = (messages) => {
    const unseenMessages = messages.filter((msg) => msg.userId !== userId);
    if (unseenMessages.length > 0) {
      socket.emit('messageSeen', { userId, targetUserId });
      console.log('👀 Marking all messages as seen');
    }
  };

  const sendMessage = async (text) => {
    await init_dh();
    computeDerivedKey();
    if (!text.trim()) return;
    try {
      const encryptedText = await encrypt(text, globalDerivedKey);

      // Temporary ID for React rendering and Display decrypted text instantly
      const newMessage = {
        _id: Date.now(),
        text,
        userId,
        targetUserId,
        username,
        createdAt: new Date().toISOString(),
      };

      console.log('Sending message:', newMessage);

      // Emit message to the server
      socket.emit('chat message', { text: encryptedText, userId, targetUserId, username });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Listen for messageSeenUpdate
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
