import React, { useState } from 'react';

const Friends = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConversations, setActiveConversations] = useState([
    // Example data, replace with actual data
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
  ]);

  const handleSearch = () => {
    // Implement search logic here
    console.log('Searching for:', searchTerm);
  };

  return (
    <div className="friends-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div className="conversations-container">
        <h3>Active Conversations</h3>
        <ul>
          {activeConversations.map((conversation) => (
            <li key={conversation.id}>{conversation.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Friends;