import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const QuizResultsContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const getStorageKey = (u) => {
    const id = u?.id || u?._id;
    return id ? `algorbit_quiz_history_${id}` : null;
};

const loadLocalResults = (u) => {
    try {
        // Clean legacy or guest keys if present
        localStorage.removeItem('algorbit_quiz_history_v1');
        localStorage.removeItem('algorbit_quiz_history_guest');
    } catch (e) {}

    const key = getStorageKey(u);
    if (!key) return []; // Client mode: start fresh on refresh!

    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
};

const quizApi = axios.create({
    baseURL: `${API_BASE_URL}/api/quiz`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Resilient token attachment
quizApi.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('algorbit_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {}
    return config;
});

export const QuizResultsProvider = ({ children }) => {
    const { user } = useAuth();
    const [quizResults, setQuizResults] = useState(() => loadLocalResults(user));
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const prevUserIdRef = React.useRef(user?.id || user?._id || null);

    // Compute latest result per algorithm from current state
    const latestResults = React.useMemo(() => {
        const map = {};
        for (const item of quizResults) {
            if (item.algorithm && !map[item.algorithm]) {
                map[item.algorithm] = item;
            }
        }
        return map;
    }, [quizResults]);

    // Compute overall statistics
    const stats = React.useMemo(() => {
        const total = quizResults.length;
        if (total === 0) return { totalTests: 0, avgScore: 0, bestScore: 0 };
        const sum = quizResults.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
        const best = Math.max(...quizResults.map(q => q.percentage || 0));
        return {
            totalTests: total,
            avgScore: Math.round(sum / total),
            bestScore: best
        };
    }, [quizResults]);

    // Fetch quiz results from database for the active user session
    const fetchResults = useCallback(async () => {
        const currentKey = getStorageKey(user);
        if (!currentKey) {
            // In client mode: do not fetch from server, and do not wipe in-memory results
            return;
        }
        try {
            const res = await quizApi.get('/results');
            if (res.data?.results) {
                const dbResults = res.data.results;
                // dbResults is authoritatively scoped to the currently authenticated user
                setQuizResults(dbResults);
                try {
                    localStorage.setItem(currentKey, JSON.stringify(dbResults));
                } catch (e) {}
            }
        } catch (err) {
            // Offline or server unreachable: fallback to user-scoped cache
            const cached = loadLocalResults(user);
            setQuizResults(cached);
        }
    }, [user]);

    // Switch results instantly when user identity changes (login, logout, switch user)
    useEffect(() => {
        const currentId = user?.id || user?._id || null;
        if (currentId !== prevUserIdRef.current) {
            prevUserIdRef.current = currentId;
            // Instantly replace active state with the new user's local cache to prevent data bleed
            setQuizResults(loadLocalResults(user));
            // Then fetch latest fresh database records if authenticated
            if (currentId) {
                fetchResults();
            }
        }
    }, [user, fetchResults]);

    // Initial load on mount
    useEffect(() => {
        if (user?.id || user?._id) {
            fetchResults();
        }
    }, [fetchResults, user]);

    // Purge any legacy guest keys on mount
    useEffect(() => {
        try {
            localStorage.removeItem('algorbit_quiz_history_guest');
            localStorage.removeItem('algorbit_quiz_history_v1');
        } catch (e) {}
    }, []);

    // Save a new quiz result
    const saveQuizResult = useCallback(async ({ algorithm, mode, score, total, percentage, gradeBadge }) => {
        const now = new Date().toISOString();
        const localItem = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            algorithm,
            mode: mode || 'practice',
            score,
            total,
            percentage,
            gradeBadge: gradeBadge || 'Intermediate',
            created_at: now
        };

        const currentKey = getStorageKey(user);

        // Update local state in memory for zero-delay UI response during this view
        setQuizResults(prev => {
            const updated = [localItem, ...prev];
            if (currentKey) {
                try {
                    localStorage.setItem(currentKey, JSON.stringify(updated));
                } catch (e) {}
            }
            return updated;
        });

        // Persist to database ONLY if user is authenticated
        if (currentKey) {
            try {
                const res = await quizApi.post('/results', {
                    algorithm,
                    mode: mode || 'practice',
                    score,
                    total,
                    percentage,
                    grade_badge: gradeBadge || 'Intermediate'
                });
                if (res.data?.result) {
                    setQuizResults(prev => {
                        const updated = prev.map(item => 
                            item.id === localItem.id ? { ...item, id: res.data.result.id } : item
                        );
                        try {
                            localStorage.setItem(currentKey, JSON.stringify(updated));
                        } catch (e) {}
                        return updated;
                    });
                }
            } catch (e) {}
        }

        return localItem;
    }, [user]);

    return (
        <QuizResultsContext.Provider value={{
            quizResults,
            latestResults,
            stats,
            saveQuizResult,
            refreshResults: fetchResults,
            isHistoryModalOpen,
            openHistoryModal: () => {
                if (user?.id || user?._id) {
                    fetchResults();
                }
                setIsHistoryModalOpen(true);
            },
            closeHistoryModal: () => setIsHistoryModalOpen(false)
        }}>
            {children}
        </QuizResultsContext.Provider>
    );
};

export const useQuizResults = () => {
    const context = useContext(QuizResultsContext);
    if (!context) {
        throw new Error('useQuizResults must be used within a QuizResultsProvider');
    }
    return context;
};
