import { useState, useEffect } from 'react';
import { getSocket } from '../../socket';
import PropTypes from 'prop-types';
import './Friends.css';
import './Dashboard.css';
import { jwtDecode } from 'jwt-decode';

const Friends = ({ onActiveChatChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [chatList, setSearchList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => console.log('Socket connected');
    const handleNotification = (notification) => {
      console.log('Received notification:', notification);
      setNotifications((prev) => [...prev, notification]);
    };
    const handleDisconnect = () => console.log('Socket disconnected');

    socket.on('connect', handleConnect);
    socket.on('notification', handleNotification);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification', handleNotification);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const handleSearch = () => {
    const token = localStorage.getItem('token');
    const user = token ? jwtDecode(token) : '';
    if (!searchTerm || searchTerm === user.username) {
      return;
    }
    socket.emit('searchUser', { searchTerm }, (response) => {
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
  onActiveChatChange: PropTypes.func.isRequired,
};

export default Friends;