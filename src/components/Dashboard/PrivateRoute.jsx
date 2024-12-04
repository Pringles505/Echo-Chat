import { Navigate } from 'react-router-dom';

//Checks if the user is authenticated by checking if the token is present in the local storage
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('CHECKING TOKEN', token);
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;