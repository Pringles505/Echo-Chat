import { jwtDecode } from "jwt-decode";

export const getConsistentColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
};

export const getUserData = (token) => {
  if (!token) return { username: "", userId: "", profileImage: "" };
  
  const decodedToken = jwtDecode(token);
  const username = decodedToken.username;
  const userId = decodedToken.id;
  
  const profileImage = localStorage.getItem(`profileImage-${userId}`) ||
    `https://ui-avatars.com/api/?name=${username}&background=${getConsistentColor(username)}&color=fff`;
  
  return { username, userId, profileImage };
};