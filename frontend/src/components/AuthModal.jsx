import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AlgorbitLogo from './AlgorbitLogo';

export default function AuthModal() {
    const {
        isAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        closeAuthModal,
        continueAsClient,
        login,
        register,
        loginWithGoogle,
        requestPasswordReset,
        resetPassword,
        systemStatus
    } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Password reset state
    const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify' | 'success'
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Reset errors and fields on tab change
    useEffect(() => {
        setErrorMessage('');
        setSuccessMessage('');
        if (authModalTab !== 'forgot') {
            setPassword('');
            setName('');
            setResetCode('');
            setNewPassword('');
            setConfirmPassword('');
            setResetStep('request');
        }
    }, [authModalTab, isAuthModalOpen]);

    // Handle Esc key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isAuthModalOpen) {
                closeAuthModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAuthModalOpen, closeAuthModal]);

    const googleBtnRef = useRef(null);

    // Google Identity Services (Level 6)
    useEffect(() => {
        if (!isAuthModalOpen || !systemStatus?.google_client_id || authModalTab === 'forgot') return;

        const initGoogleBtn = () => {
            if (window.google?.accounts?.id && googleBtnRef.current) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: systemStatus.google_client_id,
                        callback: async (response) => {
                            if (response.credential) {
                                setIsSubmitting(true);
                                setErrorMessage('');
                                const res = await loginWithGoogle(response.credential, authModalTab);
                                setIsSubmitting(false);
                                if (!res.success) setErrorMessage(res.error);
                            }
                        }
                    });

                    googleBtnRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnRef.current, {
                        type: 'standard',
                        theme: 'outline',
                        size: 'large',
                        text: 'continue_with',
                        shape: 'rectangular',
                        width: 360,
                        locale: 'en'
                    });
                } catch (err) {
                    console.error('Google button init error:', err);
                }
            }
        };

        initGoogleBtn();
        const timer = setTimeout(initGoogleBtn, 350);
        return () => clearTimeout(timer);
    }, [isAuthModalOpen, systemStatus?.google_client_id, authModalTab, loginWithGoogle]);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
            return;
        }

        if (!password) {
            setErrorMessage('Please enter your password.');
            return;
        }

        setIsSubmitting(true);

        try {
            if (authModalTab === 'register') {
                if (password.length < 6) {
                    setErrorMessage('Password must be at least 6 characters long.');
                    setIsSubmitting(false);
                    return;
                }
                const res = await register(trimmedEmail, password, name);
                if (!res.success) {
                    setErrorMessage(res.error);
                }
            } else {
                const res = await login(trimmedEmail, password);
                if (!res.success) {
                    setErrorMessage(res.error);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Password Reset Code Request
    const handleRequestResetCode = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await requestPasswordReset(trimmedEmail);
            if (res.success) {
                setResetStep('verify');
                setSuccessMessage(res.message || 'A 6-digit verification code has been sent to your email.');
            } else {
                setErrorMessage(res.error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Confirming Password Reset
    const handleConfirmReset = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const trimmedEmail = email.trim();
        const trimmedCode = resetCode.trim();

        if (!trimmedCode) {
            setErrorMessage('Please enter the 6-digit verification code.');
            return;
        }

        if (trimmedCode.length < 4) {
            setErrorMessage('Please enter a valid verification code.');
            return;
        }

        if (!newPassword) {
            setErrorMessage('Please enter your new password.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('The passwords do not match. Please try again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await resetPassword(trimmedEmail, trimmedCode, newPassword);
            if (res.success) {
                setResetStep('success');
                setSuccessMessage('Your password has been successfully reset! You can now sign in.');
            } else {
                setErrorMessage(res.error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="auth-modal-overlay" onClick={closeAuthModal}>
                <motion.div
                    className="auth-modal-card"
                    initial={{ opacity: 0, scale: 0.92, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 24 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button className="auth-close-btn" onClick={closeAuthModal} title="Close">
                        ✕
                    </button>

                    {/* Header with Centered Title Pill */}
                    <div className="auth-header">
                        <div className="auth-logo-badge">
                            <AlgorbitLogo size={36} />
                        </div>
                        <h2 className="auth-title-pill">
                            {authModalTab === 'forgot'
                                ? (resetStep === 'success' ? 'Password Reset' : 'Reset Password')
                                : (authModalTab === 'login' ? 'Welcome to Algorbit' : 'Create an Account')}
                        </h2>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && (
                        <motion.div
                            className="auth-error-banner"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M8 5V9M8 11.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span>{errorMessage}</span>
                        </motion.div>
                    )}

                    {/* Success Banner */}
                    {successMessage && (
                        <motion.div
                            className="auth-success-banner"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{successMessage}</span>
                        </motion.div>
                    )}

                    {/* Standard Tabs (Sign In / Register) - only when not in forgot mode */}
                    {authModalTab !== 'forgot' && (
                        <div className="auth-tab-switch">
                            <button
                                type="button"
                                className={`auth-tab-btn ${authModalTab === 'login' ? 'active' : ''}`}
                                onClick={() => setAuthModalTab('login')}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                className={`auth-tab-btn ${authModalTab === 'register' ? 'active' : ''}`}
                                onClick={() => setAuthModalTab('register')}
                            >
                                Register
                            </button>
                        </div>
                    )}

                    {/* ── Main Form (Login / Register) ── */}
                    {authModalTab !== 'forgot' && (
                        <form className="auth-form" onSubmit={handleSubmit} noValidate>
                            {authModalTab === 'register' && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="auth-name">Name (Optional)</label>
                                    <input
                                        id="auth-name"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. John Pork"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="auth-email">Email Address</label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    required
                                    className="form-input"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>

                            <div className="form-group">
                                <div className="label-row">
                                    <label className="form-label" htmlFor="auth-password">Password</label>
                                    {authModalTab === 'register' ? (
                                        <span className="password-hint">Min 6 characters</span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="forgot-password-link-btn"
                                            onClick={() => {
                                                setErrorMessage('');
                                                setSuccessMessage('');
                                                setResetStep('request');
                                                setAuthModalTab('forgot');
                                            }}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div className="password-input-wrap">
                                    <input
                                        id="auth-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={authModalTab === 'login' ? 'current-password' : 'new-password'}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="submit-spinner" />
                                ) : authModalTab === 'login' ? (
                                    'Sign In'
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    )}

                    {/* ── Password Reset Flow (Forgot Tab) ── */}
                    {authModalTab === 'forgot' && (
                        <div className="auth-reset-flow">
                            {/* Step 1: Request Code */}
                            {resetStep === 'request' && (
                                <form className="auth-form" onSubmit={handleRequestResetCode} noValidate>
                                    <p className="reset-instructions">
                                        Enter your registered email address and we'll send a 6-digit verification code to reset your password.
                                    </p>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reset-email">Email Address</label>
                                        <input
                                            id="reset-email"
                                            type="email"
                                            required
                                            className="form-input"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="auth-submit-btn"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="submit-spinner" />
                                        ) : (
                                            'Send Reset Code'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="auth-back-to-login-btn"
                                        onClick={() => setAuthModalTab('login')}
                                    >
                                        ← Back to Sign In
                                    </button>
                                </form>
                            )}

                            {/* Step 2: Verify Code & Set New Password */}
                            {resetStep === 'verify' && (
                                <form className="auth-form" onSubmit={handleConfirmReset} noValidate>
                                    <div className="auth-email-sent-box">
                                        <div className="email-sent-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                <polyline points="22,6 12,13 2,6" />
                                            </svg>
                                        </div>
                                        <div className="email-sent-text">
                                            A 6-digit verification code has been dispatched to <strong>{email}</strong>. Check your inbox and spam folder.
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div className="label-row">
                                            <label className="form-label" htmlFor="verify-email">Account Email</label>
                                            <button
                                                type="button"
                                                className="forgot-password-link-btn"
                                                onClick={() => setResetStep('request')}
                                            >
                                                Change
                                            </button>
                                        </div>
                                        <input
                                            id="verify-email"
                                            type="email"
                                            disabled
                                            className="form-input disabled-input"
                                            value={email}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="reset-code-input">
                                            6-Digit Verification Code
                                        </label>
                                        <input
                                            id="reset-code-input"
                                            type="text"
                                            required
                                            maxLength={6}
                                            className="form-input code-input"
                                            placeholder="123456"
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="form-group">
                                        <div className="label-row">
                                            <label className="form-label" htmlFor="new-password">New Password</label>
                                            <span className="password-hint">Min 6 characters</span>
                                        </div>
                                        <div className="password-input-wrap">
                                            <input
                                                id="new-password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                className="form-input"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowPassword(!showPassword)}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                                        <div className="password-input-wrap">
                                            <input
                                                id="confirm-password"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                required
                                                className="form-input"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="auth-submit-btn"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="submit-spinner" />
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>

                                    <div className="reset-secondary-actions">
                                        <button
                                            type="button"
                                            className="reset-action-btn"
                                            onClick={handleRequestResetCode}
                                            disabled={isSubmitting}
                                        >
                                            Resend Code
                                        </button>
                                        <button
                                            type="button"
                                            className="reset-action-btn"
                                            onClick={() => setAuthModalTab('login')}
                                        >
                                            Back to Sign In
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Step 3: Success */}
                            {resetStep === 'success' && (
                                <div className="reset-success-box">
                                    <div className="success-icon-circle">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 13L9 17L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <h3 className="reset-success-title">Password Reset Complete</h3>
                                    <p className="reset-success-desc">
                                        Your password has been successfully updated. You can now log into Algorbit using your new password.
                                    </p>
                                    <button
                                        type="button"
                                        className="auth-submit-btn"
                                        onClick={() => {
                                            setAuthModalTab('login');
                                            setPassword('');
                                        }}
                                    >
                                        Sign In Now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Divider & Alternative Login (only for login & register) */}
                    {authModalTab !== 'forgot' && (
                        <>
                            <div className="auth-divider">
                                <span>or</span>
                            </div>

                            {/* Level 6: Google OAuth Button with Native Overlay */}
                            <div className="google-oauth-container">
                                <button
                                    type="button"
                                    className="google-oauth-btn"
                                    disabled={isSubmitting}
                                >
                                    <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                                <div ref={googleBtnRef} className="google-oauth-hidden-overlay" />
                            </div>

                            {/* Continue as Client Option */}
                            <button
                                type="button"
                                className="continue-client-btn"
                                onClick={continueAsClient}
                            >
                                <span>Continue as a Client</span>
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
