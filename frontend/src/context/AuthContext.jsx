import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Axios instance configured for credentials (cookies) and Bearer tokens
export const authApi = axios.create({
    baseURL: `${API_BASE_URL}/api/auth`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatic token attachment for resilient Level 4 sessions
authApi.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('algorbit_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {
        // LocalStorage unavailable
    }
    return config;
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'
    const [systemStatus, setSystemStatus] = useState(null);

    // Fetch active session and system status
    const refreshSession = useCallback(async () => {
        try {
            const [meRes, statusRes] = await Promise.allSettled([
                authApi.get('/me'),
                authApi.get('/status'),
            ]);

            if (meRes.status === 'fulfilled' && meRes.value.data?.authenticated) {
                setUser(meRes.value.data.user);
            } else {
                setUser(null);
                try {
                    localStorage.removeItem('algorbit_token');
                } catch (e) { }
            }

            if (statusRes.status === 'fulfilled') {
                setSystemStatus(statusRes.value.data);
            }
        } catch (err) {
            console.error('Failed to verify session status', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    // Automatically open auth modal on site entry if unauthenticated
    useEffect(() => {
        if (!loading && !user) {
            const hasDismissed = sessionStorage.getItem('algorbit_guest_dismissed');
            if (!hasDismissed) {
                setIsAuthModalOpen(true);
            }
        }
    }, [loading, user]);

    // Modal controls
    const openAuthModal = useCallback((tab = 'login') => {
        setAuthModalTab(tab);
        setIsAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setIsAuthModalOpen(false);
    }, []);

    const continueAsClient = useCallback(() => {
        try {
            sessionStorage.setItem('algorbit_guest_dismissed', 'true');
        } catch (e) { }
        setIsAuthModalOpen(false);
    }, []);

    // Registration (Level 1, 2, 3, 4, 5)
    const register = async (email, password, name) => {
        try {
            const res = await authApi.post('/register', { email, password, name });
            if (res.data?.user) {
                if (res.data.token) {
                    try {
                        localStorage.setItem('algorbit_token', res.data.token);
                    } catch (e) { }
                }
                setUser(res.data.user);
                closeAuthModal();
                return { success: true, user: res.data.user };
            }
            return { success: false, error: 'Registration failed.' };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Registration failed.';
            return { success: false, error: msg };
        }
    };

    // Login (Level 1, 2, 3, 4, 5)
    const login = async (email, password) => {
        try {
            const res = await authApi.post('/login', { email, password });
            if (res.data?.user) {
                if (res.data.token) {
                    try {
                        localStorage.setItem('algorbit_token', res.data.token);
                    } catch (e) { }
                }
                setUser(res.data.user);
                closeAuthModal();
                return { success: true, user: res.data.user };
            }
            return { success: false, error: 'Login failed.' };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Invalid credentials.';
            return { success: false, error: msg };
        }
    };

    // Google OAuth 2.0 Identity Token 
    const loginWithGoogle = async (credential, mode = 'login') => {
        try {
            const res = await authApi.post('/google', { credential, mode });
            if (res.data?.user) {
                if (res.data.token) {
                    try {
                        localStorage.setItem('algorbit_token', res.data.token);
                    } catch (e) { }
                }
                setUser(res.data.user);
                closeAuthModal();
                return { success: true, user: res.data.user };
            }
            return { success: false, error: 'Google authentication failed.' };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Google authentication failed.';
            return { success: false, error: msg };
        }
    };

    // Logout (session termination)
    const logout = async () => {
        try {
            await authApi.post('/logout');
        } catch (err) {
            console.error('Error logging out', err);
        } finally {
            try {
                localStorage.removeItem('algorbit_token');
                localStorage.removeItem('algorbit_quiz_history_v1');
                localStorage.removeItem('algorbit_quiz_history_guest');
                localStorage.removeItem('algorbit_chat_guest');
            } catch (e) { }
            setUser(null);
        }
    };

    // Password Reset (Forgot Password Request)
    const requestPasswordReset = async (email) => {
        try {
            const res = await authApi.post('/forgot-password', { email });
            return {
                success: true,
                message: res.data?.message || 'Verification code sent.',
                expiresInMinutes: res.data?.expires_in_minutes || 15
            };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Failed to request password reset.';
            return { success: false, error: msg };
        }
    };

    // Confirm Password Reset with Code & New Password
    const resetPassword = async (email, code, newPassword) => {
        try {
            const res = await authApi.post('/reset-password', {
                email,
                code,
                new_password: newPassword
            });
            return {
                success: true,
                message: res.data?.message || 'Password reset successfully.'
            };
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Failed to reset password.';
            return { success: false, error: msg };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        continueAsClient,
        login,
        register,
        loginWithGoogle,
        logout,
        requestPasswordReset,
        resetPassword,
        systemStatus,
        refreshSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
