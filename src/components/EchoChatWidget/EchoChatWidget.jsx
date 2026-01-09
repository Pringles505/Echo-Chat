import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import gsap from 'gsap';
import Logo from '../HomepageComponents/Logo';
import './EchoChatWidget.css';

const EchoChatWidget = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hey there! I'm EchoChat, Echo's AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const widgetRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && widgetRef.current) {
      gsap.fromTo(
        widgetRef.current,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const mockResponses = [
    "That's a great question! Let me help you with that.",
    'Check out our documentation for more details on this topic.',
    'Would you like me to show you an example of how that works?',
    'You can also reach out to our team at support@echo.dev',
    'Have you tried looking at our Getting Started guide?',
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setTyping(true);

    // Mock bot response after delay
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: mockResponses[Math.floor(Math.random() * mockResponses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const quickReplies = [
    'Docs',
    'Get Started',
    'Security',
    'Pricing',
  ];

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:shadow-[0_0_30px_rgba(124,58,237,0.7)] transition-all duration-300 group animate-float"
        >
          <div className="absolute inset-0 rounded-full bg-violet-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          <Logo size="sm" variant="light" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-cyan-500 text-black text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            1
          </span>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={widgetRef}
          className="fixed bottom-6 right-6 z-50 w-96 max-h-96 md:max-h-[32rem] bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <Logo size="md" variant="light" />
              <div>
                <h3 className="font-bold text-white">EchoChat</h3>
                <p className="text-xs text-gray-400">Always ready to help</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-250"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-gray-400 hover:text-white" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-gray-400 hover:text-white" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-250"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          {!isMinimized && (
            <>
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64 scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    } animate-slideUp`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2.5 rounded-lg text-sm backdrop-blur-sm ${
                        message.type === 'user'
                          ? 'bg-violet-600/80 text-white border border-violet-500/30 rounded-br-none shadow-[0_2px_10px_rgba(124,58,237,0.2)]'
                          : 'bg-white/5 text-gray-200 border border-white/10 rounded-bl-none'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 text-gray-300 px-4 py-2.5 rounded-lg border border-white/10 rounded-bl-none">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length === 1 && !typing && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(reply);
                        handleSendMessage({ preventDefault: () => {} });
                      }}
                      className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-violet-300 rounded-full border border-white/10 transition-colors duration-250"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center space-x-2 p-4 border-t border-white/10 bg-black/30"
              >
                <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-250"
              />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || typing}
                  className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-250 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default EchoChatWidget;
