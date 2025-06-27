import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  const token = localStorage.getItem('token');
  if (!socket) {
    socket = io('http://localhost:3001', {
      withCredentials: true,
      autoConnect: false,
    });
  }
  // Always set the latest token before connecting
  socket.auth = token ? { token } : {};
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export default getSocket;