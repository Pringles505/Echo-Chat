import ConversationItem from "./ConversationItem";

const ConversationList = ({
  conversations,
  activeChat,
  handleChatSelect,
  setIsHovered
}) => {
  return (
    <div className="conversations-list">
      {conversations.map(conversation => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeChat?.id === conversation.id}
          onSelect={handleChatSelect}
          setIsHovered={setIsHovered}
        />
      ))}
    </div>
  );
};

export default ConversationList;