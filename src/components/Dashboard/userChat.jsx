import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

import SendText from './sendText';
import DisplayText from './displayText';
import Logo from '../canLogo/logo';

import PropTypes from 'prop-types';

//Make sure to use env var SO IT DOESNT CONNECT TO PROD DURING DEV
const socket = io(import.meta.env.VITE_SOCKET_URL);

// Secret key for encryption/decryption. Replace with future mechanic to change key 
//Currently Static
const secretKey = 'xrTcxoWDqztoar40ePgiBdzif1wuIADYbdeJ3QVIooneAHPNhpvo5XgHAK/zlv5j';

// Functions to encrypt and decrypt incoming/outgoing messages
// Currently only using AES with secret key, IMPLEMENT rest of the encryption
const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
};
const decrypt = (text) => {
  try {
    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting message:', text, error);
    return 'Error decrypting message';
  }
};

function Chat({ token }) {
  const userId = token ? jwtDecode(token).id : '';
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleInitMessages = (messages) => {
      console.log('Received init messages:', messages);
      const decryptedMessages = messages.map((message) => {
        return {
          ...message,
          text: decrypt(message.text),
        };
      });
      setMessages(decryptedMessages);
      setLoading(false); // Done loading
    };

    const handleChatMessage = (message) => {
      console.log('Received chat message:', message);
      const decryptedMessage = {
        ...message,
        text: decrypt(message.text),
      };
      setMessages((prevMessages) => [...prevMessages, decryptedMessage]);
    };

    socket.on('connect', () => {
      console.log('Socket connected, emitting ready...');
      socket.emit('ready');
    });

    socket.on('init', handleInitMessages);
    socket.on('chat message', handleChatMessage);

    return () => {
      socket.off('init', handleInitMessages);
      socket.off('chat message', handleChatMessage);
    };
  }, []);

  const sendMessage = (text) => {
    const encryptedText = encrypt(text);
    socket.emit('chat message', { text: encryptedText, userId });
  };

  return (
    <div className="app-container">
      <div className="logo-container">
        <Logo />
      </div>
      <div className="chat-container">
        {loading ? (
          <p>Loading messages...</p>
        ) : (
          <>
            <SendText sendMessage={sendMessage} />
            <DisplayText messages={messages} />
          </>
        )}
      </div>
    </div>
  );
}

Chat.propTypes = {
  token: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default Chat;
