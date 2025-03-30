import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Dashboard/Chat';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Dashboard/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/" element={
          <div className="min-h-screen bg-animated-gradient flex items-center justify-center">
            <div className="text-center space-y-6 p-6 bg-white rounded-lg shadow-xl max-w-md w-full">
              <img 
                src="./echo-logo.svg"
                alt="Echo logo"
                className="w-24 h-24 mx-auto mb-6" 
              />
              <h1 className="text-4xl font-bold mb-6 text-black">Welcome to Echo</h1>
              <div className="flex space-x-6 justify-center w-full">
                <a href="/login" className="button text-lg px-8 py-4 w-full rounded-full shadow-md hover:shadow-lg transform transition duration-300 ease-in-out hover:bg-indigo-800 hover:scale-105">
                  Login
                </a>

                <a href="/register" className="button text-lg px-8 py-4 w-full rounded-full shadow-md hover:shadow-lg transform transition duration-300 ease-in-out hover:bg-indigo-800 hover:scale-105">
                  Register
                </a>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;