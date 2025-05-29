import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, type }) => {
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (type === 'register') {
      // Simulate registration success
      setStep(2);
    } else {
      // Simulate login success and verification code sending
      setStep(2);
    }
  };

  const handleVerificationCodeChange = (index, value) => {
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Move to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="auth-modal"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6">
              {type === 'register' ? 'Create Account' : 'Welcome Back'}
            </h2>

            {step === 1 ? (
              <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                {type === 'register' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input
                        type="text"
                        id="username"
                        {...register('username', { required: true })}
                      />
                      {errors.username && <span className="text-red-500">Username is required</span>}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                  />
                  {errors.email && <span className="text-red-500">Valid email is required</span>}
                </div>

                {type === 'register' && (
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <PhoneInput
                      country={'es'}
                      inputProps={{
                        id: 'phone',
                        required: true,
                      }}
                      containerClass="phone-input"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    {...register('password', { required: true, minLength: 8 })}
                  />
                  {errors.password && <span className="text-red-500">Password must be at least 8 characters</span>}
                </div>

                {type === 'register' && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      {...register('confirmPassword', {
                        required: true,
                        validate: value => value === watch('password')
                      })}
                    />
                    {errors.confirmPassword && <span className="text-red-500">Passwords must match</span>}
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full">
                  {type === 'register' ? 'Create Account' : 'Login'}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-center mb-4">
                  Enter the 6-digit code sent to your {type === 'register' ? 'email' : 'phone'}
                </p>
                <div className="verification-code">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      id={`code-${index}`}
                      value={digit}
                      onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                    />
                  ))}
                </div>
                <button className="btn btn-primary w-full">Verify</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};