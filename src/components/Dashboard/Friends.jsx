import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import './Friends.css';

//Always keep in braces
import {jwtDecode} from 'jwt-decode';

const Friends = ({ token, onActiveChatChange}) => {
  console.log('Rendering Friends component');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatList, setSearchList] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    // When the user receives a notification
    socket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      setNotifications((prevNotifications) => [...prevNotifications, notification]);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Search for a user when adding a friend
  const handleSearch = () => {
    const user = token ? jwtDecode(token) : '';
    console.log('Searching for:', searchTerm);
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.on('connect', () => {
      console.log('TempSocket connected');
    });

    // Disconnect if the search term is empty or the same as the user
    if (!searchTerm || searchTerm === user.username) {
      console.log('Search term is empty or the same as the user');
      tempSocket.disconnect();
      return;
    }

    // Search for the user in the db and add to the chat list
    tempSocket.emit('searchUser', { searchTerm }, (response) => {
      console.log('Search response:', response);
      const targetUser = response.user;
      setSearchList((prevChatList) => [...prevChatList, targetUser]); 
    });
  };

  return (
    <div className="friends-container">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for friends..."
      />
      <button onClick={handleSearch}>Search</button>
      <ul className="chat-list">
        {chatList.map((targetUser, index) => (
          <li key={index} onClick={() => onActiveChatChange(targetUser.id)}>
            {targetUser.username}
          </li>
        ))}
        {notifications.map((notification, index) => (
          <li key={index} className="notification-item" onClick={() => onActiveChatChange(notification.messageData.userId)}>
            <strong>{notification.message}</strong>{notification.messageData.username}
          </li>
        ))}
      </ul>
    </div>
  );
};

Friends.propTypes = {
  token: PropTypes.string.isRequired,
  onActiveChatChange: PropTypes.func.isRequired,
  notifications: PropTypes.array,
};

export default Friends;