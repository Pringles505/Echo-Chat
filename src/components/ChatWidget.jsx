import React, { useState } from "react";
import { Headphones, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm Echo, your support assistant. How can I help you today?",
      isBot: true,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { text: message, isBot: false }]);
    setMessage("");
    setLoading(true);

    //const apiKey = process.env.OPENAI_API_KEY;

    try {
      const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`, 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-davinci-003", 
          prompt: message,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      const botResponse = data.choices[0].text.trim();
      setMessages((prev) => [...prev, { text: botResponse, isBot: true }]);
    } catch (error) {
      console.error("Error al conectar con la API:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Oops! Something went wrong. Please try again.", isBot: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="chat-bubble"
            onClick={() => setIsOpen(true)}
          >
            <Headphones size={24} color="white" />
          </motion.div>
        )}

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="chat-widget"
          >
            <div className="chat-header">
              <Headphones size={24} />
              <h3>Echo Support</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="ml-auto text-white hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.isBot ? "bot" : "user"}`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && <div className="loading">...</div>}
            </div>

            <form onSubmit={handleSubmit} className="chat-input">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
