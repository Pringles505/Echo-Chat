import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Lock, MessageCircle } from "lucide-react";
import Friends from "./Friends/Friends";
import Chat from "./Chat/Chat";
import Sidebar from "./DashboardComponents/Sidebar/Sidebar";
import ChatHeader from "./DashboardComponents/Header/ChatHeader";
import ConversationList from "./DashboardComponents/Conversations/ConversationList";
import { useConversations } from "./DashboardComponents/hooks/useConversations";
import { getUserData } from "./DashboardComponents/utils/helpers";
import "./Dashboard.css";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { username, userId, profileImage } = getUserData(token);
  
  // Estados
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('dashboardView') || 'chats';
  });
  const [conversationsSearchTerm, setConversationsSearchTerm] = useState("");
  const [isChatItemHovered, setIsChatItemHovered] = useState(false);

  // Hooks personalizados
  const { recentConversations, unreadMessages, updateRecentConversations } = useConversations(userId);
  const messagesEndRef = useRef(null);
  const conversationsListRef = useRef(null);

  // Handlers
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

  // Filtrado de conversaciones
  const filteredConversations = recentConversations
    .filter(conv =>
      conv.username.toLowerCase().includes(conversationsSearchTerm.toLowerCase()) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(conversationsSearchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
    .map(conv => ({
      ...conv,
      unreadCount: unreadMessages[conv.id] || 0
    }));

  // Componente EmptyState
  const EmptyState = ({ activeView }) => (
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
  );

  return (
    <div className="dashboard-container">
      <Sidebar
        activeView={activeView}
        handleViewChange={handleViewChange}
        handleProfileClick={handleProfileClick}
        handleLogout={handleLogout}
        profileImage={profileImage}
        username={username}
        unreadMessages={unreadMessages}
      />

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
              {filteredConversations.length > 0 ? (
                <ConversationList
                  conversations={filteredConversations}
                  activeChat={activeChat}
                  handleChatSelect={handleChatSelect}
                  setIsHovered={setIsChatItemHovered}
                  ref={conversationsListRef}
                />
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

      <div className="dashboard-content">
        {activeChat ? (
          <div className="chat-container">
            <ChatHeader activeChat={activeChat} isHovered={isChatItemHovered} />
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
          <EmptyState activeView={activeView} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;