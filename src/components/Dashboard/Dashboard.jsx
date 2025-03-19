import { useState } from 'react';
import Friends from './Friends';
import UserInfo from './UserInfo';
import UserChat from './UserChat';

//Always keep in braces
import {jwtDecode} from 'jwt-decode';
const Dashboard = () => {
  const token = localStorage.getItem('token');
  console.log('Token in Dashboard:', token);
  let username = '';
  let userId = '';
  
  // Token authentication and decoding
  if (token) {
    const decodedToken = jwtDecode(token);
    username = decodedToken.username;
    userId = decodedToken.id;
  }

  const [activeChat, setActiveChat] = useState('');

  const handleActiveChatChange = (targetUser) => {
    setActiveChat(targetUser);
    console.log('Active chat in Dashboard:', targetUser);
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
        {activeChat ? (
          <UserChat token={token} activeChat={activeChat}/>
        ) : (
          <UserChat token={token} />
        )}
      </div>
        
      {/* User Info */}
      <div className="user-info">
        <UserInfo username={username} userId={userId} />
      </div>
    </div>
  );
};

export default Dashboard;