import { useState, useEffect } from 'react';
import Friends from './Friends';
import UserChat from './UserChat';
import { jwtDecode } from 'jwt-decode';
import { FiSettings, FiLogOut } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import ParticlesBackground from '../HomepageComponents/ParticlesBackground';

const styles = {
  dashboard: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#000000',
    color: '#E9EDEF',
    fontFamily: 'Segoe UI, Helvetica, sans-serif',
    position: 'relative',
    zIndex: 1,
  },
  backgroundWrapper: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
  },
  sidebar: {
    width: '380px',
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2A2A2A',
    zIndex: 1,
  },
  profilePic: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: 'pointer',
    marginRight: '15px',
  },
  profileImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  chatsList: {
    flex: 1,
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 8px',
    borderRadius: '5px',
    cursor: 'pointer',
    color: '#E9EDEF',
    backgroundColor: '#000000',
    transition: 'color 0.3s ease',
  },
  icon: {
    marginRight: '15px',
    fontSize: '20px',
    transition: 'color 0.3s ease',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  emptyChat: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  logoContainer: {
    textAlign: 'center',
  },
  mainLogo: {
    width: '200px',
    opacity: 0.8,
  },
    sidebarHeader: {
    padding: '15px 15px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solidrgb(0, 0, 0)',
    marginBottom: '10px',
  },

};

const Dashboard = () => {
  const token = localStorage.getItem('token');
  const [activeChat, setActiveChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  const { username = '', id: userId = '' } = token ? jwtDecode(token) : {};

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&bold=true`;

  useEffect(() => {
    const storedImage = localStorage.getItem(`profileImage-${userId}`);
    setProfileImage(storedImage || defaultAvatar);
  }, [userId, defaultAvatar]);

  if (!username || !userId) return <Navigate to="/login" />;

  const handleChatSelect = (chatId) => {
    setActiveChat(chatId);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <>
      <div style={styles.backgroundWrapper}>
        <ParticlesBackground />
      </div>

      <div style={styles.dashboard}>
        <div style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
          <div style={styles.sidebarHeader}>
            <div
              style={styles.profilePic}
              onClick={() => window.location.href = `/profile/${userId}`}
            >
              <img src={profileImage} alt={username} style={styles.profileImg} />
            </div>
          </div>

          <div style={styles.chatsList}>
            <Friends token={token} onSelectChat={handleChatSelect} activeChat={activeChat} />
          </div>

          <div style={styles.sidebarFooter}>
            {['Ajustes', 'Cerrar sesión'].map((label) => {
              const isLogout = label === 'Cerrar sesión';
              const isHovered = hoveredItem === label;
              const textColor = isLogout
                ? isHovered ? '#ff4444' : '#E9EDEF'
                : isHovered ? '#514B96' : '#E9EDEF';
              const iconColor = textColor;

              const icon = isLogout
                ? <FiLogOut style={{ ...styles.icon, color: iconColor }} />
                : <FiSettings style={{ ...styles.icon, color: iconColor }} />;

              const action = isLogout ? handleLogout : null;

              return (
                <div
                  key={label}
                  onClick={action}
                  onMouseEnter={() => setHoveredItem(label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    ...styles.menuItem,
                    color: textColor,
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.chatArea}>
          {activeChat ? (
            <UserChat chatId={activeChat} token={token} />
          ) : (
            <div style={styles.emptyChat}>
              <div style={styles.logoContainer}>
                <img src="/echo-logo.svg" alt="Echo Logo" style={styles.mainLogo} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
