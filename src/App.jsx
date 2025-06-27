import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
import { useLocation, Navigate } from 'react-router-dom';
import './App.css';

// Auth & Main Pages
import Login from './components/Login';
import Register from './components/Register';
import HomePage from './components/HomePage';

// Dashboard Components
import Dashboard from './components/Dashboard/Dashboard';
import Chat from './components/Dashboard/Chat/Chat';
import UserProfile from './components/UserProfile';
import PrivateRoute from './components/auth/PrivateRoute';

// Footer Components
import PrivacyPolicy from './components/HomepageComponents/FooterComponents/Legal/PrivacyPolicy';
import TermsOfService from './components/HomepageComponents/FooterComponents/Legal/TermsOfService';
import CookiePolicy from './components/HomepageComponents/FooterComponents/Legal/CookiePolicy';
import GDPR from './components/HomepageComponents/FooterComponents/Legal/GDPR';
import ContactUs from './components/HomepageComponents/FooterComponents/ContactUs';
import Documentation from './components/HomepageComponents/FooterComponents/Documentation';

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
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/documentation" element={<Documentation />} />
        
        {/* Legal Routes */}
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/legal/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
        <Route path="/legal/gdpr" element={<GDPR />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/profile/:userId" element={<PrivateRoute><UserProfileRoute /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;