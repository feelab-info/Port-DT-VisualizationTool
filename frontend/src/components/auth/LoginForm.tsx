import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/AuthService';
import { Mail, AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import RegistrationForm from './RegistrationForm';
import EmailVerificationForm from './EmailVerificationForm';

type AuthStep = 'login' | 'registration' | 'verification';

export default function LoginForm() {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!authService.validatePortEmail(formData.email)) {
      newErrors.email = 'Access restricted to Port of Funchal staff (@apram.pt emails) or authorized personnel';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any event bubbling
    
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('[LoginForm] Attempting login with:', { email: formData.email });
      
      const result = await login(formData.email.trim(), formData.password.trim()).catch((error) => {
        console.error('[LoginForm] Login function threw error:', error);
        return { success: false, error: 'Login failed. Please try again.' };
      });
      
      console.log('[LoginForm] Login result:', result);
      
      if (!result.success) {
        // Show the error message (especially for 401 verification needed)
        const errorMessage = result.error || 'Login failed. Please try again.';
        console.log('[LoginForm] Setting error message:', errorMessage);
        setGeneralError(errorMessage);
      } else {
        console.log('[LoginForm] Login successful!');
      }
    } catch (error) {
      console.error('[LoginForm] Caught error in handleSubmit:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      console.log('[LoginForm] Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // Clear general error when user modifies form
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleRegistrationSuccess = (email: string) => {
    setRegistrationEmail(email);
    setCurrentStep('verification');
  };

  const handleVerificationSuccess = () => {
    // After successful verification, go back to login
    setCurrentStep('login');
    setGeneralError('');
    // Show a success message
    setFormData(prev => ({
      ...prev,
      email: registrationEmail, // Pre-fill the email
      password: '', // Clear password for security
    }));
  };

  const handleBackToLogin = () => {
    setCurrentStep('login');
    setGeneralError('');
  };

  const handleBackToRegistration = () => {
    setCurrentStep('registration');
  };

  const handleRegisterClick = () => {
    setCurrentStep('registration');
    setFormData({
      email: formData.email,
      password: '', // Clear password when registering
    });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'registration':
        return (
          <RegistrationForm
            onSuccess={handleRegistrationSuccess}
            onBackToLogin={handleBackToLogin}
            initialEmail={formData.email}
          />
        );
      case 'verification':
        return (
          <EmailVerificationForm
            email={registrationEmail}
            onSuccess={handleVerificationSuccess}
            onBackToRegistration={handleBackToRegistration}
          />
        );
      default:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              {/* Shift2DC Logo */}
              <div className="flex justify-center mb-6">
                <Image
                  src="/img/shift2dc_logo.png"
                  alt="Shift2DC"
                  width={200}
                  height={60}
                  className="h-auto max-w-full"
                  priority
                />
              </div>
              
              
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Access restricted to Port of Funchal staff
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-gray-100`}
                    placeholder="name@apram.pt"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-gray-100`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                First time using the system?{' '}
                <button
                  onClick={handleRegisterClick}
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Register your email
                </button>
              </p>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Only authorized Port of Funchal staff can access this system.
                <br />
                Contact IT support if you need assistance.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            
            {/* Image Section */}
            <div className="hidden lg:block relative">
              <div className="h-full relative bg-gradient-to-br from-blue-600 to-blue-800">
                <Image
                  src="/img/portFunchal.png"
                  alt="Port of Funchal"
                  fill
                  className="object-cover opacity-90"
                  priority
                />
                {/* Overlay with branding */}
                <div className="absolute inset-0 bg-blue-900/40 flex flex-col justify-end p-8">
                  <div className="text-white">
                    <h1 className="text-4xl font-bold mb-2">Port of Funchal</h1>
                    <p className="text-xl text-blue-100 mb-4">Digital Twin Platform</p>
                    <p className="text-blue-200 leading-relaxed">
                      Advanced port management and energy monitoring system for the Port of Funchal. 
                      Providing real-time insights and simulation capabilities for efficient port operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              {renderCurrentStep()}

              {/* Mobile image placeholder */}
              <div className="lg:hidden mt-8 text-center">
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <Image
                    src="/img/portFunchal.png"
                    alt="Port of Funchal"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 