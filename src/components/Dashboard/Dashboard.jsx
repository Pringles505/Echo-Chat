import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Lock, MessageCircle, Menu, X, ArrowLeft } from "lucide-react";
import Friends from "./Friends/Friends";
import Chat from "./Chat/Chat";
import Sidebar from "./DashboardComponents/Sidebar/Sidebar";
import ChatHeader from "./DashboardComponents/Header/ChatHeader";
import ConversationList from "./DashboardComponents/Conversations/ConversationList";
import { useConversations } from "./DashboardComponents/hooks/useConversations";
import { getUserData, fetchUserProfileFromSocket, getCachedUserProfile, formatProfileImage } from "./DashboardComponents/utils/helpers";
import { WALLPAPER_PREVIEWS } from "./DashboardComponents/utils/wallpaper";
import { getSocket } from "../../socket";
import IncomingCallNotification from "../VideoCall/IncomingCallNotification";
import { clearAllSessionKeys } from "./Chat/utils/chat/keyManagement";
import { decryptIncomingMessage } from "./Chat/utils/chat/messageDecryption";
import { base64ToArrayBuffer } from "./Chat/utils/helpers";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { username, userId, profileImage } = getUserData(token);
  localStorage.setItem('userId', userId);
  localStorage.setItem('username', username);
  
  // Estados
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('dashboardView') || 'chats';
  });
  const [conversationsSearchTerm, setConversationsSearchTerm] = useState("");
  const [isChatItemHovered, setIsChatItemHovered] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(() => {
    // Initialize unread messages from localStorage
    const unread = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`unread-${userId}-`)) {
        const senderId = key.replace(`unread-${userId}-`, '');
        const count = parseInt(localStorage.getItem(key) || '0', 10);
        if (count > 0) {
          unread[senderId] = count;
        }
      }
    }
    return unread;
  });
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    const saved = localStorage.getItem('chatWallpaper');
    return saved && WALLPAPER_PREVIEWS[saved] ? saved : 'default';
  });
  const [userProfileImage, setUserProfileImage] = useState(profileImage);
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Hooks personalizados - must be before useEffects that use them
  const { recentConversations, updateRecentConversations } = useConversations(userId);
  const messagesEndRef = useRef(null);
  const conversationsListRef = useRef(null);

  // Initialize socket connection and fetch user profile
  useEffect(() => {
    if (!token || !userId) return;

    console.log('Initializing socket connection for profile fetching...');
    const sharedSocket = getSocket();
    setSocket(sharedSocket);

    const onConnect = () => {
      console.log('Socket connected for profile fetching');

      // Fetch user profile immediately after connection
      fetchUserProfileFromSocket(sharedSocket, userId)
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
    };

    if (sharedSocket.connected) {
      onConnect();
    } else {
      sharedSocket.on('connect', onConnect);
    }

    sharedSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for incoming calls
    sharedSocket.on('incomingCall', (callData) => {
      console.log('Incoming call:', callData);
      setIncomingCall(callData);
    });

    // Listen for new messages to update unread count and decrypt in background
    const handleNewMessageNotification = async (messageData) => {
      console.log('📬 New message received in Dashboard:', messageData);

      // Handle both single message and array of messages
      const messages = Array.isArray(messageData) ? messageData : [messageData];

      // Get user's private key for decryption
      const storedPrivateKey = localStorage.getItem("privateKeyX25519");
      const privateKeyArray = base64ToArrayBuffer(storedPrivateKey);

      // Process each message for notifications
      for (const message of messages) {
        console.log('📬 Processing message:', message);
        console.log('📬 Current userId:', userId);
        console.log('📬 Message from userId:', message.userId);
        console.log('📬 Active chat:', activeChat?.id);
        console.log('📬 Is initial message?:', message.is_initial);

        // Only process if the message is FROM another user (not sent by current user)
        // and is not part of the currently active chat
        if (message.userId && message.userId !== userId && message.userId !== activeChat?.id) {
          const senderId = message.userId;
          console.log('✅ Processing notification for sender:', senderId);

          // DECRYPT MESSAGE IN BACKGROUND
          try {
            console.log('🔐 [Dashboard] Attempting background decryption...');
            await decryptIncomingMessage(
              message,
              userId,
              senderId,
              privateKeyArray,
              sharedSocket,
              null // No setMessages - we're in background mode
            );
            console.log('✅ [Dashboard] Message decrypted in background');
          } catch (error) {
            console.error('❌ [Dashboard] Failed to decrypt message in background:', error);
            // Continue with notification even if decryption fails
          }

          setUnreadMessages(prev => {
            const currentUnread = prev[senderId] || 0;
            const newCount = currentUnread + 1;

            // Persist to localStorage
            localStorage.setItem(`unread-${userId}-${senderId}`, newCount);
            console.log(`📊 Unread count for ${senderId}: ${newCount}`);

            return {
              ...prev,
              [senderId]: newCount
            };
          });

          // Fetch user info to get proper username and profile image
          console.log('🔍 Fetching user info for:', senderId);

          // IMPORTANT: Add conversation immediately with placeholder data
          // This ensures the first message shows up in the list right away
          const placeholderUser = {
            id: senderId,
            username: message.username || `User ${senderId}`,
            profileImage: null
          };

          // Add to recent conversations immediately so first message appears
          updateRecentConversations(placeholderUser, {
            text: '',
            timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
            userId: senderId
          });
          console.log('✅ Conversation added to recent list (placeholder)');

          // Then fetch proper user info to update with correct data
          sharedSocket.emit('getUserInfo', { userId: senderId }, (response) => {
            if (response.success && response.user) {
              console.log('✅ User info fetched:', response.user);
              const conversationUser = {
                id: senderId,
                username: response.user.username,
                profileImage: response.user.profilePicture
              };

              // Update conversation with proper user data
              updateRecentConversations(conversationUser, {
                text: '',
                timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
                userId: senderId
              });
              console.log('✅ Conversation updated with proper user info');
            } else {
              console.error('❌ Failed to fetch user info:', response);
            }
          });
        } else {
          console.log('⏭️ Skipping notification (own message or active chat)');
        }
      }
    };

    sharedSocket.on('newMessage', handleNewMessageNotification);

    console.log('Dashboard socket ID:', sharedSocket.id);

    return () => {
      sharedSocket.off('connect', onConnect);
      sharedSocket.off('incomingCall');
      sharedSocket.off('newMessage', handleNewMessageNotification);
      // Don't disconnect the shared socket here
    };
  }, [token, userId, username, activeChat, updateRecentConversations]);

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

  // Handlers
  const handleChatSelect = (conversation) => {
    setActiveChat(conversation);
    setShowMobileChat(true); // Show chat on mobile when selected
    setUnreadMessages(prev => ({
      ...prev,
      [conversation.id]: 0
    }));
    localStorage.setItem(`unread-${userId}-${conversation.id}`, 0);
  };

  const handleMobileBack = () => {
    setShowMobileChat(false);
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
    // Clear all ephemeral session keys from memory (security critical!)
    clearAllSessionKeys();
    console.log("🔐 All ephemeral encryption keys cleared from memory");

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
    .map(conv => ({
      ...conv,
      unreadCount: unreadMessages[conv.id] || 0
    }))
    .sort((a, b) => {
      // First, prioritize conversations with unread messages
      const aHasUnread = a.unreadCount > 0;
      const bHasUnread = b.unreadCount > 0;

      if (aHasUnread && !bHasUnread) return -1;
      if (!aHasUnread && bHasUnread) return 1;

      // Then sort by last message time
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

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
      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          callData={incomingCall}
          onClose={() => setIncomingCall(null)}
        />
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown via menu */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50
        transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <Sidebar
          activeView={activeView}
          handleViewChange={(view) => {
            handleViewChange(view);
            setIsMobileMenuOpen(false);
          }}
          handleProfileClick={() => {
            handleProfileClick();
            setIsMobileMenuOpen(false);
          }}
          handleLogout={handleLogout}
          profileImage={userProfileImage}
          username={username}
          unreadMessages={unreadMessages}
          onWallpaperChange={handleWallpaperChange}
          currentWallpaper={currentWallpaper}
        />
      </div>

      {/* Navigation Panel - Full width on mobile when chat not shown */}
      <div className={`
        ${showMobileChat ? 'hidden' : 'flex'} md:flex
        w-full md:w-80 bg-black border-r border-gray-700 flex-col
      `}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
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

      {/* Main Content Area - Full screen on mobile when chat shown */}
      <div className={`
        ${showMobileChat ? 'flex' : 'hidden'} md:flex
        flex-1 flex-col bg-black
      `}>
        {activeChat ? (
          <div className="flex flex-col h-full">
            {/* Mobile back button integrated with ChatHeader */}
            <div className="flex items-center md:block">
              <button
                className="md:hidden p-3 text-gray-400 hover:text-white"
                onClick={handleMobileBack}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex-1">
                <ChatHeader activeChat={activeChat} userId={userId} token={token} />
              </div>
            </div>
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