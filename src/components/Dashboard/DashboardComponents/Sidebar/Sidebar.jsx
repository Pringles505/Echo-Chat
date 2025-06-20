import { MessageCircle, User, Users, LogOut } from "lucide-react";

const Sidebar = ({ 
  activeView, 
  handleViewChange, 
  handleProfileClick, 
  handleLogout, 
  profileImage, 
  username,
  unreadMessages 
}) => {
  return (
    <div className="left-sidebar compact">
      <nav className="vertical-nav">
        <button 
          className={`nav-button ${activeView === 'chats' ? 'active' : ''}`}
          onClick={() => handleViewChange('chats')}
        >
          <MessageCircle className="icon" />
          {Object.values(unreadMessages).reduce((a, b) => a + b, 0) > 0 && (
            <span className="unread-badge">
              {Object.values(unreadMessages).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>
        <button 
          className={`nav-button ${activeView === 'friends' ? 'active' : ''}`}
          onClick={() => handleViewChange('friends')}
        >
          <Users className="icon" />
        </button>
        <button className="nav-button" onClick={handleProfileClick}>
          <User className="icon" />
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button className="logout-button" onClick={handleLogout}>
          <LogOut className="icon" />
        </button>

        <div className="profile-section" onClick={handleProfileClick}>
          <div className="profile-avatar">
            <img
              src={profileImage}
              alt="User Avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${username}&background=${getConsistentColor(username)}&color=fff`;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;