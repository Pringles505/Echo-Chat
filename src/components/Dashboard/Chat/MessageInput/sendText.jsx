import { useState } from 'react';
import PropTypes from 'prop-types';

import './SendText.css';

const SendText = ({ sendMessage }) => {
  const [text, setText] = useState('');

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (text) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="send-text-form">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Type a message..."
        className="send-text-input"
      />
    </form>
  );
};

SendText.propTypes = {
  sendMessage: PropTypes.func.isRequired,
};

export default SendText;
