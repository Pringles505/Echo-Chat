const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  setIsHovered
}) => {
  // Función para generar color consistente basado en el username
  const getConsistentColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`.replace(/[^\d,]/g, '').split(',').slice(0, 2).join(',');
  };

  return (
    <div 
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center border
        ${isActive 
          ? 'bg-indigo-900/30 border-indigo-500' 
          : 'border-transparent hover:bg-gray-800 hover:border-gray-600'}
      `}
      onClick={() => onSelect(conversation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Contenedor del avatar */}
      <div className="relative mr-3 flex-shrink-0">
        <img
          src={conversation.profileImage || 
               `https://ui-avatars.com/api/?name=${conversation.username}&background=${getConsistentColor(conversation.username)}&color=fff`}
          alt={conversation.username}
          className={`w-10 h-10 rounded-full object-cover border-2
            ${isActive ? 'border-indigo-500' : 'border-gray-600'}
          `}
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${conversation.username}&background=${getConsistentColor(conversation.username)}&color=fff`;
            e.target.onerror = null; // Prevenir bucles
          }}
        />
        
        {/* Badge de mensajes no leídos */}
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {conversation.unreadCount}
          </span>
        )}
      </div>

      {/* Información del chat */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h4 className={`font-medium truncate 
            ${isActive ? 'text-white' : 'text-gray-200'}
            ${conversation.unreadCount > 0 ? 'font-semibold' : ''}
          `}>
            {conversation.username}
          </h4>
          
          <span className={`text-xs ml-2 whitespace-nowrap
            ${isActive ? 'text-indigo-300' : 'text-gray-500'}
          `}>
            {conversation.lastMessageTime 
              ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : ''}
          </span>
        </div>
        
        <p className={`text-sm truncate
          ${conversation.unreadCount > 0 
            ? 'text-white font-medium' 
            : isActive 
              ? 'text-indigo-200' 
              : 'text-gray-400'}
        `}>
          {conversation.lastMessage 
            ? conversation.lastMessage.length > 30 
              ? `${conversation.lastMessage.substring(0, 30)}...` 
              : conversation.lastMessage
            : 'No messages yet'}
        </p>
      </div>
    </div>
  );
};

export default ConversationItem;