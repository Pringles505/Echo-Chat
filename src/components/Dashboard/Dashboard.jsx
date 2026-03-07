import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Lock, MessageCircle } from 'lucide-react'
import Friends from './Friends/Friends'
import Chat from './Chat/Chat'
import Sidebar from './DashboardComponents/Sidebar/Sidebar'
import ChatHeader from './DashboardComponents/Header/ChatHeader'
import ConversationList from './DashboardComponents/Conversations/ConversationList'
import { useConversations } from '../../hooks/useConversations'
import {
  getUserData,
  fetchUserProfileFromSocket,
  getCachedUserProfile,
  formatProfileImage,
} from './DashboardComponents/utils/helpers'
import { WALLPAPER_PREVIEWS } from './DashboardComponents/utils/Wallpaper'
import { getSocket, connectSocket, disconnectSocket } from '../../services/socket'

const Dashboard = () => {
  const { t } = useTranslation()
  const token = localStorage.getItem('token')
  const navigate = useNavigate()
  const { username, userId, profileImage } = getUserData(token)

  // Estados
  const [activeChat, setActiveChat] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('dashboardView') || 'chats'
  })
  const [conversationsSearchTerm, setConversationsSearchTerm] = useState('')
  const [isChatItemHovered, setIsChatItemHovered] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState({})
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    const saved = localStorage.getItem('chatWallpaper')
    return saved && WALLPAPER_PREVIEWS[saved] ? saved : 'default'
  })
  const [userProfileImage, setUserProfileImage] = useState(profileImage)

  // Persist userId once on mount
  useEffect(() => {
    if (userId) localStorage.setItem('userId', userId)
  }, [userId])

  // Connect shared socket and fetch user profile
  useEffect(() => {
    if (!token || !userId) return

    connectSocket()
    const socket = getSocket()

    const onConnect = () => {
      fetchUserProfileFromSocket(socket, userId)
        .then((profileData) => {
          if (profileData?.profilePicture) {
            setUserProfileImage(formatProfileImage(profileData.profilePicture, username))
          }
        })
        .catch((error) => {
          console.error('[Dashboard] Failed to fetch user profile:', error)
        })
    }

    socket.on('connect', onConnect)

    // If already connected, fetch immediately
    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
    }
  }, [token, userId, username])

  // Listen for profile updates from localStorage
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (userId) {
        const cachedProfile = getCachedUserProfile(userId)
        if (cachedProfile && cachedProfile.profilePicture) {
          const formattedImage = formatProfileImage(cachedProfile.profilePicture, username)
          setUserProfileImage(formattedImage)
        }
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [userId, username])

  // Precarga los recursos de los wallpapers
  useEffect(() => {
    Object.values(WALLPAPER_PREVIEWS).forEach((wp) => {
      if (wp.type === 'image' && wp.imageUrl) {
        new Image().src = wp.imageUrl
      }
      if (wp.type === 'video' && wp.posterUrl) {
        new Image().src = wp.posterUrl
      }
      if (wp.type === 'video' && wp.videoUrl) {
        // Precargar video (opcional)
        const video = document.createElement('video')
        video.src = wp.videoUrl
      }
    })
  }, [])

  // Hooks personalizados
  const { recentConversations, updateRecentConversations } = useConversations(userId)
  const messagesEndRef = useRef(null)
  const conversationsListRef = useRef(null)

  // Handlers
  const handleChatSelect = (conversation) => {
    setActiveChat(conversation)
    setUnreadMessages((prev) => ({
      ...prev,
      [conversation.id]: 0,
    }))
    localStorage.setItem(`unread-${userId}-${conversation.id}`, 0)
  }

  const handleWallpaperChange = (wallpaper) => {
    if (WALLPAPER_PREVIEWS[wallpaper]) {
      setCurrentWallpaper(wallpaper)
      localStorage.setItem('chatWallpaper', wallpaper)
    }
  }

  const handleActiveChatChange = (friendData) => {
    handleChatSelect(friendData)
    updateRecentConversations(friendData)
  }

  const handleNewMessage = (message) => {
    if (message.userId === activeChat?.id) {
      updateRecentConversations(activeChat, message)
    } else {
      const friend = recentConversations.find((c) => c.id === message.userId) || {
        id: message.userId,
        username: message.username,
      }
      updateRecentConversations(friend, message)
    }
  }

  const handleProfileClick = () => {
    navigate(`/profile/${userId}`, { state: { username, userId } })
  }

  const handleLogout = () => {
    disconnectSocket()
    localStorage.clear()
    navigate('/')
  }

  const handleSearch = () => {
    // Search is driven by controlled input — no extra action needed
  }

  const handleViewChange = (view) => {
    setActiveView(view)
    localStorage.setItem('dashboardView', view)
  }

  // Filtrado de conversaciones
  const filteredConversations = recentConversations
    .filter(
      (conv) =>
        conv.username.toLowerCase().includes(conversationsSearchTerm.toLowerCase()) ||
        (conv.lastMessage &&
          conv.lastMessage.toLowerCase().includes(conversationsSearchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
    .map((conv) => ({
      ...conv,
      unreadCount: unreadMessages[conv.id] || 0,
    }))

  // ─── Extracted to avoid re-creation on every Dashboard render ─────────────────
  const EmptyState = ({ activeView, t }) => (
    <div className='flex justify-center items-center h-full p-8'>
      <div className='text-center max-w-[300px]'>
        <div className='animate-bounce mb-6'>
          <MessageCircle size={64} strokeWidth={1.5} className='text-gray-400 mx-auto' />
        </div>
        <h3 className='text-xl font-semibold text-white mt-4 mb-2'>
          {activeView === 'chats'
            ? t('dashboard.emptyState.selectChat')
            : t('dashboard.emptyState.noChatSelected')}
        </h3>
        <p className='text-gray-300 max-w-md text-center'>
          {activeView === 'chats'
            ? t('dashboard.emptyState.chooseConversation')
            : t('dashboard.emptyState.searchFriend')}
        </p>
        <div className='flex items-center justify-center text-xs text-gray-400 mt-8 pt-8 pb-4 border-t border-gray-700'>
          <Lock className='w-4 h-4 mr-1.5' />
          <span>{t('dashboard.emptyState.encrypted')}</span>
          <img src='/EchoProtocolLogo.png' alt='Echo Protocol' className='h-12 ml-1.5' />
        </div>
      </div>
    </div>
  )

  return (
    <div className='flex h-screen bg-black text-white'>
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
      <div className='w-80 bg-black border-r border-gray-700 flex flex-col'>
        <div className='p-4 border-b border-gray-700'>
          <div className='flex items-center gap-3 mb-4'>
            <img src='/echo-logo-text.png' alt='ECHO Logo' className='h-8' />
          </div>

          <div className='flex gap-2 mb-4'>
            <div className='relative w-full'>
              <input
                type='text'
                placeholder={
                  activeView === 'friends'
                    ? t('dashboard.search.friends')
                    : t('dashboard.search.conversations')
                }
                className='w-full px-6 py-3 bg-white/10 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8e79f2] focus:border-[#8e79f2] text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300'
                value={activeView === 'friends' ? searchTerm : conversationsSearchTerm}
                onChange={(e) =>
                  activeView === 'friends'
                    ? setSearchTerm(e.target.value)
                    : setConversationsSearchTerm(e.target.value)
                }
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className='absolute right-4 top-3 text-gray-400 hover:text-white'
                onClick={handleSearch}
              >
                <Search className='h-6 w-6' />
              </button>
            </div>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-black'>
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
                <p className='text-gray-400 text-sm p-4'>
                  {conversationsSearchTerm
                    ? t('dashboard.noConversationsMatch')
                    : t('dashboard.noRecentConversations')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col bg-black'>
        {activeChat ? (
          <div className='flex flex-col h-full'>
            <ChatHeader activeChat={activeChat} userId={userId} token={token} />
            <div className='flex-1 overflow-hidden'>
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
          <EmptyState activeView={activeView} t={t} />
        )}
      </div>
    </div>
  )
}

export default Dashboard
