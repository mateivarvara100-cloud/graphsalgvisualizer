import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

function FormattedMessage({ content }) {
    if (!content) return null;

    // Split by code blocks first
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="ai-markdown-body">
            {parts.map((part, idx) => {
                if (part.startsWith('```')) {
                    const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                    const lang = match ? match[1] : '';
                    const code = match ? match[2] : part.slice(3, -3);
                    return (
                        <div key={idx} className="ai-code-block">
                            <div className="ai-code-header">
                                <span className="ai-code-lang">{lang || 'code'}</span>
                                <button
                                    type="button"
                                    className="ai-code-copy-btn"
                                    onClick={() => navigator.clipboard.writeText(code.trim())}
                                    title="Copy code"
                                >
                                    Copy
                                </button>
                            </div>
                            <pre><code>{code.trim()}</code></pre>
                        </div>
                    );
                }

                const lines = part.split('\n');
                const elements = [];
                let inTable = false;
                let tableHeader = [];
                let tableRows = [];

                const flushTable = () => {
                    if (inTable) {
                        elements.push(
                            <div key={`table-${elements.length}`} className="ai-table-wrap">
                                <table className="ai-table">
                                    <thead>
                                        <tr>
                                            {tableHeader.map((h, i) => <th key={i}>{parseInline(h)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => <td key={cIdx}>{parseInline(cell)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                        inTable = false;
                        tableHeader = [];
                        tableRows = [];
                    }
                };

                lines.forEach((line, lineIdx) => {
                    const trimmed = line.trim();

                    // Table detection
                    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
                        if (cells.every(c => /^:?-+:?$/.test(c))) {
                            return;
                        }
                        if (!inTable) {
                            inTable = true;
                            tableHeader = cells;
                        } else {
                            tableRows.push(cells);
                        }
                        return;
                    } else if (inTable) {
                        flushTable();
                    }

                    if (!trimmed) {
                        elements.push(<div key={lineIdx} className="ai-spacer" />);
                        return;
                    }

                    // Headings
                    if (trimmed.startsWith('#### ')) {
                        elements.push(<h4 key={lineIdx} className="ai-h4">{parseInline(trimmed.slice(5))}</h4>);
                        return;
                    }
                    if (trimmed.startsWith('### ')) {
                        elements.push(<h3 key={lineIdx} className="ai-h3">{parseInline(trimmed.slice(4))}</h3>);
                        return;
                    }
                    if (trimmed.startsWith('## ')) {
                        elements.push(<h2 key={lineIdx} className="ai-h2">{parseInline(trimmed.slice(3))}</h2>);
                        return;
                    }

                    // Alerts
                    if (trimmed.startsWith('> [!NOTE]') || trimmed.startsWith('> [!TIP]') || trimmed.startsWith('> [!WARNING]')) {
                        const alertType = trimmed.includes('TIP') ? 'tip' : trimmed.includes('WARNING') ? 'warning' : 'note';
                        elements.push(
                            <div key={lineIdx} className={`ai-alert ai-alert-${alertType}`}>
                                <span className="ai-alert-badge">{alertType.toUpperCase()}</span>
                                <span className="ai-alert-content">{parseInline(trimmed.replace(/^> \[[!A-Z]+\]\s*/, ''))}</span>
                            </div>
                        );
                        return;
                    }

                    if (trimmed.startsWith('> ')) {
                        elements.push(
                            <blockquote key={lineIdx} className="ai-blockquote">
                                {parseInline(trimmed.slice(2))}
                            </blockquote>
                        );
                        return;
                    }

                    // Lists
                    if (/^[-*]\s+/.test(trimmed)) {
                        elements.push(
                            <div key={lineIdx} className="ai-list-item">
                                <span className="ai-bullet">•</span>
                                <span>{parseInline(trimmed.replace(/^[-*]\s+/, ''))}</span>
                            </div>
                        );
                        return;
                    }

                    if (/^\d+\.\s+/.test(trimmed)) {
                        const num = trimmed.match(/^(\d+)\.\s+/)[1];
                        elements.push(
                            <div key={lineIdx} className="ai-list-item">
                                <span className="ai-num">{num}.</span>
                                <span>{parseInline(trimmed.replace(/^\d+\.\s+/, ''))}</span>
                            </div>
                        );
                        return;
                    }

                    elements.push(<p key={lineIdx} className="ai-p">{parseInline(trimmed)}</p>);
                });

                flushTable();
                return <React.Fragment key={idx}>{elements}</React.Fragment>;
            })}
        </div>
    );
}

function parseInline(text) {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
            return <strong key={i}>{seg.slice(2, -2)}</strong>;
        }
        if (seg.startsWith('`') && seg.endsWith('`')) {
            return <code key={i} className="ai-inline-code">{seg.slice(1, -1)}</code>;
        }
        return seg;
    });
}

// ── Per-User Chat Persistence Helpers ───────────────────────────────────────
const DEFAULT_WELCOME_MESSAGE = [
    {
        role: 'assistant',
        content: `### 👋 Hi, I'm Algorbit AI!
I'm your interactive graph algorithms mentor. Ask me anything about graph concepts, code implementations, step-by-step logic, or time & space complexities!

You can also click any of the suggested questions below to get started.`
    }
];

const getChatStorageKey = (u) => {
    const id = u?.id || u?._id;
    return id ? `algorbit_chat_${id}` : null;
};

const loadChatMessages = (u) => {
    try {
        localStorage.removeItem('algorbit_chat_guest');
    } catch (e) { }

    const key = getChatStorageKey(u);
    if (!key) return DEFAULT_WELCOME_MESSAGE; // Client mode: start fresh with default welcome on refresh!

    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) { }
    return DEFAULT_WELCOME_MESSAGE;
};

export default function AIAssistant({
    activeAlg = 'BFS',
    currentView = 'landing',
    nodes = [],
    edges = [],
    currentStepIndex = 0,
    totalSteps = 0,
    activeLine = null,
    isQuizActive = false,
}) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => loadChatMessages(user));
    const [inputQuery, setInputQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachContext, setAttachContext] = useState(true);
    const [isGeminiActive, setIsGeminiActive] = useState(false);

    const prevChatUserIdRef = useRef(user?.id || user?._id || null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-close AI Assistant if a quiz is opened on screen
    useEffect(() => {
        if (isQuizActive) {
            setIsOpen(false);
        }
    }, [isQuizActive]);

    // Listen for custom trigger from top-bar or external components
    useEffect(() => {
        const handleToggleAI = () => {
            setIsOpen(prev => !prev);
        };
        window.addEventListener('toggle-algorbit-ai', handleToggleAI);
        return () => window.removeEventListener('toggle-algorbit-ai', handleToggleAI);
    }, []);

    // Switch chat thread when user logs in, logs out, or switches accounts
    useEffect(() => {
        const currentId = user?.id || user?._id || null;
        if (currentId !== prevChatUserIdRef.current) {
            prevChatUserIdRef.current = currentId;
            setMessages(loadChatMessages(user));
        }
    }, [user]);

    // Persist messages scoped to current user session ONLY when logged in
    useEffect(() => {
        const key = getChatStorageKey(user);
        if (key) {
            try {
                localStorage.setItem(key, JSON.stringify(messages));
            } catch (e) { }
        }
    }, [messages, user]);

    // Purge legacy guest chat from localStorage on mount
    useEffect(() => {
        try {
            localStorage.removeItem('algorbit_chat_guest');
        } catch (e) { }
    }, []);

    const handleClearChat = () => {
        const cleared = [
            {
                role: 'assistant',
                content: `### 🧹 Chat History Cleared\nAsk anything about graph algorithms, time complexities, or current visualizer steps!`
            }
        ];
        setMessages(cleared);
        const key = getChatStorageKey(user);
        if (key) {
            try {
                localStorage.setItem(key, JSON.stringify(cleared));
            } catch (e) { }
        } else {
            try {
                localStorage.removeItem('algorbit_chat_guest');
            } catch (e) { }
        }
    };

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Check assistant connectivity status on mount & modal open
    const checkAssistantStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/assistant/status`);
            if (res.data) {
                setIsGeminiActive(Boolean(res.data.gemini_api_configured));
            }
        } catch (err) {
            // Ignore offline error
        }
    };

    useEffect(() => {
        checkAssistantStatus();
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            checkAssistantStatus();
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, messages]);

    // Dynamic suggested prompts based on current algorithm
    const getSuggestions = () => {
        if (currentView === 'visualizer' || currentView === 'editor') {
            if (activeAlg === 'Dijkstra') {
                return [
                    "What is Dijkstra's time complexity?",
                    "Why does Dijkstra fail on negative weights?",
                    "Compare Dijkstra vs Floyd-Warshall",
                    "What is happening at this step?"
                ];
            }
            if (activeAlg === 'Kruskal') {
                return [
                    "How does Kruskal detect cycles?",
                    "Compare Kruskal vs Prim",
                    "What is the time complexity with Union-Find?",
                    "Python code for Kruskal"
                ];
            }
            if (activeAlg === 'Prim') {
                return [
                    "Explain Prim's Cut Property",
                    "Compare Prim vs Kruskal",
                    "What data structure makes Prim optimal?",
                    "Does starting vertex affect total MST weight?"
                ];
            }
            if (activeAlg === 'FloydWarshall') {
                return [
                    "Explain Floyd-Warshall 3 nested loops",
                    "How to detect negative cycles?",
                    "Compare Floyd-Warshall vs Dijkstra",
                    "What is the space complexity?"
                ];
            }
            if (activeAlg === 'FordFulkerson' || activeAlg === 'EdmondsKarp') {
                return [
                    "Explain the Max-Flow Min-Cut Theorem",
                    "Why does Edmonds-Karp use BFS?",
                    "What is residual capacity?",
                    "How do back-edges allow undoing flow?"
                ];
            }
            if (activeAlg === 'Kosaraju' || activeAlg === 'Tarjan') {
                return [
                    "Compare Kosaraju vs Tarjan",
                    "Why does Kosaraju reverse the graph?",
                    "How do low and dfn numbers work in Tarjan?",
                    "What is a Strongly Connected Component?"
                ];
            }
            return [
                `Explain ${activeAlg} step-by-step`,
                `What is the time complexity of ${activeAlg}?`,
                "What data structure is used?",
                "Common mistakes & pitfalls"
            ];
        }

        return [
            "Show complexity table for all 10 algorithms",
            "Compare Kruskal vs Prim",
            "Explain Dijkstra vs Floyd-Warshall",
            "How does the Max-Flow Min-Cut Theorem work?",
            "Kosaraju vs Tarjan for SCCs"
        ];
    };

    const handleSendMessage = async (customText = null) => {
        const textToSend = (customText || inputQuery).trim();
        if (!textToSend || isLoading) return;

        setInputQuery('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        const userMsg = { role: 'user', content: textToSend };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setIsLoading(true);

        try {
            const graphPayload = attachContext ? {
                nodes_count: nodes.length,
                edges_count: edges.length,
                current_step: currentStepIndex + 1,
                total_steps: totalSteps,
                active_line: activeLine,
            } : null;

            const res = await axios.post(`${API_BASE_URL}/api/assistant/chat`, {
                messages: newHistory,
                algorithm: activeAlg,
                view: currentView,
                graph_context: graphPayload
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 25000,
            });

            if (res.data && res.data.content) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: res.data.content,
                    source: res.data.source
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "I apologize, but I couldn't generate a response. Please try again."
                }]);
            }
        } catch (err) {
            console.error('Assistant error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `### ℹ️ Offline Algorbit Assistant
I encountered a temporary connection issue communicating with the assistant endpoint.
- **Algorithm**: \`${activeAlg}\`
- **Tip**: Ensure the FastAPI backend is running on \`${API_BASE_URL}\`. Feel free to ask another algorithm question!`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setInputQuery(e.target.value);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 110)}px`;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (isQuizActive) {
        return null;
    }

    return (
        <>
            {/* ── Floating AI Trigger Button ── */}
            <div className={`ai-floating-trigger-wrap view-${currentView}`}>
                <button
                    type="button"
                    className={`ai-floating-btn ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    title={isOpen ? "Close Algorbit AI" : "Ask Algorbit AI (Graph Tutor)"}
                    aria-label="Toggle Algorbit AI Assistant"
                >
                    <div className="ai-btn-glow" />
                    <div className="ai-btn-icon-wrapper">
                        {isOpen ? (
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <span className="ai-sparkle-icon">✨</span>
                        )}
                    </div>
                    {!isOpen && (
                        <span className="ai-btn-label">Algorbit AI</span>
                    )}
                    <span className={`ai-status-pulse ${isGeminiActive ? 'pulse-live' : 'pulse-offline'}`} />
                </button>
            </div>

            {/* ── AI Assistant Drawer Window ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`ai-assistant-window view-${currentView}`}
                        initial={{ opacity: 0, scale: 0.94, y: currentView === 'visualizer' ? -16 : 20, x: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: currentView === 'visualizer' ? -16 : 20 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header */}
                        <div className="ai-window-header">
                            <div className="ai-header-left">
                                <div className="ai-avatar-badge">
                                    <span>✨</span>
                                    <span className={`avatar-online-dot ${isGeminiActive ? 'online' : 'offline'}`} />
                                </div>
                                <div className="ai-title-group">
                                    <div className="ai-brand-row">
                                        <h3 className="ai-title">Algorbit AI</h3>
                                        <span className="ai-mentor-tag">Graph Tutor</span>
                                    </div>
                                    <div className="ai-context-chip" title="Current Active Context">
                                        <span className="chip-indicator" />
                                        <span>{currentView === 'visualizer' ? `Visualizer: ${activeAlg}` : currentView === 'editor' ? `Editor: ${activeAlg}` : `Exploring Graphs`}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="ai-header-actions">
                                <button
                                    type="button"
                                    className="ai-action-icon-btn"
                                    onClick={handleClearChat}
                                    title="Clear conversation"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="ai-action-icon-btn ai-close-window-btn"
                                    onClick={() => setIsOpen(false)}
                                    title="Close"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="ai-messages-container">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`ai-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="ai-message-avatar">✨</div>
                                    )}
                                    <div className={`ai-message-bubble ${msg.role}`}>
                                        {msg.role === 'user' ? (
                                            <p className="ai-user-text">{msg.content}</p>
                                        ) : (
                                            <FormattedMessage content={msg.content} />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="ai-message-row assistant-row">
                                    <div className="ai-message-avatar">✨</div>
                                    <div className="ai-message-bubble assistant loading-bubble">
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggested Questions Pills */}
                        <div className="ai-suggestions-bar">
                            <span className="suggestions-label">Suggested:</span>
                            <div className="suggestions-scroll">
                                {getSuggestions().map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="ai-suggestion-chip"
                                        onClick={() => handleSendMessage(prompt)}
                                        disabled={isLoading}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="ai-input-wrapper">
                            <div className="ai-context-indicator">
                                <label className="context-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={attachContext}
                                        onChange={(e) => setAttachContext(e.target.checked)}
                                    />
                                    <span>Sync graph & algorithm context</span>
                                </label>
                            </div>

                            <div className="ai-input-row">
                                <textarea
                                    ref={inputRef}
                                    className="ai-query-textarea"
                                    rows={1}
                                    placeholder="Ask about graph algorithms, steps, complexity..."
                                    value={inputQuery}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    type="button"
                                    className="ai-send-btn"
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputQuery.trim() || isLoading}
                                    title="Send question (Enter)"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div className="ai-disclaimer-row">
                                <span className="ai-disclaimer-text">AI can make mistakes. Verify important info and algorithm steps.</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
