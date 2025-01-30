import { useState } from 'react';
import PropTypes from 'prop-types';

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
    <form onSubmit={handleSubmit}>
      <input type="text" value={text} onChange={handleChange} />
      <button type="submit">Send</button>
    </form>
  );
};

SendText.propTypes = {
  sendMessage: PropTypes.func.isRequired,
};

export default SendText;
