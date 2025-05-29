import React, { useState } from 'react';

type AuthTab = 'login' | 'register';

const AuthForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="bg-[var(--color-background)]/50 backdrop-blur-sm rounded-xl p-6 border border-[var(--color-primary)]/30 shadow-xl">
      <div className="flex mb-6 border-b border-[var(--color-primary)]/30">
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            activeTab === 'login'
              ? 'text-[var(--color-secondary)] border-b-2 border-[var(--color-secondary)]'
              : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)]/80'
          }`}
          onClick={() => handleTabChange('login')}
        >
          Login
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            activeTab === 'register'
              ? 'text-[var(--color-secondary)] border-b-2 border-[var(--color-secondary)]'
              : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)]/80'
          }`}
          onClick={() => handleTabChange('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'register' && (
          <div className="mb-4">
            <label htmlFor="name\" className="block text-sm font-medium text-[var(--color-text)]/80 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[var(--color-background)]/50 border border-[var(--color-primary)]/30 rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              placeholder="Enter your name"
              required
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)]/80 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-[var(--color-background)]/50 border border-[var(--color-primary)]/30 rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)]/80 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-[var(--color-background)]/50 border border-[var(--color-primary)]/30 rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            placeholder={activeTab === 'login' ? 'Enter your password' : 'Create a password'}
            required
          />
        </div>

        {activeTab === 'register' && (
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text)]/80 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-[var(--color-background)]/50 border border-[var(--color-primary)]/30 rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              placeholder="Confirm your password"
              required
            />
          </div>
        )}

        {activeTab === 'login' && (
          <div className="flex justify-end mb-4">
            <a href="#" className="text-sm text-[var(--color-secondary)] hover:text-[var(--color-secondary)]/80 transition-colors">
              Forgot password?
            </a>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:from-[var(--color-primary)]/90 hover:to-[var(--color-secondary)]/90 text-white font-medium py-3 rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg"
        >
          {activeTab === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {activeTab === 'login' ? (
          <p className="mt-4 text-center text-sm text-[var(--color-text)]/60">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className="text-[var(--color-secondary)] hover:text-[var(--color-secondary)]/80 transition-colors"
            >
              Sign up
            </button>
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-[var(--color-text)]/60">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className="text-[var(--color-secondary)] hover:text-[var(--color-secondary)]/80 transition-colors"
            >
              Sign in
            </button>
          </p>
        )}
      </form>
    </div>
  );
};

export default AuthForm;