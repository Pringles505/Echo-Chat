import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import ReText from './components/reText';
import SeText from './components/seText';

const socket = io('https://chat-tuah-backend.vercel.app/');


function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on('init', (messages) => {
      console.log('Received init messages:', messages); // Log the initial messages
      setMessages(messages);
    });

    socket.on('chat message', (message) => {
      console.log('Received chat message:', message); // Log the received chat message
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('init');
      socket.off('chat message');
    };
  }, []);

  return (
    <div>
      <ReText socket={socket} />
      <SeText messages={messages} />
    </div>
  );
}

export default App;