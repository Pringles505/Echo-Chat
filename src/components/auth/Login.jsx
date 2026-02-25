import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Github, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Navbar from '../HomepageComponents/Navbar';
import Footer from '../HomepageComponents/Footer';
import PageWrapper from '../common/PageWrapper';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock authentication
    setTimeout(() => {
      if (email && password) {
        localStorage.setItem('user', JSON.stringify({ email }));
        navigate('/dashboard');
      } else {
        setError('Please fill in all fields');
      }
      setLoading(false);
    }, 1000);
  };

  const handleOAuth = (provider) => {
    alert(`Mock ${provider} OAuth login. In production, this would redirect to ${provider}.`);
  };

  return (
    <PageWrapper>
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 pt-28">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-2xl">🐋</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('auth.welcomeBack')}</h1>
            <p className="text-neutral-400">
              {t('auth.welcomeBackDesc')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-rose-950/50 border border-rose-700/50 rounded-lg">
              <p className="text-rose-300 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('auth.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.placeholderEmail')}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-primary-800/20 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all duration-250"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-neutral-900 border border-primary-800/20 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all duration-250"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-primary-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <a href="#" className="text-sm text-primary-400 hover:text-primary-300">
                {t('auth.forgotPassword')}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300"
            >
              <span>{loading ? t('auth.signingIn') : t('auth.signIn')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-white/40">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleOAuth('Google')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-primary-800/20 rounded-lg text-white hover:bg-neutral-900/50 hover:border-primary-600/40 transition-all duration-250"
            >
              <span className="text-lg">🔐</span>
              <span className="font-medium">{t('auth.continueWithGoogle')}</span>
            </button>

            <button
              onClick={() => handleOAuth('GitHub')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-primary-800/20 rounded-lg text-white hover:bg-neutral-900/50 hover:border-primary-600/40 transition-all duration-250"
            >
              <Github className="w-5 h-5" />
              <span className="font-medium">{t('auth.continueWithGithub')}</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-neutral-400">
            {t('auth.noAccount')}{' '}
            <Link
              to="/auth/register"
              className="text-primary-400 hover:text-primary-300 font-semibold"
            >
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
};

export default Login;
