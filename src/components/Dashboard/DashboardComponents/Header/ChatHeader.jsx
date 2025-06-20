import { MoreHorizontal } from "lucide-react";

const ChatHeader = ({ activeChat, isHovered }) => {
  if (!activeChat) return null;

  return (
    <div className={`chat-header ${isHovered ? 'hovered' : ''}`}>
      <div className="chat-info">
        <div className="chat-avatar">
          <img
            src={
              activeChat.profileImage ||
              `https://ui-avatars.com/api/?name=${activeChat.username}&background=${getConsistentColor(activeChat.username)}&color=fff`
            }
            alt={activeChat.username}
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${activeChat.username}&background=${getConsistentColor(activeChat.username)}&color=fff`;
            }}
          />
        </div>
        <div className="chat-details">
          <h3>{activeChat.username}</h3>
          <p>{activeChat.status || "Online"}</p>
        </div>
      </div>
      <div className="chat-actions">
        <button className="chat-action">
          <MoreHorizontal className="icon" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;