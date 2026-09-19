import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import quizData from '../data/quizzes.json';
import QuizGraphCanvas from './QuizGraphCanvas';
import { useQuizResults } from '../context/QuizResultsContext';

export const ALGORITHM_DISPLAY_NAMES = {
    BFS: 'Breadth-First Search',
    DFS: 'Depth-First Search',
    Dijkstra: 'Dijkstra',
    FloydWarshall: 'Floyd-Warshall',
    Kruskal: 'Kruskal',
    Prim: 'Prim',
    FordFulkerson: 'Ford-Fulkerson',
    EdmondsKarp: 'Edmonds-Karp',
    Kosaraju: 'Kosaraju',
    Tarjan: 'Tarjan'
};

export function formatAlgName(key) {
    if (!key) return '';
    return ALGORITHM_DISPLAY_NAMES[key] || key.replace(/([a-z])([A-Z])/g, '$1-$2');
}

function shuffleQuestionOptions(q) {
    if (!q || !q.options || q.options.length === 0) return q;
    const correctOptionText = q.options[q.correctIndex];
    const shuffledOptions = [...q.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
    const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);
    return {
        ...q,
        options: shuffledOptions,
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : q.correctIndex
    };
}

export default function QuizModal({ algorithm, onClose, onVisualizeGraph, isMinimized = false }) {
    const isMasterExam = algorithm === 'ALL';
    const title = isMasterExam 
        ? 'Graph Examination' 
        : `${formatAlgName(algorithm)} · Quiz`;
    const subtitle = isMasterExam
        ? '20 comprehensive questions drawn evenly across all 10 graph algorithms'
        : '10 randomized practice questions testing invariants, edge classification & traces';

    // Mode: 'practice' (immediate feedback + explanation) or 'exam' (strict exam, score at the end)
    const [mode, setMode] = useState('practice');
    // Whether user has selected a mode in the mandatory entry pop-up
    const [hasChosenMode, setHasChosenMode] = useState(false);
    // Session key incremented on retake to pick fresh random questions & options
    const [sessionKey, setSessionKey] = useState(0);
    
    // Select questions with graph deduplication and option shuffling
    const questions = useMemo(() => {
        const shuffleList = (list) => {
            const copy = [...list];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        const getGraphKey = (q) => {
            if (!q.graph) return q.id;
            const nodesKey = (q.graph.nodes || []).map(n => n.id).join(',');
            const edgesKey = (q.graph.edges || []).map(e => `${e.source}-${e.target}-${e.weight ?? ''}`).join(';');
            return `${nodesKey}::${edgesKey}`;
        };

        const pickUniqueGraphQuestions = (pool, count) => {
            const shuffledPool = shuffleList(pool);
            const chosen = [];
            const seenGraphs = new Set();
            for (const q of shuffledPool) {
                const gKey = getGraphKey(q);
                if (!seenGraphs.has(gKey)) {
                    seenGraphs.add(gKey);
                    chosen.push(q);
                    if (chosen.length === count) break;
                }
            }
            if (chosen.length < count) {
                for (const q of shuffledPool) {
                    if (!chosen.some(c => c.id === q.id)) {
                        chosen.push(q);
                        if (chosen.length === count) break;
                    }
                }
            }
            return chosen.map(shuffleQuestionOptions);
        };

        if (isMasterExam) {
            // Draw 2 questions from each of the 10 algorithms with unique graphs
            const byAlg = {};
            quizData.questions.forEach(q => {
                if (!byAlg[q.algorithm]) byAlg[q.algorithm] = [];
                byAlg[q.algorithm].push(q);
            });
            const sampled = [];
            quizData.algorithms.forEach(algKey => {
                const list = byAlg[algKey] || [];
                const picked = pickUniqueGraphQuestions(list, 2);
                sampled.push(...picked);
            });
            return shuffleList(sampled);
        } else {
            // Pick strictly 10 unique graph questions from this algorithm's pool
            const pool = quizData.questions.filter(q => q.algorithm === algorithm);
            return pickUniqueGraphQuestions(pool, 10);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [algorithm, isMasterExam, sessionKey]);

    const totalQuestions = questions.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    // User answers map: { [questionId]: selectedOptionIndex }
    const [userAnswers, setUserAnswers] = useState({});
    // Whether exam has been submitted
    const [isSubmitted, setIsSubmitted] = useState(false);
    // In practice mode, whether current question explanation is revealed
    const [practiceRevealed, setPracticeRevealed] = useState(false);
    // Filter for review in results screen: 'all', 'wrong', 'correct'
    const [reviewFilter, setReviewFilter] = useState('all');

    const currentQ = questions[currentIndex];
    const currentAnswer = currentQ ? userAnswers[currentQ.id] : undefined;

    // Reset practice revealed status when navigating questions in practice mode
    useEffect(() => {
        if (mode === 'practice' && currentQ) {
            setPracticeRevealed(userAnswers[currentQ.id] !== undefined);
        }
    }, [currentIndex, mode, currentQ, userAnswers]);

    // Handle option click
    const handleSelectOption = (optIndex) => {
        if (isSubmitted) return;
        if (mode === 'practice' && userAnswers[currentQ.id] !== undefined) {
            // In practice mode, lock once selected to prevent guessing
            return;
        }

        setUserAnswers(prev => ({
            ...prev,
            [currentQ.id]: optIndex
        }));

        if (mode === 'practice') {
            setPracticeRevealed(true);
        }
    };

    // Calculate score
    const scoreStats = useMemo(() => {
        let correctCount = 0;
        let answeredCount = 0;

        questions.forEach(q => {
            const ans = userAnswers[q.id];
            if (ans !== undefined) {
                answeredCount++;
                if (ans === q.correctIndex) {
                    correctCount++;
                }
            }
        });

        const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        
        let gradeBadge = 'Needs Review';
        let gradeColor = '#94a3b8';
        if (percentage >= 90) {
            gradeBadge = 'Distinction';
            gradeColor = '#10b981';
        } else if (percentage >= 80) {
            gradeBadge = 'Advanced';
            gradeColor = '#3b82f6';
        } else if (percentage >= 70) {
            gradeBadge = 'Proficient';
            gradeColor = '#6366f1';
        } else if (percentage >= 50) {
            gradeBadge = 'Intermediate';
            gradeColor = '#f59e0b';
        } else {
            gradeBadge = 'Needs Review';
            gradeColor = '#ef4444';
        }

        return { correctCount, answeredCount, total: totalQuestions, percentage, gradeBadge, gradeColor };
    }, [questions, userAnswers, totalQuestions]);

    const { saveQuizResult } = useQuizResults();
    const hasSavedResultRef = useRef(false);

    // Automatically record quiz result to persistent storage & database upon test submission
    useEffect(() => {
        if (isSubmitted && !hasSavedResultRef.current && scoreStats.total > 0) {
            hasSavedResultRef.current = true;
            saveQuizResult({
                algorithm,
                mode,
                score: scoreStats.correctCount,
                total: scoreStats.total,
                percentage: scoreStats.percentage,
                gradeBadge: scoreStats.gradeBadge
            });
        }
    }, [isSubmitted, algorithm, mode, scoreStats, saveQuizResult]);

    const handleRestart = () => {
        setUserAnswers({});
        setCurrentIndex(0);
        setIsSubmitted(false);
        setPracticeRevealed(false);
        setHasChosenMode(false);
        hasSavedResultRef.current = false;
        setSessionKey(k => k + 1);
    };

    // Filtered questions for review
    const filteredQuestions = useMemo(() => {
        if (reviewFilter === 'wrong') {
            return questions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.correctIndex);
        }
        if (reviewFilter === 'correct') {
            return questions.filter(q => userAnswers[q.id] === q.correctIndex);
        }
        return questions;
    }, [questions, userAnswers, reviewFilter]);

    if (!currentQ && !isSubmitted) {
        return null;
    }

    return (
        <div 
            className="quiz-modal-overlay" 
            onClick={onClose}
            style={isMinimized ? { display: 'none' } : undefined}
        >
            <motion.div 
                className="quiz-modal-container"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
                {/* ── Modal Header ── */}
                <div className="quiz-modal-header">
                    <div className="quiz-header-left">
                        <div className="quiz-title-row">
                            <span className="quiz-badge">{isMasterExam ? 'COMPREHENSIVE TEST' : formatAlgName(algorithm)}</span>
                            <h2 className="quiz-title">{title}</h2>
                        </div>
                        <p className="quiz-subtitle">
                            {!hasChosenMode ? 'Choose a mode below to begin this session' : subtitle}
                        </p>
                    </div>

                    <div className="quiz-header-right">
                        {/* Static Mode Indicator — mode cannot be changed once chosen */}
                        {hasChosenMode && (
                            <span className={`quiz-current-mode-tag mode-${mode}`}>
                                {mode === 'practice' ? '🎯 Practice Mode' : '⏱️ Test Mode'}
                            </span>
                        )}

                        <button className="quiz-close-btn" onClick={onClose} title="Close Quiz">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Progress Bar — visible only when mode is chosen ── */}
                {hasChosenMode && !isSubmitted && (
                    <div className="quiz-progress-section">
                        <div className="quiz-progress-meta">
                            <div className="progress-top-row">
                                <span className="q-counter">Question <strong>{currentIndex + 1}</strong> of {totalQuestions}</span>
                                <div className="progress-stats mobile-progress-stats">
                                    <span>Answered: <strong>{Object.keys(userAnswers).length}/{totalQuestions}</strong></span>
                                </div>
                            </div>
                            <div className="progress-tags">
                                {currentQ.difficulty && (
                                    <span className={`diff-tag diff-${currentQ.difficulty.toLowerCase()}`}>
                                        {currentQ.difficulty}
                                    </span>
                                )}
                                {currentQ.algorithm && (
                                    <span className="alg-tag">
                                        Topic: <strong>{formatAlgName(currentQ.algorithm)}</strong>
                                    </span>
                                )}
                            </div>
                            <div className="progress-stats desktop-progress-stats">
                                <span>Answered: <strong>{Object.keys(userAnswers).length}/{totalQuestions}</strong></span>
                            </div>
                        </div>
                        <div className="quiz-progress-track">
                            <div 
                                className="quiz-progress-fill" 
                                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Modal Body ── */}
                <div className="quiz-modal-body">
                    {!hasChosenMode ? (
                        /* ── Forced Mode Selection Screen ── */
                        <div className="quiz-mode-selection-screen">
                            <div className="mode-select-intro">
                                <h3>Select Session Mode</h3>
                                <p>
                                    Please choose how you would like to complete this session before proceeding:
                                </p>
                            </div>

                            <div className="mode-cards-grid">
                                {/* Practice Mode Card */}
                                <div 
                                    className="mode-card practice-card"
                                    onClick={() => {
                                        setMode('practice');
                                        setHasChosenMode(true);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="mode-card-header">
                                        <div className="mode-card-badge">🎯 Practice Mode</div>
                                    </div>
                                    <h4 className="mode-card-title">Interactive Learning</h4>
                                    <p className="mode-card-desc">
                                        Explore and master algorithm concepts with guided step-by-step feedback.
                                    </p>
                                    <ul className="mode-perks-list">
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Instant Feedback:</strong> See if you are correct immediately after picking an option.</span>
                                        </li>
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Detailed Explanations:</strong> Review invariant properties, cuts, and proofs.</span>
                                        </li>
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Direct Canvas Simulation:</strong> Jump straight into the visualizer to run the algorithm on that exact graph.</span>
                                        </li>
                                    </ul>
                                    <button 
                                        type="button" 
                                        className="mode-select-action-btn practice-action-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMode('practice');
                                            setHasChosenMode(true);
                                        }}
                                    >
                                        <span>Start Practice Mode</span>
                                        <span>→</span>
                                    </button>
                                </div>

                                {/* Test Mode Card */}
                                <div 
                                    className="mode-card test-card"
                                    onClick={() => {
                                        setMode('exam');
                                        setHasChosenMode(true);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="mode-card-header">
                                        <div className="mode-card-badge">⏱️ Test Mode</div>
                                    </div>
                                    <h4 className="mode-card-title">Formal Evaluation</h4>
                                    <p className="mode-card-desc">
                                        Evaluate your comprehension under realistic assessment conditions without hints.
                                    </p>
                                    <ul className="mode-perks-list">
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Test Conditions:</strong> Questions are answered sequentially with no hints or answers revealed.</span>
                                        </li>
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Scorecard Analysis:</strong> Receive a percentage score and performance evaluation at the end.</span>
                                        </li>
                                        <li>
                                            <span className="perk-check">✓</span>
                                            <span><strong>Full Review & Visualizer:</strong> Inspect all questions and run algorithms on test graphs upon completion.</span>
                                        </li>
                                    </ul>
                                    <button 
                                        type="button" 
                                        className="mode-select-action-btn test-action-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMode('exam');
                                            setHasChosenMode(true);
                                        }}
                                    >
                                        <span>Start Test Mode</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : !isSubmitted ? (
                        /* Question & Answer View */
                        <div className="quiz-question-view">
                            {/* Visual Graph Diagram for Questions with Topologies */}
                            {currentQ.graph && (
                                <QuizGraphCanvas graph={currentQ.graph} />
                            )}

                            <div className="quiz-question-card">
                                <div className="q-number-pill">Q{currentIndex + 1}</div>
                                <h3 className="quiz-question-text">{currentQ.question}</h3>
                            </div>

                            <div className="quiz-options-list">
                                {currentQ.options.map((opt, idx) => {
                                    const isSelected = currentAnswer === idx;
                                    const isCorrect = idx === currentQ.correctIndex;
                                    
                                    // Status in Practice Mode
                                    let optionClass = 'quiz-opt-btn';
                                    if (mode === 'practice' && practiceRevealed) {
                                        if (isCorrect) {
                                            optionClass += ' opt-correct';
                                        } else if (isSelected) {
                                            optionClass += ' opt-wrong';
                                        } else {
                                            optionClass += ' opt-disabled';
                                        }
                                    } else if (isSelected) {
                                        optionClass += ' opt-selected';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={optionClass}
                                            onClick={() => handleSelectOption(idx)}
                                            disabled={mode === 'practice' && practiceRevealed}
                                        >
                                            <span className="opt-letter">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="opt-text">{opt}</span>
                                            {mode === 'practice' && practiceRevealed && (
                                                <span className="opt-icon-status">
                                                    {isCorrect ? '✓' : isSelected ? '✕' : ''}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Practice Mode Explanation Box */}
                            {mode === 'practice' && practiceRevealed && (
                                <motion.div 
                                    className={`quiz-explanation-box ${currentAnswer === currentQ.correctIndex ? 'exp-correct' : 'exp-incorrect'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="exp-header">
                                        <span className="exp-icon">
                                            {currentAnswer === currentQ.correctIndex ? '✅ Correct!' : '❌ Incorrect'}
                                        </span>
                                        <span className="exp-title">Explanation</span>
                                    </div>
                                    <p className="exp-content">{currentQ.explanation}</p>

                                    {currentQ.graph && onVisualizeGraph && (
                                        <div className="exp-actions">
                                            <button
                                                type="button"
                                                className="quiz-visualize-btn"
                                                onClick={() => onVisualizeGraph(currentQ.algorithm, currentQ.graph, {
                                                    currentQNum: currentIndex + 1,
                                                    totalQuestions,
                                                    title,
                                                    algorithm,
                                                    isReview: false
                                                })}
                                                title="Open and visualize this algorithm on this graph in the visualizer"
                                            >
                                                <span className="viz-btn-icon">▶</span>
                                                <span>Visualize {formatAlgName(currentQ.algorithm)} on this Graph</span>
                                                <span className="viz-btn-arrow">→</span>
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        /* Results / Scorecard View */
                        <div className="quiz-results-view">
                            <div className="quiz-score-card">
                                <div className="score-circle-container">
                                    <svg className="score-circle" viewBox="0 0 120 120">
                                        <circle 
                                            className="circle-bg" 
                                            cx="60" cy="60" r="50" 
                                            strokeWidth="10" 
                                        />
                                        <circle 
                                            className="circle-progress" 
                                            cx="60" cy="60" r="50" 
                                            strokeWidth="10"
                                            stroke={scoreStats.gradeColor}
                                            strokeDasharray={2 * Math.PI * 50}
                                            strokeDashoffset={2 * Math.PI * 50 * (1 - scoreStats.percentage / 100)}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="score-center-text">
                                        <span className="score-number">{scoreStats.percentage}%</span>
                                        <span className="score-sub">{scoreStats.correctCount}/{scoreStats.total}</span>
                                    </div>
                                </div>

                                <div className="score-summary-meta">
                                    <div 
                                        className="score-rank-badge" 
                                        style={{ borderColor: scoreStats.gradeColor, color: scoreStats.gradeColor }}
                                    >
                                        Assessment: {scoreStats.gradeBadge}
                                    </div>
                                    <h3 className="score-headline">
                                        {scoreStats.percentage >= 80 ? 'Exceptional Comprehension' : scoreStats.percentage >= 60 ? 'Solid Comprehension' : 'Further Review Recommended'}
                                    </h3>
                                    <p className="score-comment">
                                        {scoreStats.percentage >= 80 
                                            ? 'You demonstrated superior command of algorithm invariants, cuts, edge classifications, and trace dynamics.'
                                            : scoreStats.percentage >= 60
                                            ? 'Good grasp of fundamental concepts. Review the detailed explanations below to tighten nuances on edge classification and bounds.'
                                            : 'Review the algorithm invariants and practice the step-by-step traces to build intuition before re-testing.'}
                                    </p>

                                    <div className="results-action-row">
                                        <button className="restart-btn" onClick={handleRestart}>
                                            <span>Retake Test</span>
                                        </button>
                                        <button className="close-results-btn" onClick={onClose}>
                                            <span>Exit to Visualizer</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Review Section */}
                            <div className="quiz-review-section">
                                <div className="review-header">
                                    <h4>Question-by-Question Review</h4>
                                    <div className="review-filter-tabs">
                                        <button 
                                            className={`filter-tab ${reviewFilter === 'all' ? 'active' : ''}`}
                                            onClick={() => setReviewFilter('all')}
                                        >
                                            All ({questions.length})
                                        </button>
                                        <button 
                                            className={`filter-tab ${reviewFilter === 'wrong' ? 'active' : ''}`}
                                            onClick={() => setReviewFilter('wrong')}
                                        >
                                            Incorrect ({questions.length - scoreStats.correctCount})
                                        </button>
                                        <button 
                                            className={`filter-tab ${reviewFilter === 'correct' ? 'active' : ''}`}
                                            onClick={() => setReviewFilter('correct')}
                                        >
                                            Correct ({scoreStats.correctCount})
                                        </button>
                                    </div>
                                </div>

                                <div className="review-list">
                                    {filteredQuestions.map((q, idx) => {
                                        const userAns = userAnswers[q.id];
                                        const isCorrect = userAns === q.correctIndex;
                                        return (
                                            <div key={q.id} className={`review-card ${isCorrect ? 'rev-correct' : 'rev-wrong'}`}>
                                                <div className="rev-meta-line">
                                                    <span className="rev-q-num">#{questions.indexOf(q) + 1}</span>
                                                    <span className="rev-alg-tag">{formatAlgName(q.algorithm)}</span>
                                                    <span className="rev-diff-tag">{q.difficulty}</span>
                                                    <span className={`rev-status-pill ${isCorrect ? 'pill-green' : 'pill-red'}`}>
                                                        {isCorrect ? 'Correct' : userAns !== undefined ? 'Incorrect' : 'Skipped'}
                                                    </span>
                                                </div>
                                                <h5 className="rev-question">{q.question}</h5>
                                                
                                                <div className="rev-choices">
                                                    {q.options.map((opt, oIdx) => {
                                                        const isUser = userAns === oIdx;
                                                        const isAnswerKey = oIdx === q.correctIndex;
                                                        let choiceClass = 'rev-choice';
                                                        if (isAnswerKey) choiceClass += ' choice-correct';
                                                        if (isUser && !isAnswerKey) choiceClass += ' choice-wrong';
                                                        return (
                                                            <div key={oIdx} className={choiceClass}>
                                                                <span className="choice-label">{String.fromCharCode(65 + oIdx)}</span>
                                                                <span className="choice-text">{opt}</span>
                                                                {isUser && <span className="user-mark">Your Pick</span>}
                                                                {isAnswerKey && <span className="correct-mark">Correct</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {q.graph && (
                                                    <QuizGraphCanvas graph={q.graph} mini={true} />
                                                )}

                                                <div className="rev-explanation">
                                                    <strong>Explanation:</strong> {q.explanation}
                                                </div>

                                                {q.graph && onVisualizeGraph && (
                                                    <div className="rev-actions">
                                                        <button
                                                            type="button"
                                                            className="quiz-visualize-btn rev-viz-btn"
                                                            onClick={() => onVisualizeGraph(q.algorithm, q.graph, {
                                                                currentQNum: questions.indexOf(q) + 1,
                                                                totalQuestions,
                                                                title,
                                                                algorithm,
                                                                isReview: true
                                                            })}
                                                            title="Open and visualize this algorithm on this graph in the visualizer"
                                                        >
                                                            <span className="viz-btn-icon">▶</span>
                                                            <span>Visualize {formatAlgName(q.algorithm)} on this Graph</span>
                                                            <span className="viz-btn-arrow">→</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ── */}
                {hasChosenMode && !isSubmitted && (
                    <div className="quiz-modal-footer">
                        <div className="footer-left">
                            <button 
                                className="nav-step-btn"
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                            >
                                ← Previous
                            </button>
                        </div>

                        <div className="footer-center">
                            {/* Question jumps dropdown or dot indicators */}
                            <span className="jump-hint">
                                Question {currentIndex + 1} of {totalQuestions}
                            </span>
                        </div>

                        <div className="footer-right">
                            {currentIndex < totalQuestions - 1 ? (
                                <button 
                                    className="nav-step-btn primary-step-btn"
                                    onClick={() => setCurrentIndex(prev => prev + 1)}
                                >
                                    Next Question →
                                </button>
                            ) : (
                                <button 
                                    className="submit-exam-btn"
                                    onClick={() => setIsSubmitted(true)}
                                >
                                    Submit Test
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
