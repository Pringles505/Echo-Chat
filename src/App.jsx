import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Dashboard/Chat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/" element={<Login />} /> 
      </Routes>
    </Router>
  );
}

export default App;
