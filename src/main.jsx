import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme.css';
import App from './App.jsx';
import './i18n/config.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { AuthProvider } from './store/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
