import React, { useState, useRef, useEffect } from 'react';
import { authService } from '@/services/AuthService';
import { AlertCircle, Loader2, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

interface EmailVerificationFormProps {
  email: string;
  onSuccess: () => void;
  onBackToRegistration: () => void;
}

export default function EmailVerificationForm({ email, onSuccess, onBackToRegistration }: EmailVerificationFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Clear errors when user starts typing
    if (generalError) {
      setGeneralError('');
    }

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every(digit => digit !== '')) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          setCode(digits);
          inputRefs.current[5]?.focus();
          handleSubmit(digits.join(''));
        }
      });
    }
  };

  const handleSubmit = async (verificationCode?: string) => {
    const codeToSubmit = verificationCode || code.join('');
    
    if (codeToSubmit.length !== 6) {
      setGeneralError('Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setGeneralError('');
    setSuccessMessage('');

    try {
      const result = await authService.verifyEmail(email, codeToSubmit);
      
      if (result.success) {
        setSuccessMessage(result.message || 'Email verified successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setGeneralError(result.error || 'Verification failed. Please try again.');
        // Clear the code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setGeneralError('');
    setResendMessage('');

    try {
      const result = await authService.resendVerificationCode(email);
      
      if (result.success) {
        setResendMessage(result.message || 'Verification code sent successfully!');
        setResendCooldown(60); // 60 second cooldown
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setGeneralError(result.error || 'Failed to resend verification code.');
      }
    } catch {
      setGeneralError('An unexpected error occurred while resending code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Verify Your Email
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We&apos;ve sent a 6-digit verification code to
        </p>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {email}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Error */}
      {generalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                {generalError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resend Success Message */}
      {resendMessage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {resendMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Code Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
            Enter Verification Code
          </label>
          <div className="flex justify-center space-x-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={isLoading || successMessage !== ''}
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || code.some(digit => digit === '') || successMessage !== ''}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Verifying...
            </>
          ) : successMessage ? (
            'Verified ✓'
          ) : (
            'Verify Email'
          )}
        </button>
      </form>

      {/* Resend Code */}
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Didn&apos;t receive the code?
        </p>
        <button
          onClick={handleResendCode}
          disabled={isResending || resendCooldown > 0 || successMessage !== ''}
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-1" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Resend in {resendCooldown}s
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Resend Code
            </>
          )}
        </button>
      </div>

      {/* Back to Registration */}
      <div className="text-center">
        <button
          onClick={onBackToRegistration}
          className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 transition-colors inline-flex items-center"
          disabled={isLoading || isResending}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Registration
        </button>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          The verification code will expire in 15 minutes. 
          <br />
          Check your spam folder if you don&apos;t see the email.
        </p>
      </div>
    </div>
  );
} 