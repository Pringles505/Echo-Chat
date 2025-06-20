const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  setIsHovered
}) => {
  return (
    <div 
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(conversation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="chat-avatar-container">
        <img
          src={conversation.profileImage || 
               `https://ui-avatars.com/api/?name=${conversation.username}&background=${getConsistentColor(conversation.username)}&color=fff`}
          alt={conversation.username}
          className="chat-avatar"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${conversation.username}&background=${getConsistentColor(conversation.username)}&color=fff`;
          }}
        />
        {conversation.unreadCount > 0 && (
          <span className="message-badge">
            {conversation.unreadCount}
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
  );
};

export default ConversationItem;