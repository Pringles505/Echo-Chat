const displayText = ({ messages = [] }) => {
  console.log('display messages:', messages); 

  return (
    <ul>
      {messages.map((message) => (
        <li key={message._id}>{message.text}</li>
      ))}
    </ul>
  );
};

export default displayText;