import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

import SendText from './sendText';
import DisplayText from './displayText';
import PropTypes from 'prop-types';
import Logo from '../canLogo/logo';

import './UserChat.css'; 

const secretKey = 'xrTcxoWDqztoar40ePgiBdzif1wuIADYbdeJ3QVIooneAHPNhpvo5XgHAK/zlv5j';

const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
};

const decrypt = (text) => {
    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};

function Chat({ token, activeChat }) {

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token },
        transport: ['websocket'],
    });

    const userId = token ? jwtDecode(token).id : '';
    const targetUserId = activeChat;
    const username = token ? jwtDecode(token).username : '';
    const [messages, setMessages] = useState([]);

    const messagesEndRef = useRef(null);

    useEffect(() => {
      if (!userId || !targetUserId) return;
  
      console.log(`🔄 Fetching messages for chat: User ${userId} ↔ Target ${targetUserId}`);
  
      // Reset messages when switching chats
      setMessages([]);

      const handleInitMessages = (messages) => {
          console.log('✅ Received init messages:', messages);
  
          const decryptedMessages = messages.map((message) => ({
              ...message,
              text: decrypt(message.text),
          }));
  
          console.log('✅ Decrypted messages:', decryptedMessages);
          markMessagesAsSeen(decryptedMessages);
          setMessages(decryptedMessages);
      };
  
      const handleChatMessage = (message) => {
          console.log('📩 Received real-time message:', message);
          const sender = String(message.userId);

          if (activeChat === sender) {
            console.log('👁️👁️ Message seen:', message);
            socket.emit('messageSeen', { userId, targetUserId });
          }else{
            console.log("NOT SEEN 👁️👁️ RecievedMessageId", message.userId, 'Active:', activeChat)
            
          }
  
          // Only update messages if they belong to the current chat
          if (
              (message.userId === userId && message.targetUserId === targetUserId) ||
              (message.userId === targetUserId && message.targetUserId === userId)
          ) {
              setMessages((prevMessages) => [
                  ...prevMessages,
                  { ...message, text: decrypt(message.text) },
              ]);
          }
      };


  
      // Emit ready to fetch messages when opening a chat
      socket.emit('ready', { userId, targetUserId });
  
      // Listen for real-time messages
      socket.on('init', handleInitMessages);
      socket.on('chat message', handleChatMessage);
  
      return () => {
          console.log(`🧹 Cleaning up listeners for chat: User ${userId} ↔ Target ${targetUserId}`);
          socket.off('init', handleInitMessages);
          socket.off('chat message', handleChatMessage);
      };
  }, [userId, targetUserId]); // Runs whenever activeChat changes  

  useEffect(() => {
    if (socket) {
      console.log("🔍 Listening for messageSeenUpdate...");
      console.log("🔍🔍 Socket instance:", socket);
      console.log("🔍🔍 Socket connected:", socket.connected);
  
      socket.on('messageSeenUpdate', ({ userId: seenBy, targetUserId }) => {
        console.log(`📩👁️ Real-time update: messages seen by User ${seenBy}`);
  
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            (msg.userId === seenBy && msg.targetUserId === targetUserId) || 
            (msg.userId === targetUserId && msg.targetUserId === seenBy)
              ? { ...msg, seenStatus: true }
              : msg
          )
        );
      });
  
      return () => {
        console.log("🛑 Unsubscribing from messageSeenUpdate...");
        socket.off('messageSeenUpdate');  
      };
    } else {
      console.log("⚠️ Socket is undefined!");
    }
  }, [socket]);
  
  

  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

    const markMessagesAsSeen = (messages) => {
        const unseenMessages = messages.filter(msg => msg.userId !== userId);
        if (unseenMessages.length > 0) {
            socket.emit('messageSeen', { userId, targetUserId });
            console.log('👀 Marking all messages as seen');
        }
    };

  
    const sendMessage = (text) => {
      if (!text.trim()) return; 
      const encryptedText = encrypt(text);
      
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
  };

    return (
        <div className="app-container">
            <div className="logo-container">
                <Logo />
            </div>
            <div className="chat-container">
                <div className="messages-container">
                    <DisplayText messages={messages} userId={userId}/>
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
