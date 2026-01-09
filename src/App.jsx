import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
import { useLocation, Navigate } from 'react-router-dom';
import './App.css';

// Auth & Main Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
// import HomePage from './components/HomePage';
import LandingPage from './components/LandingPage';

// Dashboard Components
import Dashboard from './components/Dashboard/Dashboard';
import Chat from './components/Dashboard/Chat/Chat';
import UserProfile from './components/Dashboard/UserProfile';
import PrivateRoute from './components/auth/PrivateRoute';

// Pages
import Documentation from './pages/Documentation';
import Pricing from './pages/Pricing';
import Community from './pages/Community';
import SecuritySummit from './pages/CommunityEvents/SecuritySummit';
import GlobalHackathon from './pages/CommunityEvents/GlobalHackathon';
import TownHall from './pages/CommunityEvents/TownHall';
import Demo from './pages/Demo';
import APIPlayground from './pages/APIPlayground';

// Footer Components
import PrivacyPolicy from './components/HomepageComponents/FooterComponents/Legal/PrivacyPolicy';
import TermsOfService from './components/HomepageComponents/FooterComponents/Legal/TermsOfService';
import CookiePolicy from './components/HomepageComponents/FooterComponents/Legal/CookiePolicy';
import GDPR from './components/HomepageComponents/FooterComponents/Legal/GDPR';
import ContactUs from './components/HomepageComponents/FooterComponents/ContactUs';
import DocumentationLegacy from './components/HomepageComponents/FooterComponents/Documentation';
import AboutUs from './components/HomepageComponents/FooterComponents/AboutUs';
import BlogPage from './components/HomepageComponents/Blog';
import CommunityPage from './components/HomepageComponents/FooterComponents/Community';

// Widgets
import EchoChatWidget from './components/EchoChatWidget/EchoChatWidget';

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
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/documentation/guides" element={<Documentation />} />
        <Route path="/documentation/protocols" element={<Documentation />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/events/security-summit" element={<SecuritySummit />} />
        <Route path="/community/events/hackathon" element={<GlobalHackathon />} />
        <Route path="/community/events/town-hall" element={<TownHall />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/api-playground" element={<APIPlayground />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/blog" element={<BlogPage />} />

        {/* Legacy Routes */}
        <Route path="/documentation-legacy" element={<DocumentationLegacy />} />
        <Route path="/community-legacy" element={<CommunityPage />} />

        {/* Legal Routes */}
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/legal/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
        <Route path="/legal/gdpr" element={<GDPR />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/profile/:userId" element={<UserProfileRoute />} />
      </Routes>

      {/* Chat Widget - Global */}
      <EchoChatWidget />
    </Router>
  );
}

export default App;
