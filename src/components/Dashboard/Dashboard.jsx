import { useState } from 'react';
import { FaUserCircle, FaCog, FaComments } from 'react-icons/fa';
import Friends from './Friends';
import UserProfile from '../UserProfile';
import './Dashboard.css';

const Dashboard = ({ token, username, userId, password = '', about = '', profilePic = '' }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const handleProfileToggle = () => {
    setShowUserProfile((prev) => !prev);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-nav">
        <h2>Chats</h2>
        <div className="friends-scroll">
          <Friends token={token} onActiveChatChange={setActiveChatId} />
        </div>
        <div className="dashboard-footer">
          <FaComments className="footer-icon active" />
          <FaCog className="footer-icon" />
          <div className="footer-icon" onClick={handleProfileToggle}>
            <FaUserCircle size={24} />
          </div>
        </div>
        {showUserProfile && (
          <div className="profile-popover">
            <UserProfile
              username={username}
              userId={userId}
              password={password}
              about={about}
              profilePic={profilePic}
            />
          </div>
        )}
      </div>

      <div className="dashboard-content">
        {activeChatId ? (
          <p>Chat activo: {activeChatId}</p>
        ) : (
          <p className="chat-placeholder">Selecciona un chat para comenzar</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
