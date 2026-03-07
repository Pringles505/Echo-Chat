import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'

// Redirects to /login if no auth token is found in localStorage
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to='/login' replace />
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

export default PrivateRoute
