import React from 'react';

const SeText = ({ messages = [] }) => {
  console.log('SeText messages:', messages); // Log the messages prop

  return (
    <ul>
      {messages.map((message) => (
        <li key={message._id}>{message.text}</li>
      ))}
    </ul>
  );
};

export default SeText;