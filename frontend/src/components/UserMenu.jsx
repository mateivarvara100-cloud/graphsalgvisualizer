import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function UserMenu({ className = '' }) {
    const { user, isAuthenticated, loading, openAuthModal, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className={`user-menu-loading ${className}`}>
                <span className="user-loading-shimmer" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className={`user-menu-unauth ${className}`}>
                <button
                    className="user-signin-btn"
                    onClick={() => openAuthModal('login')}
                    title="Sign In or Register"
                >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="signin-icon">
                        <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 12l4-4-4-4M14 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Sign In</span>
                </button>
            </div>
        );
    }

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';

    return (
        <div className={`user-menu-container ${className}`} ref={menuRef}>
            <button
                className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Account Menu"
            >
                <div className="user-avatar-badge">
                    {user?.picture ? (
                        <img src={user.picture} alt={user.name || 'User'} className="user-avatar-img" />
                    ) : (
                        <span className="user-avatar-initials">{initials}</span>
                    )}
                </div>
                <span className="user-trigger-name">{user?.name || user?.email?.split('@')[0]}</span>
                <svg className={`user-chevron ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="user-dropdown-card"
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                        {/* Profile Summary */}
                        <div className="dropdown-profile-header">
                            <div className="dropdown-avatar-large">
                                {user?.picture ? (
                                    <img src={user.picture} alt="" className="user-avatar-img" />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </div>
                            <div className="dropdown-profile-info">
                                <span className="profile-name">{user?.name || 'Algorbit User'}</span>
                                <span className="profile-email">{user?.email}</span>
                            </div>
                        </div>

                        <div className="dropdown-divider" />

                        {/* Sign Out Button */}
                        <button
                            className="dropdown-logout-btn"
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 12l4-4-4-4M14 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Sign Out</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
