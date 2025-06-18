import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import './Friends.css';
import '../Dashboard.css';
import { jwtDecode } from 'jwt-decode';

const Friends = ({ token, onActiveChatChange, searchTerm, onSearch }) => {
  console.log('Rendering Friends component');
  const [chatList, setSearchList] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      setNotifications((prevNotifications) => [...prevNotifications, {
        ...notification,
        messageData: {
          ...notification.messageData,
          profileImage: notification.messageData.profileImage || `https://ui-avatars.com/api/?name=${notification.messageData.username}&background=6366f1&color=fff`,
          status: 'online'
        }
      }]);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    // Realizar búsqueda automáticamente cuando searchTerm cambia
    if (searchTerm && searchTerm.trim() !== '') {
      handleSearch();
    } else {
      setSearchList([]); // Limpiar resultados si el searchTerm está vacío
    }
  }, [searchTerm]);

  const handleSearch = () => {
    const user = token ? jwtDecode(token) : '';
    console.log('Searching for:', searchTerm);
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.on('connect', () => {
      console.log('TempSocket connected');
    });

    if (!searchTerm || searchTerm === user.username) {
      console.log('Search term is empty or the same as the user');
      tempSocket.disconnect();
      return;
    }

    tempSocket.emit('searchUser', { searchTerm }, (response) => {
      console.log('Search response:', response);
      const targetUser = {
        ...response.user,
        profileImage: response.user.profileImage || `https://ui-avatars.com/api/?name=${response.user.username}&background=6366f1&color=fff`,
        status: 'online'
      };
      setSearchList((prevChatList) => [...prevChatList, targetUser]); 
    });
  };

  return (
    <div className="friends-container">
      <ul className="chat-list">
        {chatList.map((targetUser, index) => (
          <li 
            key={index} 
            onClick={() => onActiveChatChange({
              id: targetUser.id,
              username: targetUser.username,
              profileImage: targetUser.profileImage,
              status: targetUser.status
            })}
          >
            <div className="friend-item">
              <img 
                src={targetUser.profileImage} 
                alt={targetUser.username}
                className="friend-avatar"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${targetUser.username}&background=6366f1&color=fff`;
                }}
              />
              <span>{targetUser.username}</span>
            </div>
          </li>
        ))}
        {notifications.map((notification, index) => (
          <li 
            key={index} 
            className="notification-item" 
            onClick={() => onActiveChatChange({
              id: notification.messageData.userId,
              username: notification.messageData.username,
              profileImage: notification.messageData.profileImage,
              status: notification.messageData.status
            })}
          >
            <div className="friend-item">
              <img 
                src={notification.messageData.profileImage} 
                alt={notification.messageData.username}
                className="friend-avatar"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${notification.messageData.username}&background=6366f1&color=fff`;
                }}
              />
              <div>
                <strong>{notification.message}</strong>
                <span>{notification.messageData.username}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

Friends.propTypes = {
  token: PropTypes.string.isRequired,
  onActiveChatChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string,
  onSearch: PropTypes.func,
};

export default Friends;