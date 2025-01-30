import { useState } from 'react';
import io from 'socket.io-client';
import PropTypes from 'prop-types';

//Always keep in braces
import {jwtDecode} from 'jwt-decode';

const Friends = ({ token, onActiveChatChange }) => {
  console.log('Rendering Friends component');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatList, setSearchList] = useState([]);

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
      setSearchList((prevChatList) => [...prevChatList, response.user.username]); 
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
      <ul>
        {chatList.map((chat, index) => (
          <li key={index} onClick={() => onActiveChatChange(chat)}>
            {chat}
          </li>
        ))}
      </ul>
    </div>
  );
};

Friends.propTypes = {
  token: PropTypes.string.isRequired,
  onActiveChatChange: PropTypes.func.isRequired,
};

export default Friends;