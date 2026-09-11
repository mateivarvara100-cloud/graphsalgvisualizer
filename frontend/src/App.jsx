import React, { useState } from 'react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/main.scss';

import AcademicNode from './components/AcademicNode';
import FloatingEdge from './components/FloatingEdge';
import Sidebar from './components/Sidebar';
import GraphEditor from './components/GraphEditor';
import PseudocodePanel from './components/PseudocodePanel';
import DataStructurePanel from './components/DataStructurePanel';
import Legend from './components/Legend';
import MinCutOverlay from './components/MinCutOverlay';
import AlgorbitLogo from './components/AlgorbitLogo';
import UserMenu from './components/UserMenu';
import AuthModal from './components/AuthModal';
import QuizModal from './components/QuizModal';
import QuizHistoryModal from './components/QuizHistoryModal';
import AIAssistant from './components/AIAssistant';
import { AuthProvider } from './context/AuthContext';
import { QuizResultsProvider } from './context/QuizResultsContext';
import { useAlgorithm } from './hooks/useAlgorithm';
import { convertQuizGraphToPayload } from './utils/quizToVisualizer';
import config from './data/config.json';

const nodeTypes = { academic: AcademicNode };
const edgeTypes = {
    straight: FloatingEdge,
    floating: FloatingEdge,
    default: FloatingEdge,
};

const PAGE_VARIANTS = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

function AppContent() {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialAlg = searchParams?.get('alg') || 'BFS';
    const initialView = searchParams?.get('view') || 'landing';

    const [currentView, setCurrentView] = useState(initialView);
    const [activeAlg,   setActiveAlg]   = useState(initialAlg);
    const [activeQuiz,       setActiveQuiz]       = useState(null);
    const [isQuizMinimized,  setIsQuizMinimized]  = useState(false);
    const [quizReturnInfo,   setQuizReturnInfo]   = useState(null);

    const {
        nodes, edges, isRunning, isPaused, isFinished, speed, activeLine,
        dsState, totalWeight, currentStepIndex, totalSteps,
        distMatrix, negativeCycleInfo, activeK, activeI, activeJ,
        sccList, phase,
        maxFlow, flowInfo, isDirected,
        onNodesChange, onEdgesChange,
        initializeGraph, runAlgorithm, resetGraph,
        togglePause, stepForward, stepBackward, changeSpeed,
    } = useAlgorithm();

    const [showQuizExitConfirm, setShowQuizExitConfirm] = useState(false);

    const handleSelectAlgorithm = (alg) => { 
        handleCloseQuiz();
        setActiveAlg(alg); 
        setCurrentView('editor'); 
    };

    const handleBackToLanding = () => { 
        handleCloseQuiz();
        resetGraph(); 
        setCurrentView('landing'); 
    };

    const handleBackToEditor = () => {
        if (isQuizMinimized && quizReturnInfo) {
            setShowQuizExitConfirm(true);
            return;
        }
        resetGraph();
        setCurrentView('editor');
    };

    const handleConfirmReturnToQuiz = () => {
        setShowQuizExitConfirm(false);
        handleResumeQuiz();
    };

    const handleConfirmDiscardQuizAndEdit = () => {
        setShowQuizExitConfirm(false);
        handleCloseQuiz();
        resetGraph();
        setCurrentView('editor');
    };

    const handleVisualize = (graphPayload) => { initializeGraph(graphPayload, activeAlg); setCurrentView('visualizer'); };
    const handleVisualizeQuizGraph = (algorithmName, quizGraph, returnMeta = null) => {
        const payload = convertQuizGraphToPayload(quizGraph, algorithmName);
        if (!payload) return;
        setActiveAlg(algorithmName);
        initializeGraph(payload, algorithmName);
        setCurrentView('visualizer');
        if (returnMeta) {
            setQuizReturnInfo(returnMeta);
            setIsQuizMinimized(true);
        } else {
            setActiveQuiz(null);
            setIsQuizMinimized(false);
            setQuizReturnInfo(null);
        }
    };

    const handleCloseQuiz = () => {
        setActiveQuiz(null);
        setIsQuizMinimized(false);
        setQuizReturnInfo(null);
    };

    const handleResumeQuiz = () => {
        setIsQuizMinimized(false);
    };

    const algConf = config.algorithms[activeAlg] || {};

    // Derive data structure type for panel
    const dsType = (() => {
        const t = algConf.dataStructure;
        if (t) return t;
        if (activeAlg === 'DFS' || activeAlg === 'Kosaraju' || activeAlg === 'Tarjan') return 'stack';
        if (activeAlg === 'Kruskal') return 'disjoint_sets';
        if (activeAlg === 'Prim' || activeAlg === 'Dijkstra') return 'priority_queue';
        if (activeAlg === 'FloydWarshall') return 'matrix';
        return 'queue';
    })();

    const isMst = activeAlg === 'Kruskal' || activeAlg === 'Prim';
    const isFlow = activeAlg === 'FordFulkerson' || activeAlg === 'EdmondsKarp';
    const progress = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;

    return (
        <>
            <AnimatePresence mode="wait">
                {/* ── Landing View ── */}
                {currentView === 'landing' && (
                    <motion.div key="landing" {...PAGE_VARIANTS} style={{ position: 'absolute', inset: 0 }}>
                        <Sidebar 
                            onSelectAlgorithm={handleSelectAlgorithm} 
                            onStartQuiz={(alg) => {
                                setActiveQuiz(alg);
                                setIsQuizMinimized(false);
                            }}
                        />
                    </motion.div>
                )}

            {/* ── Graph Editor View ── */}
            {currentView === 'editor' && (
                <motion.div key="editor" {...PAGE_VARIANTS} style={{ position: 'absolute', inset: 0 }}>
                    <GraphEditor
                        key={activeAlg}
                        algorithm={activeAlg}
                        onBack={handleBackToLanding}
                        onVisualize={handleVisualize}
                    />
                </motion.div>
            )}

            {/* ── Visualizer View ── */}
            {currentView === 'visualizer' && (
                <motion.div key="visualizer" {...PAGE_VARIANTS} style={{ position: 'absolute', inset: 0 }}>
                    <div className="visualizer-view">
                        {/* Top bar */}
                        <div className="top-bar">
                            <div className="left-controls">
                                <button className="back-ghost-btn" onClick={handleBackToEditor} title="Back to Graph Editor">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Edit Graph
                                </button>
                                {isQuizMinimized && quizReturnInfo && (
                                    <button 
                                        className="topbar-return-quiz-btn"
                                        onClick={handleResumeQuiz}
                                        title="Return to your active quiz session"
                                    >
                                        <span className="quiz-return-icon">📋</span>
                                        <span>Return to Quiz</span>
                                        <span className="quiz-return-badge">
                                            {quizReturnInfo.isReview ? 'Review' : `Q ${quizReturnInfo.currentQNum}/${quizReturnInfo.totalQuestions}`}
                                        </span>
                                    </button>
                                )}
                                <h2>{algConf.title || activeAlg}</h2>
                                <span className="complexity-badge">{algConf.complexity}</span>
                                {isMst && (
                                    <div className="mst-weight-badge" title="Total weight of edges in MST">
                                        <span className="weight-label">MST Weight:</span>
                                        <span className="weight-value">{totalWeight}</span>
                                    </div>
                                )}
                                {isFlow && (
                                    <div className="mst-weight-badge flow-badge" title="Total maximum flow">
                                        <span className="weight-label">Max Flow:</span>
                                        <span className="weight-value">{maxFlow ?? 0}</span>
                                    </div>
                                )}
                                {activeAlg === 'Kosaraju' && (
                                    <div className={`mst-weight-badge scc-phase-top-badge phase-${phase}`} title="Kosaraju algorithm phase">
                                        <span className="weight-label">{phase === 2 ? 'Pass 2:' : 'Pass 1:'}</span>
                                        <span className="weight-value">{phase === 2 ? 'DFS on Gᵀ' : 'DFS on G'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="center-controls">
                                {/* Speed selector — always enabled */}
                                <div className="speed-control">
                                    {['slow', 'normal', 'fast'].map(s => (
                                        <button
                                            key={s}
                                            className={`speed-btn ${speed === s ? 'active' : ''}`}
                                            onClick={() => changeSpeed(s)}
                                        >
                                            {s === 'slow' ? '0.5×' : s === 'normal' ? '1×' : '2×'}
                                        </button>
                                    ))}
                                </div>

                                {/* Playback controls */}
                                <div className="playback-controls">
                                    {!isRunning && !isFinished && (
                                        <button className="play-btn" onClick={() => runAlgorithm(activeAlg)}>
                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                                <path d="M4 3L15 9L4 15V3Z" fill="currentColor"/>
                                            </svg>
                                            Play
                                        </button>
                                    )}

                                    {isFinished && (
                                        <button className="play-btn replay-btn" onClick={() => { resetGraph(); runAlgorithm(activeAlg); }}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 8a6 6 0 1 1 1.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                                                <path d="M2 12V8h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                            </svg>
                                            Replay
                                        </button>
                                    )}

                                    {isRunning && (
                                        <>
                                            {/* Step back */}
                                            <button
                                                className="control-btn"
                                                onClick={stepBackward}
                                                disabled={!isPaused || currentStepIndex <= 0}
                                                title="Step backward"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <rect x="3" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                                                    <path d="M13 3L6 8L13 13V3Z" fill="currentColor"/>
                                                </svg>
                                            </button>

                                            {/* Pause / Resume */}
                                            <button className="control-btn" onClick={togglePause}>
                                                {isPaused ? (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M4 3L13 8L4 13V3Z" fill="currentColor"/>
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/>
                                                        <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/>
                                                    </svg>
                                                )}
                                            </button>

                                            {/* Step forward */}
                                            <button
                                                className="control-btn"
                                                onClick={stepForward}
                                                disabled={!isPaused}
                                                title="Step forward"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M3 3L10 8L3 13V3Z" fill="currentColor"/>
                                                    <rect x="11" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Step counter */}
                                {(isRunning || isFinished) && (
                                    <span className="step-counter">
                                        {isFinished ? 'Done' : `Step ${currentStepIndex + 1}`} / {totalSteps}
                                    </span>
                                )}
                            </div>

                            <div className="right-controls">
                                <button className="reset-btn" onClick={resetGraph}>Reset</button>
                                <UserMenu />
                                <div className="brand-pill" title="Algorbit — Graph Algorithm Visualizer">
                                    <AlgorbitLogo size={22} />
                                    <span className="brand-pill-name">ALGORBIT</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="progress-bar-track">
                            <motion.div
                                className="progress-bar-fill"
                                initial={{ width: '0%' }}
                                animate={{ width: `${progress}%` }}
                                transition={{ ease: 'easeOut', duration: 0.3 }}
                            />
                        </div>

                        {/* Main content */}
                        <div className="main-content">
                            <PseudocodePanel algorithm={activeAlg} activeLine={activeLine} />

                            <div className="canvas-area">
                                <div className="canvas-container">
                                    <ReactFlowProvider>
                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            nodeTypes={nodeTypes}
                                            edgeTypes={edgeTypes}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            nodesDraggable={false}
                                            nodesConnectable={false}
                                            elementsSelectable={false}
                                            zoomOnScroll={true}
                                            panOnDrag={true}
                                            zoomOnDoubleClick={false}
                                            selectionOnDrag={false}
                                            panOnScroll={false}
                                            style={{ cursor: 'default' }}
                                            fitView
                                            fitViewOptions={{ padding: 0.3 }}
                                            proOptions={{ hideAttribution: true }}
                                        >
                                            <MinCutOverlay
                                                algorithm={activeAlg}
                                                nodes={nodes}
                                                edges={edges}
                                                flowInfo={flowInfo}
                                                maxFlow={maxFlow}
                                            />
                                        </ReactFlow>
                                        <Legend algorithm={activeAlg} isDirected={isDirected} />
                                    </ReactFlowProvider>
                                </div>

                                <DataStructurePanel
                                    type={dsType}
                                    items={dsState}
                                    distMatrix={distMatrix}
                                    negativeCycleInfo={negativeCycleInfo}
                                    algorithm={activeAlg}
                                    flowInfo={flowInfo}
                                    maxFlow={maxFlow}
                                    sccList={sccList}
                                    phase={phase}
                                    activeK={activeK}
                                    activeI={activeI}
                                    activeJ={activeJ}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

            {/* ── Interactive Quiz & Exam Modal ── */}
            {activeQuiz && (
                <QuizModal
                    algorithm={activeQuiz}
                    isMinimized={isQuizMinimized}
                    onClose={handleCloseQuiz}
                    onVisualizeGraph={handleVisualizeQuizGraph}
                />
            )}

            {/* ── Active Quiz Navigation Confirmation Pop-up ── */}
            <AnimatePresence>
                {showQuizExitConfirm && (
                    <div className="quiz-confirm-overlay" onClick={() => setShowQuizExitConfirm(false)}>
                        <motion.div 
                            className="quiz-confirm-modal"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.92, y: 14 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 14 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="quiz-confirm-icon-wrap">
                                <span className="quiz-confirm-icon">📋</span>
                            </div>
                            <h3 className="quiz-confirm-title">Return to Quiz?</h3>
                            <p className="quiz-confirm-desc">
                                You have an active quiz session in progress. Do you want to return to your quiz, or exit to the Graph Editor and discard this session?
                            </p>
                            <div className="quiz-confirm-actions">
                                <button
                                    type="button"
                                    className="quiz-confirm-btn btn-yes"
                                    onClick={handleConfirmReturnToQuiz}
                                >
                                    <span>Yes, Return to Quiz</span>
                                    <span className="btn-arrow">→</span>
                                </button>
                                <button
                                    type="button"
                                    className="quiz-confirm-btn btn-no"
                                    onClick={handleConfirmDiscardQuizAndEdit}
                                >
                                    <span>No, Exit to Editor</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                className="quiz-confirm-close-btn"
                                onClick={() => setShowQuizExitConfirm(false)}
                                title="Stay in Visualizer"
                            >
                                ✕
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* ── Algorbit AI Assistant Floating Hub ── */}
            <AIAssistant
                activeAlg={activeAlg}
                currentView={currentView}
                nodes={nodes}
                edges={edges}
                currentStepIndex={currentStepIndex}
                totalSteps={totalSteps}
                activeLine={activeLine}
                isQuizActive={Boolean(activeQuiz && !isQuizMinimized)}
            />
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <QuizResultsProvider>
                <AppContent />
                <AuthModal />
                <QuizHistoryModal />
            </QuizResultsProvider>
        </AuthProvider>
    );
}