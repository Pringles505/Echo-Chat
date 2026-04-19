import { useState, useEffect, useRef } from 'react';

export const useConversations = (userId) => {
  const [recentConversations, setRecentConversations] = useState([]);
  const isInitialized = useRef(false); // prevents overwrite on re-renders

  // Load only once when userId becomes available
  useEffect(() => {
    if (!userId || isInitialized.current) return;

    const saved = localStorage.getItem(`recentConversations-${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentConversations(parsed);
      } catch (e) {
        console.error("Failed to parse localStorage conversations", e);
      }
    }

    isInitialized.current = true;
  }, [userId]);

  // Save to localStorage **only after initial load**
  useEffect(() => {
    if (!userId || !isInitialized.current) return;
    localStorage.setItem(`recentConversations-${userId}`, JSON.stringify(recentConversations));
  }, [recentConversations, userId]);

  const updateRecentConversations = (friendData, message = null) => {
    setRecentConversations(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === friendData.id);
      let updated = [...prev];

      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...friendData,
          lastMessage: message?.text || updated[existingIndex].lastMessage,
          lastMessageTime: message?.timestamp || updated[existingIndex].lastMessageTime,
        };
        if (message) {
          const [moved] = updated.splice(existingIndex, 1);
          updated.unshift(moved);
        }
      } else {
        updated.unshift({
          ...friendData,
          lastMessage: message?.text || "",
          lastMessageTime: message?.timestamp || new Date().toISOString(),
        });
      }

      return updated.slice(0, 20); // Keep recent 20
    });
  };

  return { recentConversations, updateRecentConversations };
};
