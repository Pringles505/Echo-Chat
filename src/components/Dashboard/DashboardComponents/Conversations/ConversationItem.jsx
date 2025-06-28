import { useEffect, useState } from "react";

const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  setIsHovered,
  userId,
  activeChat
}) => {
  const [latestMessage, setLatestMessage] = useState('');

  const getConsistentColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`.replace(/[^\d,]/g, '').split(',').slice(0, 2).join(',');
  };

  const avatarBgColor = getConsistentColor(conversation.username);

  useEffect(() => {
  const fetchLatest = () => {
    const targetUserId = conversation.targetUserId || conversation.id;
    const messagesKey = `chatSession-${userId}-${targetUserId}`;
    const messagesRaw = localStorage.getItem(messagesKey);

    if (!messagesRaw) {
      setLatestMessage('No messages yet');
      return;
    }

    try {
      const parsed = JSON.parse(messagesRaw);
      const messages = parsed.savedMessages;

      if (!Array.isArray(messages) || messages.length === 0) {
        setLatestMessage('No messages yet');
        return;
      }

      const lastMsg = messages[messages.length - 1];
      setLatestMessage(lastMsg?.text || 'No messages yet');
    } catch (err) {
      console.error("Error parsing messages:", err);
      setLatestMessage('No messages yet');
    }
  };

  // Initial fetch
  fetchLatest();

  // Listener for localStorage updates
  const handleStorageUpdate = () => {
    fetchLatest();
  };

  window.addEventListener('localStorageUpdated', handleStorageUpdate);

  // Cleanup
  return () => {
    window.removeEventListener('localStorageUpdated', handleStorageUpdate);
  };
}, [conversation, userId]);


  return (
    <li 
      className={`p-3 hover:bg-gray-800 cursor-pointer transition-colors ${isActive ? 'bg-gray-800' : ''}`}
      onClick={() => onSelect(conversation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={conversation.profileImage || 
                 `https://ui-avatars.com/api/?name=${conversation.username}&background=${avatarBgColor}&color=fff`}
            alt={conversation.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${conversation.username}&background=${avatarBgColor}&color=fff`;
              e.target.onerror = null;
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-white font-medium truncate">
              {conversation.username}
            </p>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {conversation.lastMessageTime 
                ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : ''}
            </span>
          </div>
          <p className="text-sm truncate text-gray-400">
            {latestMessage.length > 30 
              ? `${latestMessage.substring(0, 30)}...` 
              : latestMessage}
          </p>
        </div>
      </div>
    </li>
  );
};

export default ConversationItem;
