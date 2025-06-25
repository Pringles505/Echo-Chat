import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

import { getSocket } from '../../socket';
import CryptoJS from 'crypto-js'; 

import SendText from './sendText';
import DisplayText from './displayText';

import PropTypes from 'prop-types';

// Secret key for encryption/decryption. Replace with future mechanic to change key 
//Currently Static
const secretKey = 'xrTcxoWDqztoar40ePgiBdzif1wuIADYbdeJ3QVIooneAHPNhpvo5XgHAK/zlv5j';

import Logo from '../canLogo/logo';

const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
};
  
const decrypt = (text) => {
  const bytes = CryptoJS.AES.decrypt(text, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
  
function Chat({token}) {
  const userId = token ? jwtDecode(token).id : '';
  const [messages, setMessages] = useState([]);
  const socket = getSocket();

  useEffect(() => {
    // Decrypt and set the messages when received
    const handleInitMessages = (messages) => {
      console.log('Received init messages:', messages);
      const decryptedMessages = messages.map((message) => ({
        ...message,
        text: decrypt(message.text),
      }));
      setMessages(decryptedMessages);
    };

    const handleChatMessage = (message) => {
      console.log('Received chat message:', message);
      const decryptedMessage = {
        ...message,
        text: decrypt(message.text),
      };
      setMessages((prevMessages) => [...prevMessages, decryptedMessage]);
    };

    socket.on('init', handleInitMessages);
    socket.on('chat message', handleChatMessage);

    return () => {
      socket.off('init', handleInitMessages);
      socket.off('chat message', handleChatMessage);
    };
  }, [socket]);

  const sendMessage = (text) => {
    console.log('Sending message:', text);
    const encryptedText = encrypt(text);
    const decryptedText = decrypt(encryptedText);

    console.log('Decrypted text:', decryptedText);
    console.log('user ID:', userId);
    
    socket.emit('chat message', { text: encryptedText, userId });
  };

  return (
    <div className="app-container">
      <div className="logo-container">
        <Logo />
      </div>
      <div className="chat-container">
        <SendText sendMessage={sendMessage} /> 
        <DisplayText messages={messages} />
      </div>
    </div>
  );
};

Chat.propTypes = {
  token: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default Chat;