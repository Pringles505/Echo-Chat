import { jwtDecode } from 'jwt-decode';
import React, { useState } from 'react';
import io from 'socket.io-client';

const Friends = ({token}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    const user = token ? jwtDecode(token) : ''; 
    console.log('Searching for:', searchTerm);
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.on('connect', () => {
      console.log('TempSocket connected');
    });
    if (!searchTerm || searchTerm == user.username) {
      console.log('Search term is empty or the same as the user');
      tempSocket.disconnect();
      return;
    }
    tempSocket.emit('searchUser', { searchTerm }, (response) => {
      console.log('Search response:', response);
      const targetUser = response.user.id;
      tempSocket.emit('startChat', { userId: user.id, targetUserId: targetUser });
      tempSocket.disconnect();
    });
  };

  return (
    <div className="friends-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div className="conversations-container">
        <h3>Active Conversations</h3>
      </div>
    </div>
  );
};

export default Friends;