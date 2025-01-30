import { useState } from 'react';
import Chat from './Chat';
import Friends from './Friends';
import UserInfo from './UserInfo';

//Always keep in braces
import {jwtDecode} from 'jwt-decode';

const Dashboard = () => {
  const token = localStorage.getItem('token');
  let username = '';
  let userId = '';

  if (token) {
    const decodedToken = jwtDecode(token);
    username = decodedToken.username;
    userId = decodedToken.id;
  }

  const [activeChat, setActiveChat] = useState('');

  const handleActiveChatChange = (chat) => {
    setActiveChat(chat);
    console.log('Active chat in Dashboard:', chat);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar with Friends */}
      <nav className="dashboard-nav">
        <h2>Friends</h2>
        <Friends token={token} onActiveChatChange={handleActiveChatChange} />
      </nav>

      {/* Main Content Area with Chat */}
      <div className="dashboard-content">
        <Chat token={token} activeChat={activeChat} />
      </div>

      {/* User Info */}
      <div className="user-info">
        <UserInfo username={username} userId={userId}/>
      </div>
    </div>
  );
};

export default Dashboard;