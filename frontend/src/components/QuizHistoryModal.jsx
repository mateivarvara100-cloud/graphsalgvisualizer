import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizResults } from '../context/QuizResultsContext';
import { useAuth } from '../context/AuthContext';
import { formatAlgName } from './QuizModal';

export default function QuizHistoryModal() {
    const { isHistoryModalOpen, closeHistoryModal, quizResults, stats } = useQuizResults();
    const { user, openAuthModal } = useAuth();
    const isAuthenticated = Boolean(user?.id || user?._id);
    const [filter, setFilter] = useState('all'); // 'all' | 'exam' | 'exercise'

    const filteredList = useMemo(() => {
        if (filter === 'exam') {
            return quizResults.filter(q => q.algorithm === 'ALL');
        }
        if (filter === 'exercise') {
            return quizResults.filter(q => q.algorithm !== 'ALL');
        }
        return quizResults;
    }, [quizResults, filter]);
    const formatDate = (isoString) => {
        if (!isoString) return 'Just now';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Recently';
        }
    };

    const getScoreBadgeColor = (pct) => {
        if (pct >= 90) return '#10b981';
        if (pct >= 80) return '#3b82f6';
        if (pct >= 70) return '#6366f1';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <AnimatePresence>
            {isHistoryModalOpen && (
                <div className="history-modal-overlay" onClick={closeHistoryModal}>
                    <motion.div
                        className="history-modal-container"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    >
                {/* Header */}
                <div className="history-modal-header">
                    <div className="history-header-left">
                        <div className="history-title-row">
                            <span 
                                className="history-badge"
                                style={!isAuthenticated ? { background: 'rgba(234, 179, 8, 0.16)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.3)' } : undefined}
                            >
                                {isAuthenticated ? 'PERFORMANCE LOG' : 'ACCOUNT REQUIRED'}
                            </span>
                            <h2 className="history-title">Quiz & Examination History</h2>
                        </div>
                        <p className="history-subtitle">
                            {isAuthenticated 
                                ? 'All your completed algorithm exercises and graph examinations are permanently recorded here.'
                                : 'Permanent quiz history, mastery records, and statistics can only be seen if you have an account.'}
                        </p>
                    </div>

                    <button className="history-close-btn" onClick={closeHistoryModal} title="Close History">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                {!isAuthenticated ? (
                    /* Client Mode Notice */
                    <div className="history-list-wrapper" style={{ padding: '48px 24px' }}>
                        <div className="history-empty-state">
                            <div className="empty-icon">🔒</div>
                            <h4>Quiz History Can Only Be Seen with an Account</h4>
                            <p>
                                In client mode, your quiz attempts and scores are temporary and are not permanently saved. Sign in or register a free account to view your quiz history, track your mastery grades, and maintain your progress across sessions.
                            </p>
                            <div className="history-guest-actions">
                                <button
                                    className="history-guest-signin-btn"
                                    onClick={() => {
                                        closeHistoryModal();
                                        openAuthModal('login');
                                    }}
                                >
                                    <span>Sign In to Your Account</span>
                                    <span className="signin-arrow">→</span>
                                </button>
                                <button
                                    className="history-guest-register-btn"
                                    onClick={() => {
                                        closeHistoryModal();
                                        openAuthModal('register');
                                    }}
                                >
                                    Create Free Account
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stat Summary Cards */}
                        <div className="history-stats-bar">
                            <div className="stat-card">
                                <span className="stat-label">Total Completed</span>
                                <span className="stat-value">{stats.totalTests}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">Average Score</span>
                                <span className="stat-value">{stats.avgScore}%</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">Highest Score</span>
                                <span className="stat-value">{stats.bestScore}%</span>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="history-filter-row">
                            <div className="history-filter-tabs">
                                <button
                                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilter('all')}
                                >
                                    All Records ({quizResults.length})
                                </button>
                                <button
                                    className={`filter-tab ${filter === 'exam' ? 'active' : ''}`}
                                    onClick={() => setFilter('exam')}
                                >
                                    Examinations ({quizResults.filter(q => q.algorithm === 'ALL').length})
                                </button>
                                <button
                                    className={`filter-tab ${filter === 'exercise' ? 'active' : ''}`}
                                    onClick={() => setFilter('exercise')}
                                >
                                    Exercises ({quizResults.filter(q => q.algorithm !== 'ALL').length})
                                </button>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="history-list-wrapper">
                            {filteredList.length === 0 ? (
                                <div className="history-empty-state">
                                    <div className="empty-icon">📊</div>
                                    <h4>No Results Recorded Yet</h4>
                                    <p>
                                        Complete an algorithm practice session or take the Graph Examination to see your results tracked here.
                                    </p>
                                </div>
                            ) : (
                                <div className="history-items-list">
                            {filteredList.map((item, index) => {
                                const isExam = item.algorithm === 'ALL';
                                const displayName = isExam ? 'Graph Examination' : formatAlgName(item.algorithm);
                                const badgeColor = getScoreBadgeColor(item.percentage);

                                return (
                                    <div key={item.id || index} className="history-item-card">
                                        <div className="item-left">
                                            <div className="item-title-line">
                                                <span className="item-alg-name">{displayName}</span>
                                                <span className={`item-mode-pill ${item.mode === 'practice' ? 'pill-practice' : 'pill-test'}`}>
                                                    {item.mode === 'practice' ? 'Practice' : 'Test'}
                                                </span>
                                            </div>
                                            <span className="item-date">{formatDate(item.created_at || item.timestamp)}</span>
                                        </div>

                                        <div className="item-right">
                                            <div className="item-score-block">
                                                <span className="item-fraction">{item.score} / {item.total}</span>
                                                <span className="item-percentage" style={{ color: badgeColor }}>
                                                    {item.percentage}%
                                                </span>
                                            </div>
                                            <div
                                                className="item-grade-badge"
                                                style={{ borderColor: badgeColor, color: badgeColor }}
                                            >
                                                {item.gradeBadge || item.grade_badge || 'Completed'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                </>
            )}
            </motion.div>
        </div>
            )}
        </AnimatePresence>
    );
}
