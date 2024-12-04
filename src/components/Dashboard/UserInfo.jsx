import React from 'react';

const UserInfo = ({ username, userId }) => {
  return (
    <div className="user-info-container">
      <h3>Logged in as:</h3>
      <p>{username}</p>
      <p>{userId}</p>
    </div>
  );
};

export default UserInfo;
