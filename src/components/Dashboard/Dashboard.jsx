import { useState, useEffect, useRef } from "react";
import Friends from "./Friends/Friends";
import Chat from "./Chat/Chat";
import {
  Search,
  MessageCircle,
  User,
  Users,
  MoreHorizontal,
  Plus,
  LogOut,
  Lock
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
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
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('dashboardView') || 'chats';
  });
  const [recentConversations, setRecentConversations] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [conversationsSearchTerm, setConversationsSearchTerm] = useState("");

  // Refs para controlar el scroll
  const messagesEndRef = useRef(null);
  const conversationsListRef = useRef(null);

  // Cargar conversaciones recientes y mensajes no leídos al montar el componente
  useEffect(() => {
    if (userId) {
      const savedConversations = localStorage.getItem(`recentConversations-${userId}`);
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        setRecentConversations(parsedConversations);
        
        const unreads = {};
        parsedConversations.forEach(conv => {
          unreads[conv.id] = localStorage.getItem(`unread-${userId}-${conv.id}`) || 0;
        });
        setUnreadMessages(unreads);
      }
    }
  }, [userId]);

  // Scroll al final de los mensajes cuando cambian
  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Scroll al final de la lista de conversaciones cuando se actualiza
  useEffect(() => {
    if (conversationsListRef.current) {
      conversationsListRef.current.scrollTop = 0;
    }
  }, [recentConversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Guardar conversaciones cuando cambian
  useEffect(() => {
    if (userId && recentConversations.length > 0) {
      localStorage.setItem(
        `recentConversations-${userId}`,
        JSON.stringify(recentConversations)
      );
    }
  }, [recentConversations, userId]);

  // Actualizar conversaciones recientes
  const updateRecentConversations = (friendData, message = null) => {
    setRecentConversations(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === friendData.id);
      let updatedConversations = [...prev];
      
      if (existingIndex >= 0) {
        updatedConversations[existingIndex] = {
          ...updatedConversations[existingIndex],
          lastMessage: message?.text || updatedConversations[existingIndex].lastMessage,
          lastMessageTime: message?.timestamp || updatedConversations[existingIndex].lastMessageTime
        };
        
        const [moved] = updatedConversations.splice(existingIndex, 1);
        updatedConversations.unshift(moved);
      } else {
        updatedConversations.unshift({
          ...friendData,
          lastMessage: message?.text || "",
          lastMessageTime: message?.timestamp || new Date().toISOString()
        });
        
        if (updatedConversations.length > 20) {
          updatedConversations = updatedConversations.slice(0, 20);
        }
      }
      
      return updatedConversations;
    });

    if (message && message.userId !== userId) {
      setUnreadMessages(prev => ({
        ...prev,
        [friendData.id]: (prev[friendData.id] || 0) + 1
      }));
      localStorage.setItem(`unread-${userId}-${friendData.id}`, unreadMessages[friendData.id] + 1);
    }
  };

  const handleChatSelect = (conversation) => {
    setActiveChat(conversation);
    setUnreadMessages(prev => ({
      ...prev,
      [conversation.id]: 0
    }));
    localStorage.setItem(`unread-${userId}-${conversation.id}`, 0);
  };

  const handleActiveChatChange = (friendData) => {
    handleChatSelect(friendData);
    updateRecentConversations(friendData);
  };

  const handleNewMessage = (message) => {
    if (message.userId === activeChat?.id) {
      updateRecentConversations(activeChat, message);
    } else {
      const friend = recentConversations.find(c => c.id === message.userId) || 
                    { id: message.userId, username: message.username };
      updateRecentConversations(friend, message);
    }
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

  const handleViewChange = (view) => {
    setActiveView(view);
    localStorage.setItem('dashboardView', view);
  };

  const filteredConversations = recentConversations
    .filter(conv =>
      conv.username.toLowerCase().includes(conversationsSearchTerm.toLowerCase()) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(conversationsSearchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

  return (
    <div className="dashboard-container">
      {/* Left Sidebar */}
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
                  e.target.src = `https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff`;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <nav className="dashboard-nav">
        <div className="nav-header">
          <div className="logo-container">
            <img
              src="./echo-logo-text.png"
              alt="ECHO Logo"
              className="header-logo"
            />
          </div>

          <div className="search-container">
            <div className="search-input-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder={
                  activeView === 'friends' 
                    ? "Search for friends..." 
                    : "Search conversations..."
                }
                className="search-input"
                value={activeView === 'friends' ? searchTerm : conversationsSearchTerm}
                onChange={(e) => 
                  activeView === 'friends' 
                    ? setSearchTerm(e.target.value) 
                    : setConversationsSearchTerm(e.target.value)
                }
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            {activeView === 'friends' && (
              <button className="search-button" onClick={handleSearch}>
                <Plus className="icon" />
              </button>
            )}
          </div>
        </div>

        <div className="content-container">
          {activeView === 'friends' ? (
            <Friends
              token={token}
              onActiveChatChange={handleActiveChatChange}
              searchTerm={searchTerm}
              onSearch={handleSearch}
            />
          ) : (
            <div className="recent-chats-view">
              <h3 className="recent-chats-title">Recent Conversations</h3>
              {filteredConversations.length > 0 ? (
                <div className="conversations-list" ref={conversationsListRef}>
                  {filteredConversations.map(conversation => (
                    <div 
                      key={conversation.id} 
                      className={`chat-item ${activeChat?.id === conversation.id ? 'active' : ''}`}
                      onClick={() => handleChatSelect(conversation)}
                    >
                      <div className="chat-avatar-container">
                        <img
                          src={conversation.profileImage || 
                               `https://ui-avatars.com/api/?name=${conversation.username}&background=6366f1&color=fff`}
                          alt={conversation.username}
                          className="chat-avatar"
                        />
                        {unreadMessages[conversation.id] > 0 && (
                          <span className="message-badge">
                            {unreadMessages[conversation.id]}
                          </span>
                        )}
                      </div>
                      <div className="chat-info">
                        <div className="chat-header">
                          <h4>{conversation.username}</h4>
                          <span className="chat-time">
                            {conversation.lastMessageTime 
                              ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                        <p className="last-message">
                          {conversation.lastMessage 
                            ? conversation.lastMessage.length > 30 
                              ? conversation.lastMessage.substring(0, 30) + '...' 
                              : conversation.lastMessage
                            : 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-chats">
                  {conversationsSearchTerm 
                    ? 'No conversations match your search'
                    : 'No recent conversations'}
                </p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Right Section - Chat Area */}
      <div className="dashboard-content">
        {activeChat ? (
          <div className="chat-container">
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

            {/* Messages Container with controlled scroll */}
            <div className="messages-container">
              <Chat 
                token={token} 
                activeChat={activeChat.id} 
                onNewMessage={handleNewMessage}
              />
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-chat-container">
              <div className="empty-chat-icon animate-bounce">
                <MessageCircle size={64} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mt-4">
                {activeView === 'chats' ? 'Select a conversation' : 'No chat selected'}
              </h3>
              <p className="text-gray-500 max-w-md text-center mt-2">
                {activeView === 'chats' 
                  ? 'Choose a conversation from the list or start a new chat with a friend'
                  : 'Search for a friend to start a new conversation'}
              </p>
              
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