import { useState, useEffect, useRef } from 'react';

export const useConversations = (userId) => {
  const [recentConversations, setRecentConversations] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const isInitialized = useRef(false); // prevents overwrite on re-renders

  // Load only once when userId becomes available
  useEffect(() => {
    if (!userId || isInitialized.current) return;

    const saved = localStorage.getItem(`recentConversations-${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentConversations(parsed);

        const unreads = {};
        parsed.forEach(conv => {
          const count = Number(localStorage.getItem(`unread-${userId}-${conv.id}`)) || 0;
          unreads[conv.id] = count;
        });
        setUnreadMessages(unreads);
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
          lastMessage: message?.text || updated[existingIndex].lastMessage,
          lastMessageTime: message?.timestamp || updated[existingIndex].lastMessageTime,
        };
        const [moved] = updated.splice(existingIndex, 1);
        updated.unshift(moved);
      } else {
        updated.unshift({
          ...friendData,
          lastMessage: message?.text || "",
          lastMessageTime: message?.timestamp || new Date().toISOString(),
        });
      }

      return updated.slice(0, 20); // Keep recent 20
    });

    if (message && message.userId !== userId) {
      setUnreadMessages(prev => {
        const newCount = (prev[friendData.id] || 0) + 1;
        localStorage.setItem(`unread-${userId}-${friendData.id}`, newCount);
        return {
          ...prev,
          [friendData.id]: newCount
        };
      });
    }
  };

  return { recentConversations, unreadMessages, updateRecentConversations };
};
