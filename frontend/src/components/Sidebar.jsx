import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import config from '../data/config.json';
import AlgorbitLogo from './AlgorbitLogo';
import LandingBackground from './LandingBackground';
import AlgorithmMiniPreview from './AlgorithmMiniPreview';
import UserMenu from './UserMenu';
import { useQuizResults } from '../context/QuizResultsContext';
import { useAuth } from '../context/AuthContext';

const CATEGORY_ORDER = config.algorithmCategories;

export default function Sidebar({ onSelectAlgorithm, onStartQuiz }) {
    const algKeys = Object.keys(config.algorithms);
    const [hoveredAlg, setHoveredAlg] = useState(algKeys[0]);
    const algInfo = config.algorithms[hoveredAlg];
    const { latestResults, openHistoryModal } = useQuizResults();
    const { user } = useAuth();
    const latestForHovered = latestResults[hoveredAlg];
    const latestExam = latestResults['ALL'];

    // Keyboard navigation
    const currentIndex = algKeys.indexOf(hoveredAlg);
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHoveredAlg(algKeys[(currentIndex + 1) % algKeys.length]);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHoveredAlg(algKeys[(currentIndex - 1 + algKeys.length) % algKeys.length]);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentIndex, hoveredAlg, algKeys, onSelectAlgorithm]);

    // Group algorithms by category
    const grouped = CATEGORY_ORDER.map(cat => ({
        category: cat,
        algs: algKeys.filter(k => config.algorithms[k].category === cat),
    })).filter(g => g.algs.length > 0);

    const CATEGORY_ICONS = {
        'Graph Traversal': '🧭',
        'Shortest Path': '⚡',
        'Minimum Spanning Tree': '🌲',
        'Network Flow': '🌊',
        'Connectivity': '🔗',
    };

    const DS_ICONS = {
        queue: '📦 Queue (FIFO)',
        stack: '📚 Stack (LIFO)',
        priority_queue: '⚡ Priority Queue (Min-Heap)',
        matrix: '🧮 2D Matrix (DP)',
        disjoint_sets: '🔗 Disjoint Sets (Union-Find)',
    };

    return (
        <div className="landing-view">
            {/* Living Constellation Graph & Ambient Mesh Canvas */}
            <LandingBackground />

            {/* Top Navigation Bar with Authentication & Quiz History */}
            <div className="landing-top-bar">
                <UserMenu />
                <button
                    className="top-bar-history-btn"
                    onClick={openHistoryModal}
                    title={user ? "View all your saved quiz and examination results" : "Quiz history is only saved and viewable with an account"}
                >
                    <span className="history-icon">📊</span>
                    <span>Quiz History</span>
                </button>
            </div>

            <motion.div
                className="modal glass-modal"
                initial={{ opacity: 0, scale: 0.95, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Left sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div className="sidebar-logo-wrapper">
                            <AlgorbitLogo size={36} className="sidebar-logo" />
                            <div className="logo-ambient-glow" />
                        </div>
                        <div className="sidebar-title-group">
                            <h1 className="brand-title">ALGORBIT</h1>
                            <p className="sidebar-subtitle">Graph Algorithm Visualizer</p>
                        </div>
                    </div>

                    {/* Comprehensive Graph Examination Banner */}
                    <div 
                        className="master-quiz-banner"
                        onClick={() => onStartQuiz && onStartQuiz('ALL')}
                        title="Take a 20-question test drawn evenly across all 10 algorithms"
                    >
                        <div className="banner-left">
                            <div className="banner-trophy-circle">📋</div>
                            <div className="banner-text">
                                <div className="banner-badge">COMPREHENSIVE TEST</div>
                                <div className="banner-title">
                                    <span>20 Test Questions</span>
                                    {latestExam && (
                                        <span className="banner-score-tag">
                                            <span className="banner-score-dot">·</span>
                                            <span>Last: {latestExam.percentage}%</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span className="banner-chevron">→</span>
                    </div>

                    <div className="btn-group">
                        {grouped.map(({ category, algs }) => (
                            <div key={category} className="alg-category">
                                <div className="alg-category-label">
                                    <span className="cat-icon">{CATEGORY_ICONS[category]}</span>
                                    <span>{category}</span>
                                </div>
                                {algs.map(key => {
                                    const isHovered = hoveredAlg === key;
                                    return (
                                        <button
                                            key={key}
                                            className={`alg-btn ${isHovered ? 'hovered' : ''}`}
                                            onMouseEnter={() => setHoveredAlg(key)}
                                            onClick={() => setHoveredAlg(key)}
                                        >
                                            {isHovered && <span className="active-indicator-pip" />}
                                            <span className="alg-btn-title">{config.algorithms[key].title}</span>
                                            {latestResults[key] && (
                                                <span className="alg-row-score-badge" title={`Latest score: ${latestResults[key].percentage}%`}>
                                                    {latestResults[key].percentage}%
                                                </span>
                                            )}
                                            <span className="alg-btn-complexity">{config.algorithms[key].complexity}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="sidebar-hint">
                        <span className="kbd-shortcut"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                    </div>
                </div>

                {/* Right description & interactive preview pane */}
                <div className="description-pane">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={hoveredAlg}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="desc-content"
                        >
                            <div className="desc-meta">
                                <span className="complexity-badge-landing">{algInfo.complexity}</span>
                                <span className="category-chip">{algInfo.category}</span>
                                {algInfo.dataStructure && (
                                    <span className="ds-chip-landing" title="Underlying Data Structure">
                                        {DS_ICONS[algInfo.dataStructure] || algInfo.dataStructure}
                                    </span>
                                )}
                            </div>

                            <h2>{algInfo.title}</h2>
                            <h3>{algInfo.tagline}</h3>

                            <p>{algInfo.description}</p>

                            {/* Live Animated Algorithm Characteristic Visual Preview */}
                            <AlgorithmMiniPreview algorithm={hoveredAlg} />

                            {/* Key Concepts & Invariants */}
                            {((algInfo.insights || algInfo.courseInsights) && (algInfo.insights || algInfo.courseInsights).length > 0) && (
                                <div className="course-insights-card">
                                    <div className="course-insights-header">
                                        <span className="course-insights-icon">⚡</span>
                                        <span className="course-insights-title">Concepts & Invariants</span>
                                    </div>
                                    <div className="course-insights-list">
                                        {(algInfo.insights || algInfo.courseInsights).map((insight, idx) => (
                                            <div key={idx} className="course-insight-item">
                                                <span className="insight-badge">{insight.label}</span>
                                                <span className="insight-text">{insight.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="desc-tags">
                                {algInfo.requiresWeighted && (
                                    <span className="desc-tag">⚖️ Weighted</span>
                                )}
                                {algInfo.requiresDirected === true && (
                                    <span className="desc-tag">→ Directed</span>
                                )}
                                {algInfo.requiresDirected === false && (
                                    <span className="desc-tag">↔ Undirected</span>
                                )}
                                {algInfo.requiresStart && (
                                    <span className="desc-tag">★ Start Vertex</span>
                                )}
                                {algInfo.requiresSource && (
                                    <span className="desc-tag">▶ Source / Sink Network</span>
                                )}
                            </div>

                            <div className="launch-action-row">
                                <button
                                    className="visualize-btn pulse-glow-btn"
                                    onClick={() => onSelectAlgorithm(hoveredAlg)}
                                >
                                    <span>Visualize Algorithm</span>
                                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                                <button
                                    className="exercise-btn"
                                    onClick={() => onStartQuiz && onStartQuiz(hoveredAlg)}
                                    title={`Take 10 practice questions on ${algInfo.title}`}
                                >
                                    <span className="exercise-icon">📝</span>
                                    <span>Exercise (10 Qs)</span>
                                </button>
                                {latestForHovered && (
                                    <div 
                                        className="exercise-latest-score-pill"
                                        onClick={openHistoryModal}
                                        title={`Latest ${algInfo.title} result: ${latestForHovered.score}/${latestForHovered.total} (${latestForHovered.percentage}%). Click to view full records.`}
                                    >
                                        <span className="pill-dot" />
                                        <span className="pill-label">Last:</span>
                                        <span className="pill-val">{latestForHovered.score}/{latestForHovered.total}</span>
                                        <span className="pill-pct">({latestForHovered.percentage}%)</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}