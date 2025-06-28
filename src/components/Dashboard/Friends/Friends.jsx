import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';
import { formatProfileImage } from '../DashboardComponents/utils/helpers';

const Friends = ({ token, onActiveChatChange, searchTerm }) => {
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
      const formattedProfileImage = formatProfileImage(
        notification.messageData.profileImage, 
        notification.messageData.username
      );
      
      setNotifications((prevNotifications) => [...prevNotifications, {
        ...notification,
        messageData: {
          ...notification.messageData,
          profileImage: formattedProfileImage,
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

  const handleSearch = useCallback(() => {
    const user = token ? jwtDecode(token) : '';
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.on('connect', () => {
      console.log('TempSocket connected');
    });

    if (!searchTerm || searchTerm === user.username) {
      tempSocket.disconnect();
      return;
    }

    tempSocket.emit('searchUser', { searchTerm }, (response) => {
      if (response && response.user) {
        // First, get the basic user info from search
        const basicUser = response.user;
        
        // Then fetch complete profile info including profile picture
        tempSocket.emit('getUserInfo', { userId: basicUser.id }, (profileResponse) => {
          let profilePicture = basicUser.profileImage;
          
          // If we got profile data, use the profile picture from there
          if (profileResponse && profileResponse.success && profileResponse.user) {
            profilePicture = profileResponse.user.profilePicture;
          }
          
          const formattedProfileImage = formatProfileImage(profilePicture, basicUser.username);
          
          const targetUser = {
            ...basicUser,
            profileImage: formattedProfileImage,
            status: 'online'
          };
          
          setSearchList((prevChatList) => [...prevChatList, targetUser]);
          tempSocket.disconnect();
        });
      } else {
        tempSocket.disconnect();
      }
    });
  }, [searchTerm, token]);

  useEffect(() => {
    if (searchTerm && searchTerm.trim() !== '') {
      handleSearch();
    } else {
      setSearchList([]);
    }
  }, [searchTerm, handleSearch]);

  return (
    <div className="h-full overflow-y-auto">
      <ul className="divide-y divide-gray-700">
        {chatList.map((targetUser, index) => (
          <li 
            key={index} 
            onClick={() => onActiveChatChange({
              id: targetUser.id,
              username: targetUser.username,
              profileImage: targetUser.profileImage,
              status: targetUser.status
            })}
            className="p-3 hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src={targetUser.profileImage} 
                  alt={targetUser.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${targetUser.username}&background=6366f1&color=fff`;
                  }}
                />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${targetUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              </div>
              <div>
                <p className="text-white font-medium">{targetUser.username}</p>
                <p className="text-xs text-gray-400">{targetUser.status}</p>
              </div>
            </div>
          </li>
        ))}
        
        {notifications.map((notification, index) => (
          <li 
            key={`notif-${index}`} 
            onClick={() => onActiveChatChange({
              id: notification.messageData.userId,
              username: notification.messageData.username,
              profileImage: notification.messageData.profileImage,
              status: notification.messageData.status
            })}
            className="p-3 hover:bg-gray-800 cursor-pointer transition-colors bg-gray-800/50"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src={notification.messageData.profileImage} 
                  alt={notification.messageData.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${notification.messageData.username}&background=6366f1&color=fff`;
                  }}
                />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  !
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{notification.messageData.username}</p>
                <p className="text-sm text-gray-300 truncate">{notification.message}</p>
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
};

export default Friends;