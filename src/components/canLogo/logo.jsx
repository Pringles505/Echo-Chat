import React from 'react';
import sodaCan from './sodaCan.svg'; 
import './logo.css';

const Logo = () => {
  return (
    <div className="logo-container">
      <img src={sodaCan} alt="Soda Can" className="logo" />
      <h1>Chat Tuah</h1>
    </div>
  );
};

export default Logo;