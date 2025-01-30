import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

//Checks if the user is authenticated by checking if the token is present in the local storage
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('CHECKING TOKEN', token);
  return token ? children : <Navigate to="/login" />;
};

PrivateRoute.propTypes = {
  children: PropTypes.func.isRequired,
};

export default PrivateRoute;