import PropTypes from 'prop-types';

const UserInfo = ({ username, userId }) => {
  return (
    <div className="user-info-container">
      <h3>Logged in as:</h3>
      <p>{username}</p>
      <p>{userId}</p>
    </div>
  );
};

UserInfo.propTypes = {
  username: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default UserInfo;
