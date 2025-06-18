import { useState } from "react";
import Friends from "./Friends/Friends";
import UserChat from "./Chat/Chat";
import {
  Search,
  MessageCircle,
  User,
  Users,
  Phone,
  Video,
  MoreHorizontal,
  Plus,
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

  const handleSearch = () => {
    console.log("Searching for:", searchTerm);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar - Friends List */}
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

        {/* Bottom Navigation */}
        <div className="bottom-nav">
          <div className="nav-icons">
            <button className="nav-icon">
              <User className="icon" />
            </button>
            <button className="nav-icon">
              <MessageCircle className="icon" />
            </button>
            <button className="nav-icon">
              <Users className="icon" />
            </button>
          </div>
          <button className="user-avatar" onClick={handleProfileClick}>
            <img
              src={profileImage}
              alt="User Avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff`;
              }}
            />
          </button>
        </div>
      </nav>

      {/* Main Chat Area - Solo se muestra si hay un chat activo */}
      {activeChat ? (
        <div className="dashboard-content">
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
        </div>
      ) : (
        /* Estado cuando no hay chat seleccionado */
        <div className="dashboard-content empty-state">
          <div className="empty-chat-container">
            <div className="empty-chat-icon">
              <MessageCircle size={48} />
            </div>
            <h3>Select a chat</h3>
            <p>Choose a friend from the list to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;