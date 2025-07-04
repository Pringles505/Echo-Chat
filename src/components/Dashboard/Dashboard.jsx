import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Lock, MessageCircle } from "lucide-react";
import Friends from "./Friends/Friends";
import Chat from "./Chat/Chat";
import Sidebar from "./DashboardComponents/Sidebar/Sidebar";
import ChatHeader from "./DashboardComponents/Header/ChatHeader";
import ConversationList from "./DashboardComponents/Conversations/ConversationList";
import { useConversations } from "./DashboardComponents/hooks/useConversations";
import { getUserData, fetchUserProfileFromSocket, getCachedUserProfile, formatProfileImage } from "./DashboardComponents/utils/helpers";
import { WALLPAPER_PREVIEWS } from "./DashboardComponents/utils/wallpaper";
import io from 'socket.io-client';

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { username, userId, profileImage } = getUserData(token);
  localStorage.setItem('userId', userId);
  
  // Estados
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('dashboardView') || 'chats';
  });
  const [conversationsSearchTerm, setConversationsSearchTerm] = useState("");
  const [isChatItemHovered, setIsChatItemHovered] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    const saved = localStorage.getItem('chatWallpaper');
    return saved && WALLPAPER_PREVIEWS[saved] ? saved : 'default';
  });
  const [userProfileImage, setUserProfileImage] = useState(profileImage);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection and fetch user profile
  useEffect(() => {
    if (!token || !userId) return;

    console.log('Initializing socket connection for profile fetching...');
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for profile fetching');
      setSocket(newSocket);
      
      // Fetch user profile immediately after connection
      fetchUserProfileFromSocket(newSocket, userId)
        .then((profileData) => {
          console.log('Profile data fetched:', profileData);
          if (profileData.profilePicture) {
            const formattedImage = formatProfileImage(profileData.profilePicture, username);
            setUserProfileImage(formattedImage);
          }
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error);
        });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocket(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, userId, username]);

  // Listen for profile updates from localStorage
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (userId) {
        const cachedProfile = getCachedUserProfile(userId);
        if (cachedProfile && cachedProfile.profilePicture) {
          const formattedImage = formatProfileImage(cachedProfile.profilePicture, username);
          setUserProfileImage(formattedImage);
        }
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [userId, username]);

  // Precarga los recursos de los wallpapers
  useEffect(() => {
    Object.values(WALLPAPER_PREVIEWS).forEach(wp => {
      if (wp.type === 'image' && wp.imageUrl) {
        new Image().src = wp.imageUrl;
      }
      if (wp.type === 'video' && wp.posterUrl) {
        new Image().src = wp.posterUrl;
      }
      if (wp.type === 'video' && wp.videoUrl) {
        // Precargar video (opcional)
        const video = document.createElement('video');
        video.src = wp.videoUrl;
      }
    });
  }, []);

  // Hooks personalizados
  const { recentConversations, updateRecentConversations } = useConversations(userId);
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

  const handleWallpaperChange = (wallpaper) => {
    if (WALLPAPER_PREVIEWS[wallpaper]) {
      setCurrentWallpaper(wallpaper);
      localStorage.setItem('chatWallpaper', wallpaper);
    }
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
    // Clear all cached data
    localStorage.clear();
    if (socket) {
      socket.disconnect();
    }
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
    <div className="flex justify-center items-center h-full p-8">
      <div className="text-center max-w-[300px]">
        <div className="animate-bounce mb-6">
          <MessageCircle size={64} strokeWidth={1.5} className="text-gray-400 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-white mt-4 mb-2">
          {activeView === 'chats' ? 'Select a conversation' : 'No chat selected'}
        </h3>
        <p className="text-gray-300 max-w-md text-center">
          {activeView === 'chats' 
            ? 'Choose a conversation from the list or start a new chat with a friend'
            : 'Search for a friend to start a new conversation'}
        </p>
        
        <div className="flex items-center justify-center text-xs text-gray-400 mt-8 pt-8 pb-4 border-t border-gray-700">
          <Lock className="w-4 h-4 mr-1.5" />
          <span>Your messages are encrypted using</span>
          <img 
            src="/EchoProtocolLogo.png" 
            alt="Echo Protocol" 
            className="h-12 ml-1.5" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        handleViewChange={handleViewChange}
        handleProfileClick={handleProfileClick}
        handleLogout={handleLogout}
        profileImage={userProfileImage}
        username={username}
        unreadMessages={unreadMessages}
        onWallpaperChange={handleWallpaperChange}
        currentWallpaper={currentWallpaper}
      />

      {/* Navigation Panel */}
      <div className="w-80 bg-black border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="./echo-logo-text.png"
              alt="ECHO Logo"
              className="h-8"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder={
                  activeView === 'friends' 
                    ? "Search for friends..." 
                    : "Search conversations..."
                }
                className="w-full px-6 py-3 bg-white/10 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8e79f2] focus:border-[#8e79f2] text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                value={activeView === 'friends' ? searchTerm : conversationsSearchTerm}
                onChange={(e) => 
                  activeView === 'friends' 
                    ? setSearchTerm(e.target.value) 
                    : setConversationsSearchTerm(e.target.value)
                }
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button 
                className="absolute right-4 top-3 text-gray-400 hover:text-white"
                onClick={handleSearch}
              >
                <Search className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-black">
          {activeView === 'friends' ? (
            <Friends
              token={token}
              onActiveChatChange={handleActiveChatChange}
              searchTerm={searchTerm}
            />
          ) : (
            <div>
              {filteredConversations.length > 0 ? (
                <ConversationList
                  conversations={filteredConversations}
                  activeChat={activeChat}
                  userId={userId}
                  handleChatSelect={handleChatSelect}
                  setIsHovered={setIsChatItemHovered}
                  ref={conversationsListRef}
                />
              ) : (
                <p className="text-gray-400 text-sm p-4">
                  {conversationsSearchTerm 
                    ? 'No conversations match your search'
                    : 'No recent conversations'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-black">
        {activeChat ? (
          <div className="flex flex-col h-full">
            <ChatHeader activeChat={activeChat} userId={userId} token={token} />
            <div className="flex-1 overflow-hidden">
              <Chat 
                token={token} 
                activeChat={activeChat.id} 
                onNewMessage={handleNewMessage}
                currentWallpaper={currentWallpaper}
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