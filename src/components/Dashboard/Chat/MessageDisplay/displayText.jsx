import PropTypes from 'prop-types';
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div key={message._id} className="space-y-2">
          {shouldShowDate(index) && (
            <div className="flex justify-center my-4">
              <span className="bg-gray-700 text-gray-300 text-sm px-3 py-1 rounded-full">
                {format(new Date(message.createdAt), 'PPPP', { locale: es })}
              </span>
            </div>
          )}

          <div className={`flex ${message.userId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg p-3 ${message.userId === currentUserId 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-white rounded-bl-none'}`}
            >
              <div className="flex items-baseline justify-between space-x-2">
                {message.userId !== currentUserId && (
                  <strong className="text-sm font-semibold text-indigo-300">
                    {message.username}
                  </strong>
                )}
                <div className="flex items-center">
                  <span className="text-sm text-gray-300">
                    {format(new Date(message.createdAt), 'HH:mm')}
                  </span>
                  {message.userId === currentUserId && (
                    <span className={`ml-2 text-sm ${message.seenStatus ? 'text-blue-300' : 'text-gray-400'}`}>
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1 text-sm">{message.text}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

DisplayText.propTypes = {
  messages: PropTypes.array.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default DisplayText;