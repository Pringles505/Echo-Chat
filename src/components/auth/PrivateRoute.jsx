import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import EldUnlockGate from './EldUnlockGate';

//Checks if the user is authenticated by checking if the token is present in the local storage
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <EldUnlockGate token={token}>{children}</EldUnlockGate>;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;
