import PropTypes from 'prop-types';
import './DisplayText.css';

const DisplayText = ({ messages = [] }) => {
  console.log('display messages:', messages);

  return (
    <ul className="chat-messages">
      {messages.map((message) => (
        <li key={message._id} className="chat-message">
          <div className="message-header">
            <strong className="message-username">{message.username}</strong>
            <span className="message-timestamp">{new Date(message.createdAt).toLocaleString()}</span>
          </div>
          <div className="message-text">{message.text}</div>
          {message.seenStatus && (
            <div className="message-seen-status">✅ Seen</div>
          )}
        </li>
      ))}
    </ul>
  );
};

DisplayText.propTypes = {
  messages: PropTypes.array.isRequired,
};

export default DisplayText;
