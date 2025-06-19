import { useState } from "react";
import Friends from "./Friends/Friends";
import UserChat from "./Chat/Chat";
import {
  Search,
  MessageCircle,
  User,
  Users,
  MoreHorizontal,
  Plus,
  LogOut,
  Lock // Añadí el icono Lock que faltaba
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  console.log("Token in Dashboard:", token);
  let username = "";
  let userId = "";

  if (token) {
    const decodedToken = jwtDecode(token);
    username = decodedToken.username;
    userId = decodedToken.id;
  }

  const profileImage =
    localStorage.getItem(`profileImage-${userId}`) ||
    `https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff`;
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleActiveChatChange = (friendData) => {
    setActiveChat(friendData);
    console.log("Active chat in Dashboard:", friendData);
  };

  const handleProfileClick = () => {
    navigate(`/profile/${userId}`, { state: { username, userId } });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleSearch = () => {
    console.log("Searching for:", searchTerm);
  };

  return (
    <div className="dashboard-container">
      {/* Left Sidebar - Compacto permanentemente */}
      <div className="left-sidebar compact">
        {/* Navigation - Solo íconos */}
        <nav className="vertical-nav">
          <button className="nav-button">
            <MessageCircle className="icon" />
          </button>
          <button className="nav-button">
            <Users className="icon" />
          </button>
          <button className="nav-button" onClick={handleProfileClick}>
            <User className="icon" />
          </button>
        </nav>

        {/* Bottom Section - Logout y Profile */}
        <div className="sidebar-bottom">
          {/* Logout Button - Solo ícono */}
          <button className="logout-button" onClick={handleLogout}>
            <LogOut className="icon" />
          </button>

          {/* Profile Section - Solo ícono */}
          <div className="profile-section" onClick={handleProfileClick}>
            <div className="profile-avatar">
              <img
                src={profileImage}
                alt="User Avatar"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff`;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Friends List */}
      <nav className="dashboard-nav">
        {/* Header */}
        <div className="nav-header">
          <div className="logo-container">
            <img
              src="./echo-logo-text.png"
              alt="ECHO Logo"
              className="header-logo"
            />
          </div>

          {/* Search */}
          <div className="search-container">
            <div className="search-input-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search for friends..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button className="search-button" onClick={handleSearch}>
              <Plus className="icon" />
            </button>
          </div>
        </div>

        {/* Friends List */}
        <div className="friends-list-container">
          <Friends
            token={token}
            onActiveChatChange={handleActiveChatChange}
            searchTerm={searchTerm}
            onSearch={handleSearch}
          />
        </div>
      </nav>

      {/* Right Section - Chat Area */}
      <div className="dashboard-content">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-info">
                <div className="chat-avatar">
                  <img
                    src={
                      activeChat.profileImage ||
                      `https://ui-avatars.com/api/?name=${activeChat.username}&background=6366f1&color=fff`
                    }
                    alt={activeChat.username}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${activeChat.username}&background=6366f1&color=fff`;
                    }}
                  />
                </div>
                <div className="chat-details">
                  <h3>{activeChat.username}</h3>
                  <p>{activeChat.status || "Online"}</p>
                </div>
              </div>
              <div className="chat-actions">
                <button className="chat-action">
                  <MoreHorizontal className="icon" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="chat-content">
              <UserChat token={token} activeChat={activeChat.id} />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-chat-container">
              <div className="empty-chat-icon animate-bounce">
                <MessageCircle size={64} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mt-4">No chat selected</h3>
              <p className="text-gray-500 max-w-md text-center mt-2">
                Choose a conversation from the sidebar or start a new one to begin messaging
              </p>
              <button className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Start New Chat
              </button>
              
              {/* Footer de encriptación */}
              <div className="encryption-footer mt-auto pt-8 pb-4 flex items-center justify-center text-xs text-gray-400">
                <Lock className="w-4 h-4 mr-1.5" />
                <span>Your messages are encrypted using</span>
                <img 
                  src="/EchoProtocolLogo.png" 
                  alt="Echo Protocol" 
                  className="h-4 ml-1.5" 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;