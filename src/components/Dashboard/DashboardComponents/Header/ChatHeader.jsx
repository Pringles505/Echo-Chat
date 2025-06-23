import { MoreHorizontal, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChatHeader = ({ activeChat, isHovered }) => {
  const navigate = useNavigate();
  
  if (!activeChat) return null;

  const getConsistentColor = (username) => {
    const colors = ['FF5733', '33FF57', '3357FF', 'F033FF', 'FF33F0'];
    const index = username.length % colors.length;
    return colors[index];
  };

  // Determinar el estado de conexión
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
          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden border-2 border-indigo-500">
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
          {/* Punto de estado - ahora usa la variable isOnline */}
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
      
      <div className="flex gap-4">
        <button 
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;