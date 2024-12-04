import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  // Retrieve the token from localStorage
  const token = localStorage.getItem('token');

  // Optional: You can add token validation here (e.g., check expiration)
  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const { exp } = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
      return Date.now() < exp * 1000; // Check if the token is still valid
    } catch (err) {
      console.error('Invalid token:', err);
      return false;
    }
  };

  const isAuthenticated = isTokenValid(token);

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
