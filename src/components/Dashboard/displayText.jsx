import './DisplayText.css';

const displayText = ({ messages = [] }) => {
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
        </li>
      ))}
    </ul>
  );
};

export default displayText;