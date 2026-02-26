import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

export function getSocket() {
  const token = localStorage.getItem('token');
  if (!socket) {
    // Use 127.0.0.1 by default to avoid IPv6 `localhost` resolution issues in test runners.
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:3001', {
      withCredentials: true,
      auth: token ? { token } : {},
      transports: ['websocket']
    });
    currentToken = token;
  } else if (token && !currentToken) {
    // Reconnect only on login (null -> token), not on cross-tab localStorage changes
    socket.auth = { token };
    currentToken = token;
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function connectWithoutAuth() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:3001', {
      withCredentials: true,
      auth: {},
      transports: ['websocket']
    });
  } else {
    socket.auth = {};
    if (socket.connected) {
      socket.disconnect();
    }
  }
  currentToken = null;
  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export default getSocket;
