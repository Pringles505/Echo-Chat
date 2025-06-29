import { useState } from 'react';
import PropTypes from 'prop-types';
import { Send } from 'lucide-react';

const SendText = ({ sendMessage }) => {
  const [text, setText] = useState('');

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-center p-3 bg-black border-t border-gray-800"
    >
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Type a message..."
        className="flex-1 py-3 px-5 bg-white/10 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#8e79f2] placeholder-gray-500 border border-gray-700"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className={`ml-3 p-3 rounded-full ${text.trim() ? 'bg-indigo-700 text-white hover:bg-[#8e79f2]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'} transition-colors`}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};

SendText.propTypes = {
  sendMessage: PropTypes.func.isRequired,
};

export default SendText;