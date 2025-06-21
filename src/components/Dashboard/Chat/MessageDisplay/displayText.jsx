import PropTypes from 'prop-types';
import './DisplayText.css';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

const DisplayText = ({ messages = [], currentUserId }) => {
  const shouldShowDate = (index) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].createdAt);
    const prevDate = new Date(messages[index - 1].createdAt);
    return !isSameDay(currentDate, prevDate);
  };

  return (
    <ul className="chat-messages">
      {messages.map((message, index) => (
        <div key={message._id}>
          {shouldShowDate(index) && (
            <div className="date-divider">
              <span className="date-label">
                {format(new Date(message.createdAt), 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}

          {/* Contenedor del mensaje con alineación específica */}
          <div className={`message-container ${message.userId === currentUserId ? 'sent' : 'received'}`}>
            <li className={`chat-message ${message.userId === currentUserId ? 'sent' : 'received'}`}>
              <div className="message-header">
                <strong className="message-username">{message.username}</strong>
                <span className="message-timestamp">
                  {format(new Date(message.createdAt), 'HH:mm')}
                  {message.userId === currentUserId && (
                    <span className={`whatsapp-ticks ${message.seenStatus ? 'seen' : 'sent'}`}>
                      ✓✓
                    </span>
                  )}
                </span>
              </div>
              <div className="message-text">{message.text}</div>
            </li>
          </div>
        </div>
      ))}
    </ul>
  );
};

DisplayText.propTypes = {
  messages: PropTypes.array.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default DisplayText;