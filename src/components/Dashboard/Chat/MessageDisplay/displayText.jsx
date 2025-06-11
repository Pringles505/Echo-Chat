import PropTypes from 'prop-types';
import './DisplayText.css';

const DisplayText = ({ messages = [], currentUserId }) => {
  console.log('DisplayText re-rendered with messages:', messages);
  return (
    <ul className="chat-messages">
      {messages.map((message) => (
        <li key={message._id} className={`chat-message${message.userId !== currentUserId ? " other" : ""}`}>
          <div className="message-header">
            <strong className="message-username">{message.username}</strong>
            <span className="message-timestamp">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="message-text">{message.text}</div>
          {currentUserId === message.userId && message.seenStatus && (
            <div className="message-seen-status">✅ Seen</div>
          )}
        </li>
      ))}
    </ul>
  );
};

DisplayText.propTypes = {
  messages: PropTypes.array.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default DisplayText;
