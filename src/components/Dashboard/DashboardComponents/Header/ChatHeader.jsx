import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const ChatHeader = ({ userId, activeChat, isHovered, token }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token]);

  const getConsistentColor = (username) => {
    const colors = ['FF5733', '33FF57', '3357FF', 'F033FF', 'FF33F0'];
    return colors[username.length % colors.length];
  };

  const handleAddFriend = () => {
    if (!socket || !socket.connected) {
      alert("Not connected to server. Please refresh the page.");
      return;
    }

    if (!userId) {
      alert("You need to be logged in to add friends");
      return;
    }

    if (!activeChat?.id) {
      alert("No user selected to add as friend");
      return;
    }

    setIsLoading(true);
    setMenuOpen(false);
    
    socket.emit('addFriend', { 
      userId: userId, 
      targetUserId: activeChat.id 
    }, (response) => {
      setIsLoading(false);
      if (response?.success) {
        setIsFriend(true);
        alert(`You are now friends with ${activeChat.username}!`);
      } else {
        alert(response?.error || "Failed to add friend");
      }
    });
  };

  if (!activeChat) return null;

  const isOnline = activeChat.isOnline || activeChat.status === "Online";
  const statusText = activeChat.status || (isOnline ? "Online" : "Offline");

  return (
    <div className={`p-4 flex justify-between items-center transition-all border-b
      ${isHovered ? 'bg-gray-800' : 'bg-black'}
      ${activeChat ? 'border-indigo-500' : 'border-gray-800'}
    `}>
      <div className="flex items-center gap-4">
        <button 
          className="md:hidden p-1 rounded-full hover:bg-gray-700 transition-colors mr-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden border-2 border-black">
            <img
              src={
                activeChat.profileImage ||
                `https://ui-avatars.com/api/?name=${activeChat.username}&background=${getConsistentColor(activeChat.username)}&color=fff`
              }
              alt={activeChat.username}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${activeChat.username}&background=${getConsistentColor(activeChat.username)}&color=fff`;
              }}
            />
          </div>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black
            ${isOnline ? 'bg-green-500' : 'bg-gray-500'}
          `}></span>
        </div>
        
        <div>
          <h3 className="font-semibold text-white">{activeChat.username}</h3>
          <p className="text-sm text-gray-400">
            {statusText}
            {activeChat.lastSeen && !isOnline && (
              ` · Last seen ${new Date(activeChat.lastSeen).toLocaleTimeString()}`
            )}
          </p>
        </div>
      </div>
      
      <div className="flex gap-4 relative" ref={menuRef}>
        <button 
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="More options"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
        
        {menuOpen && (
          <div className="absolute right-0 mt-12 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
              onClick={() => {
                setMenuOpen(false);
                navigate(`/profile/${activeChat.id}`);
              }}
            >
              Profile
            </button>
            
            {!isFriend && (
              <button
                className={`w-full text-left px-4 py-2 hover:bg-gray-700 text-white ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={handleAddFriend}
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Friend'}
              </button>
            )}
            
            {isFriend && (
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-green-400"
                disabled
              >
                Friends ✓
              </button>
            )}
            
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
              onClick={() => {
                setMenuOpen(false);
                alert("Block clicked!");
              }}
            >
              Block
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;