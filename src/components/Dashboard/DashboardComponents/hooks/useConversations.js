import { useState, useEffect } from 'react';

export const useConversations = (userId) => {
  const [recentConversations, setRecentConversations] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    if (userId) {
      const savedConversations = localStorage.getItem(`recentConversations-${userId}`);
      if (savedConversations) {
        const parsedConversations = JSON.parse(savedConversations);
        setRecentConversations(parsedConversations);
        
        const unreads = {};
        parsedConversations.forEach(conv => {
          unreads[conv.id] = localStorage.getItem(`unread-${userId}-${conv.id}`) || 0;
        });
        setUnreadMessages(unreads);
      }
    }
  }, [userId]);

  const updateRecentConversations = (friendData, message = null) => {
    setRecentConversations(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === friendData.id);
      let updatedConversations = [...prev];
      
      if (existingIndex >= 0) {
        updatedConversations[existingIndex] = {
          ...updatedConversations[existingIndex],
          lastMessage: message?.text || updatedConversations[existingIndex].lastMessage,
          lastMessageTime: message?.timestamp || updatedConversations[existingIndex].lastMessageTime
        };
        
        const [moved] = updatedConversations.splice(existingIndex, 1);
        updatedConversations.unshift(moved);
      } else {
        updatedConversations.unshift({
          ...friendData,
          lastMessage: message?.text || "",
          lastMessageTime: message?.timestamp || new Date().toISOString()
        });
        
        if (updatedConversations.length > 20) {
          updatedConversations = updatedConversations.slice(0, 20);
        }
      }
      
      return updatedConversations;
    });

    if (message && message.userId !== userId) {
      setUnreadMessages(prev => ({
        ...prev,
        [friendData.id]: (prev[friendData.id] || 0) + 1
      }));
      localStorage.setItem(`unread-${userId}-${friendData.id}`, unreadMessages[friendData.id] + 1);
    }
  };

  return { recentConversations, unreadMessages, updateRecentConversations };
};