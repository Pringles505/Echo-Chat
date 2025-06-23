import ConversationItem from "./ConversationItem";

const ConversationList = ({
  conversations,
  activeChat,
  handleChatSelect,
  setIsHovered,
  ref
}) => {
  return (
    <div 
      ref={ref}
      className="p-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-black"
    >
      {conversations.length > 0 ? (
        conversations.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={activeChat?.id === conversation.id}
            onSelect={handleChatSelect}
            setIsHovered={setIsHovered}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <MessageCircle className="w-12 h-12 text-gray-500 mb-4" />
          <p className="text-gray-400">No conversations found</p>
        </div>
      )}
    </div>
  );
};

export default ConversationList;