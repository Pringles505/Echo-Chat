import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Dashboard/Chat';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Dashboard/PrivateRoute';
import HomePage from './components/HomePage';
import UserProfile from './components/UserProfile';
import { useLocation, Navigate } from 'react-router-dom';

function UserProfileRoute() {
  const { userId } = useParams();
  const location = useLocation();
  const user = location.state?.user || { id: userId };

  if (!user) return <Navigate to="/login" />;

  return (
    <UserProfile
      user={user}
      onChangePassword={() => alert('Change password clicked!')}
    />
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/" element={<HomePage />} />
        <Route path="/profile/:userId" element={<UserProfileRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
