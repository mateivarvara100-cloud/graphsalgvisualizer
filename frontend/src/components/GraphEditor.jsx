import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, { ReactFlowProvider, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import AcademicNode from './AcademicNode';
import FloatingEdge from './FloatingEdge';
import AlgorbitLogo from './AlgorbitLogo';
import UserMenu from './UserMenu';
import { useGraphEditor } from '../hooks/useGraphEditor';
import config from '../data/config.json';

const nodeTypes = { academic: AcademicNode };
const edgeTypes = {
    straight: FloatingEdge,
    floating: FloatingEdge,
    default: FloatingEdge,
};

const ALGORITHM_TAG_NAMES = {
    BFS: 'Breadth-First Search',
    DFS: 'Depth-First Search',
    Dijkstra: 'Dijkstra',
    FloydWarshall: 'Floyd-Warshall',
    Kruskal: 'Kruskal',
    Prim: 'Prim',
    FordFulkerson: 'Ford-Fulkerson',
    EdmondsKarp: 'Edmonds-Karp',
    Kosaraju: 'Kosaraju',
    Tarjan: 'Tarjan',
};

function useIsMobile(breakpoint = 900) {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
    );
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [breakpoint]);
    return isMobile;
}

// Edge Weight / Capacity Modal
function EdgeWeightModal({ edge, isOpen, onClose, onSave, onDelete, isFlow, isDirected, algorithm, onToggleDirected }) {
    const [val, setVal] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const inputRef = useRef(null);

    const allowNegative = algorithm === 'FloydWarshall' || algorithm === 'Kruskal' || algorithm === 'Prim';

    useEffect(() => {
        if (isOpen && edge) {
            setVal(String(edge.weight != null ? edge.weight : 1));
            setErrorMsg('');
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen, edge]);

    if (!isOpen || !edge) return null;

    const term = isFlow ? 'Capacity' : 'Weight';

    const handleSave = (e) => {
        if (e) e.preventDefault();
        const trimmed = String(val).trim();
        if (!trimmed) {
            const msg = 'Please enter a value.';
            setErrorMsg(msg);
            if (inputRef.current) {
                inputRef.current.setCustomValidity(msg);
                inputRef.current.reportValidity();
            }
            return;
        }
        const num = Math.round(Number(trimmed));
        if (isNaN(num)) {
            const msg = 'Please enter a valid number.';
            setErrorMsg(msg);
            if (inputRef.current) {
                inputRef.current.setCustomValidity(msg);
                inputRef.current.reportValidity();
            }
            return;
        }
        if (!allowNegative && num < 1) {
            const msg = 'Value must be greater than or equal to 1.';
            setErrorMsg(msg);
            if (inputRef.current) {
                inputRef.current.setCustomValidity(msg);
                inputRef.current.reportValidity();
            }
            return;
        }
        if (allowNegative && num < -9999) {
            const msg = 'Value cannot be less than -9,999.';
            setErrorMsg(msg);
            if (inputRef.current) {
                inputRef.current.setCustomValidity(msg);
                inputRef.current.reportValidity();
            }
            return;
        }
        if (num > 9999) {
            const msg = 'Value cannot exceed 9,999.';
            setErrorMsg(msg);
            if (inputRef.current) {
                inputRef.current.setCustomValidity(msg);
                inputRef.current.reportValidity();
            }
            return;
        }
        onSave(edge.id, num);
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
        } else if (e.key === 'Enter') {
            e.stopPropagation();
            handleSave(e);
        }
    };

    const adjustVal = (delta) => {
        let next;
        if (allowNegative) {
            const cur = Math.round(Number(val) || 0);
            next = Math.max(-9999, Math.min(9999, cur + delta));
        } else {
            const cur = Math.max(1, Math.round(Number(val) || 1));
            next = Math.max(1, Math.min(9999, cur + delta));
        }
        setVal(String(next));
        setErrorMsg('');
        if (inputRef.current) {
            inputRef.current.setCustomValidity('');
        }
        inputRef.current?.focus();
    };

    const presets = isFlow
        ? [2, 5, 10, 15, 20, 25, 50, 100]
        : allowNegative
            ? [-10, -5, -2, -1, 1, 2, 5, 10]
            : [1, 2, 3, 5, 8, 10, 15, 20];

    const isNegativeVal = !isNaN(Number(val)) && Number(val) < 0;
    const showUndirectedNegWarning = algorithm === 'FloydWarshall' && !isDirected && isNegativeVal;

    return (
        <AnimatePresence>
            <div className="edge-modal-backdrop" onClick={onClose}>
                <motion.div
                    className="edge-modal-card"
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 12 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                >
                    {/* Header */}
                    <div className="edge-modal-header">
                        <div className="edge-modal-title-group">
                            <span className="edge-modal-icon">⚖️</span>
                            <div className="edge-modal-title">Set Edge {term}</div>
                        </div>
                        <button
                            type="button"
                            className="edge-modal-close-btn"
                            onClick={onClose}
                            title="Close [Esc]"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Edge visual indicator preview */}
                    <div className="edge-modal-preview">
                        <span className="edge-modal-node-chip">{edge.source}</span>
                        <span className="edge-modal-arrow">{isDirected ? '⟶' : '⟵⟶'}</span>
                        <span className="edge-modal-node-chip">{edge.target}</span>
                        <span className="edge-modal-current-badge">
                            Current: <strong>{edge.weight}</strong>
                        </span>
                    </div>

                    {/* Form input */}
                    <form onSubmit={handleSave} className="edge-modal-form" lang="en" noValidate>
                        <label className="edge-modal-label">
                            {allowNegative
                                ? 'Enter any integer (-9,999 to 9,999, negative weights supported):'
                                : 'Enter any number (e.g. 1, 10, 16, 25, 100):'}
                        </label>
                        <div className="edge-modal-input-row">
                            <button
                                type="button"
                                className="edge-modal-step-btn"
                                onClick={() => adjustVal(-1)}
                                title="Decrease by 1"
                            >
                                −
                            </button>
                            <input
                                ref={inputRef}
                                type="number"
                                min={allowNegative ? "-9999" : "1"}
                                max="9999"
                                step="1"
                                lang="en"
                                className="edge-modal-number-input"
                                value={val}
                                onChange={e => {
                                    const newVal = e.target.value;
                                    setVal(newVal);
                                    setErrorMsg('');
                                    if (!allowNegative && newVal !== '' && Number(newVal) < 1) {
                                        e.target.setCustomValidity('Value must be greater than or equal to 1.');
                                    } else if (allowNegative && newVal !== '' && Number(newVal) < -9999) {
                                        e.target.setCustomValidity('Value cannot be less than -9,999.');
                                    } else {
                                        e.target.setCustomValidity('');
                                    }
                                }}
                                onInvalid={e => {
                                    if (!allowNegative) {
                                        e.target.setCustomValidity('Value must be greater than or equal to 1.');
                                    } else {
                                        e.target.setCustomValidity('Value must be between -9,999 and 9,999.');
                                    }
                                }}
                                onInput={e => {
                                    const v = Number(e.target.value);
                                    if (e.target.value !== '' && (allowNegative ? v >= -9999 && v <= 9999 : v >= 1)) {
                                        e.target.setCustomValidity('');
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter value"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="edge-modal-step-btn"
                                onClick={() => adjustVal(1)}
                                title="Increase by 1"
                            >
                                +
                            </button>
                        </div>
                        {errorMsg && (
                            <div style={{ color: '#ef4444', fontSize: '11.5px', fontWeight: 600, marginTop: '5px' }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        {/* Undirected graph negative weight advisory */}
                        {showUndirectedNegWarning && (
                            <div className="edge-modal-neg-warning">
                                <div className="edge-modal-neg-warning-header">
                                    <span>⚠️</span>
                                    <span>Undirected Negative Weight Warning</span>
                                </div>
                                <div className="edge-modal-neg-warning-body">
                                    In an undirected graph, a negative edge forms an immediate 2-cycle ({edge.source} ↔ {edge.target}) of sum {Number(val) * 2} &lt; 0. For Floyd-Warshall to find valid shortest paths, a directed graph is recommended.
                                </div>
                                {onToggleDirected && (
                                    <button
                                        type="button"
                                        className="edge-modal-switch-dir-btn"
                                        onClick={() => onToggleDirected(true)}
                                    >
                                        Switch Graph to Directed Mode ➔
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Quick Presets */}
                        <div className="edge-modal-presets">
                            <span className="edge-modal-presets-label">Quick presets:</span>
                            <div className="edge-modal-preset-chips">
                                {presets.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`edge-modal-preset-chip ${Number(val) === p ? 'active' : ''}`}
                                        onClick={() => {
                                            setVal(String(p));
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="edge-modal-actions">
                            <button
                                type="button"
                                className="edge-modal-del-btn"
                                onClick={() => { onDelete(edge.id); onClose(); }}
                                title="Delete this edge"
                            >
                                🗑️ Delete Edge
                            </button>
                            <div className="edge-modal-action-right">
                                <button
                                    type="button"
                                    className="edge-modal-cancel-btn"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="edge-modal-save-btn"
                                >
                                    Apply {term}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function EditorCanvas({
    nodes,
    edges,
    editMode,
    edgeSource,
    startNode,
    isDirected,
    isWeighted,
    algorithm,
    hasStartOption = true,
    isMobile = false,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    deleteNode,
    deleteEdge,
    onEditEdgeWeight,
    setEdgeSource,
    setStartNode,
}) {
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useReactFlow();

    useEffect(() => {
        if (reactFlowInstance && nodes.length > 0) {
            setTimeout(() => {
                reactFlowInstance.fitView({ padding: 0.25 });
            }, 50);
        }
    }, [reactFlowInstance, nodes.length]);

    const handlePaneClick = (event) => {
        if (editMode === 'node') {
            let position;
            if (typeof reactFlowInstance.screenToFlowPosition === 'function') {
                position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
            } else {
                const bounds = reactFlowWrapper.current.getBoundingClientRect();
                position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
            }
            addNode({ x: position.x - 26, y: position.y - 26 });
        } else if (edgeSource) {
            setEdgeSource(null);
        }
    };

    const handleNodeClick = (event, node) => {
        event.stopPropagation();
        if (editMode === 'edge') {
            if (!edgeSource) {
                setEdgeSource(node.id);
            } else {
                addEdge(edgeSource, node.id);
                setEdgeSource(null);
            }
        } else if (editMode === 'delete') {
            deleteNode(node.id);
        } else if (editMode === 'start') {
            if (hasStartOption) setStartNode(node.id);
        }
    };

    const handleEdgeClick = (event, edge) => {
        event.stopPropagation();
        if (editMode === 'delete') {
            deleteEdge(edge.id);
        } else if (isWeighted) {
            onEditEdgeWeight(edge);
        }
    };

    const handleEdgeDoubleClick = (event, edge) => {
        event.stopPropagation();
        if (isWeighted) {
            onEditEdgeWeight(edge);
        }
    };

    const handleNodeContextMenu = (event, node) => {
        event.preventDefault();
        event.stopPropagation();
        deleteNode(node.id);
    };

    const handleEdgeContextMenu = (event, edge) => {
        event.preventDefault();
        event.stopPropagation();
        deleteEdge(edge.id);
    };

    const isFlow = algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp';
    const weightTerm = isFlow ? 'capacity' : 'weight';

    return (
        <div
            className={`editor-canvas-wrapper mode-${editMode} ${isWeighted ? 'is-weighted' : ''}`}
            ref={reactFlowWrapper}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onPaneClick={handlePaneClick}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onEdgeDoubleClick={handleEdgeDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeContextMenu={handleEdgeContextMenu}
                nodesDraggable={true}
                nodesConnectable={false}
                zoomOnScroll={true}
                panOnDrag={editMode !== 'node' || !edgeSource}
                panOnScroll={false}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                proOptions={{ hideAttribution: true }}
            />

            {nodes.length === 0 && (
                <div className="editor-empty-overlay">
                    <div className="empty-card">
                        <div className="empty-icon">📍</div>
                        <h3>The canvas is empty</h3>
                        <p>{isMobile ? 'Touch anywhere to place nodes, or generate a random graph to get started.' : 'Click anywhere to place nodes, or generate a random graph to get started.'}</p>
                        <div className="empty-shortcuts">
                            <span><kbd>N</kbd> Add Node</span>
                            <span><kbd>E</kbd> Add Edge</span>
                            {isWeighted && <span>{isMobile ? 'Touch' : 'Click'} edge to edit {isFlow ? 'Capacity' : 'Weight'}</span>}
                            <span><kbd>R</kbd> Random Graph</span>
                            <span><kbd>C</kbd> Clear Canvas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* In-canvas editor legend / shortcuts */}
            <div className="editor-legend">
                {hasStartOption && (
                    <div className="legend-item">
                        <span className="legend-badge-start">★</span>
                        <span>{isFlow ? 'Source Node' : 'Start Node'}: <strong>{startNode || 'None'}</strong></span>
                    </div>
                )}
                <div className="legend-item">
                    <span className="legend-pill">{isDirected ? 'Directed →' : 'Undirected ↔'}</span>
                </div>
                {isWeighted && (
                    <div className="legend-item weight-hint">
                        <span className="legend-pill weight-pill">⚖️ Weighted</span>
                        <span>{isMobile ? 'Touch' : 'Click'} edge to edit {weightTerm}</span>
                    </div>
                )}
                <div className="legend-item subtle">
                    <span>{isMobile ? 'Touch any node/edge to delete' : 'Right-click any node/edge to delete'}</span>
                </div>
            </div>
        </div>
    );
}

export default function GraphEditor({ algorithm = 'BFS', onBack, onVisualize }) {
    const isMobile = useIsMobile(900);
    const algInfo = config.algorithms[algorithm] || { title: algorithm, complexity: 'O(V + E)' };
    const isWeighted = algInfo.requiresWeighted ?? (algorithm === 'Kruskal' || algorithm === 'Prim' || algorithm === 'Dijkstra' || algorithm === 'FloydWarshall' || algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp');
    const forcedDirected = algInfo.requiresDirected;   // true | false | null
    const hasStartOption = algorithm !== 'Kruskal';
    const isFlow = algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp';
    const weightTerm = isFlow ? 'Capacity' : 'Weight';

    const [editingEdge, setEditingEdge] = useState(null);

    const {
        nodes, edges, isDirected, editMode, edgeSource, startNode,
        onNodesChange, onEdgesChange,
        setIsDirected, setEditMode, setEdgeSource, setStartNode,
        addNode, addEdge, setEdgeWeight, deleteNode, deleteEdge,
        generateRandom, getGraphData, clearAll,
        undo, redo, canUndo, canRedo,
    } = useGraphEditor(forcedDirected === true, isWeighted, hasStartOption, algorithm);

    // Apply forced directed constraint
    useEffect(() => {
        if (forcedDirected === true && !isDirected) setIsDirected(true);
        if (forcedDirected === false && isDirected) setIsDirected(false);
    }, [forcedDirected, isDirected, setIsDirected]);

    // Reset start mode if current algorithm doesn't have a start option
    useEffect(() => {
        if (!hasStartOption && editMode === 'start') {
            setEditMode('node');
        }
    }, [hasStartOption, editMode, setEditMode]);

    const handleVisualize = () => {
        if (nodes.length === 0) return;
        onVisualize(getGraphData());
    };

    // Keyboard shortcuts (Disabled on mobile/tablets)
    const handleKeyDown = useCallback((e) => {
        if (isMobile) return;
        if (editingEdge) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
            return;
        }
        switch (e.key.toLowerCase()) {
            case 'n': setEditMode('node'); break;
            case 'e': setEditMode('edge'); break;
            case 's': if (hasStartOption) setEditMode('start'); break;
            case 'd': setEditMode('delete'); break;
            case 'r': generateRandom(); break;
            case 'c': clearAll(); break;
            case 'escape': setEdgeSource(null); break;
            default: break;
        }
    }, [isMobile, editingEdge, hasStartOption, setEditMode, generateRandom, clearAll, setEdgeSource, undo, redo]);

    useEffect(() => {
        if (isMobile) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobile, handleKeyDown]);

    // Instruction banner
    const actionVerb = isMobile ? 'Touch' : 'Click';
    const actionVerbLower = isMobile ? 'touch' : 'click';

    const getInstructionText = () => {
        switch (editMode) {
            case 'node':
                if (isFlow) return `Layered Flow Network: Source (s) on left ➔ Sink (t) on right. ${actionVerb} canvas to add nodes, drag to reposition.`;
                return `${actionVerb} anywhere on the canvas to place a node. Drag nodes to reposition.`;
            case 'edge':
                if (!edgeSource) return isWeighted
                    ? `${actionVerb} a node to connect, or ${actionVerbLower} any edge to edit its ${weightTerm.toLowerCase()}.`
                    : `${actionVerb} a node to set it as the edge source.`;
                return `Connecting from "${edgeSource}"… ${actionVerb} target node (or ${actionVerbLower} "${edgeSource}" for a self-loop), or ${actionVerbLower} canvas to cancel.`;
            case 'start':
                if (isFlow) return `${actionVerb} any node to designate it as the source vertex s for the flow network.`;
                return `${actionVerb} any node to designate it as the algorithm start node.`;
            case 'delete':
                return (
                    <>
                        {actionVerb} any node or edge to delete it. <span className="desktop-hint">(You can also right-click anytime).</span>
                    </>
                );
            default: return '';
        }
    };

    const modeShortcutMap = { node: 'N', edge: 'E', start: 'S', delete: 'D' };

    return (
        <div className="graph-editor-view">
            {/* Top Toolbar */}
            <header className="editor-top-bar">
                {/* Left: Navigation, Title & Graph Type Specification */}
                <div className="editor-left-section">
                    <button type="button" className="back-ghost-btn" onClick={onBack} title="Back to Algorithms">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Algorithms</span>
                    </button>

                    <div className="toolbar-divider" />

                    <div className="editor-title-container">
                        <AlgorbitLogo size={22} />
                        <h2>Graph Editor</h2>
                    </div>

                    <div className="toolbar-divider" />

                    {/* Graph Type: Fixed Badge for forced types (MST, Flow, SCC) or Toggle for flexible */}
                    {forcedDirected !== null ? (
                        <div
                            className={`graph-type-badge ${forcedDirected ? 'directed' : 'undirected'}`}
                            title={forcedDirected ? 'This algorithm requires a directed graph' : 'MST algorithms require an undirected graph'}
                        >
                            <span className="badge-icon">{forcedDirected ? '➔' : '⬡'}</span>
                            <span className="badge-text">{forcedDirected ? 'Directed' : 'Undirected'}</span>
                            <span className="badge-subtitle">
                                {algorithm === 'Kruskal' || algorithm === 'Prim'
                                    ? 'MST'
                                    : isFlow
                                        ? 'Flow'
                                        : 'SCC'}
                            </span>
                        </div>
                    ) : (
                        <div className="graph-type-toggle">
                            <button
                                type="button"
                                className={`toggle-option ${!isDirected ? 'active' : ''}`}
                                onClick={() => setIsDirected(false)}
                                title="Undirected graph"
                            >
                                Undirected
                            </button>
                            <button
                                type="button"
                                className={`toggle-option ${isDirected ? 'active' : ''}`}
                                onClick={() => setIsDirected(true)}
                                title="Directed graph"
                            >
                                Directed
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Interactive Canvas Tools */}
                <div className="editor-center-section">
                    {/* Mode Buttons */}
                    <div className="mode-btn-group">
                        {[
                            { mode: 'node', icon: '➕', label: 'Node', title: isMobile ? 'Add Node – touch canvas' : 'Add Node – click canvas' },
                            { mode: 'edge', icon: '🔗', label: 'Edge', title: isMobile ? 'Add Edge – touch source then target' : 'Add Edge – click source then target' },
                            ...(hasStartOption ? [{
                                mode: 'start',
                                icon: '⭐',
                                label: isFlow ? 'Source' : 'Start',
                                title: isFlow ? 'Set flow source node (s)' : 'Set start node'
                            }] : []),
                            { mode: 'delete', icon: '🗑️', label: 'Delete', title: isMobile ? 'Delete – touch node or edge' : 'Delete – click node or edge', danger: true },
                        ].map(({ mode, icon, label, title, danger }) => (
                            <button
                                key={mode}
                                type="button"
                                className={`mode-btn ${danger ? 'danger-mode' : ''} ${editMode === mode ? 'active' : ''}`}
                                onClick={() => setEditMode(mode)}
                                title={isMobile ? title : `${title} [${modeShortcutMap[mode]}]`}
                            >
                                <span className="btn-icon">{icon}</span>
                                <span>{label}</span>
                                <kbd className="kbd-hint">{modeShortcutMap[mode]}</kbd>
                            </button>
                        ))}
                    </div>

                    <div className="toolbar-divider" />

                    {/* Utility Actions */}
                    <div className="editor-action-group">
                        <button type="button" className="util-btn icon-only" onClick={undo} disabled={!canUndo} title={isMobile ? "Undo" : "Undo [Ctrl+Z]"}>
                            <span className="btn-icon">↩</span>
                        </button>
                        <button type="button" className="util-btn icon-only" onClick={redo} disabled={!canRedo} title={isMobile ? "Redo" : "Redo [Ctrl+Shift+Z]"}>
                            <span className="btn-icon">↪</span>
                        </button>
                        <div className="toolbar-divider mini" />
                        <button type="button" className="util-btn" onClick={() => generateRandom()} title={isMobile ? "Random graph" : "Random graph [R]"}>
                            <span className="btn-icon">🎲</span>
                            <span>Random</span>
                            <kbd className="kbd-hint">R</kbd>
                        </button>
                        <button type="button" className="util-btn" onClick={clearAll} title={isMobile ? "Clear canvas" : "Clear canvas [C]"}>
                            <span className="btn-icon">🧹</span>
                            <span>Clear</span>
                            <kbd className="kbd-hint">C</kbd>
                        </button>
                    </div>
                </div>

                {/* Right: Stats + Algorithm Badge + Visualize CTA */}
                <div className="editor-right-section">
                    <div className="graph-stats">
                        <span className="stats-chip">{nodes.length} <span className="stats-label">nodes</span></span>
                        <span className="stats-sep">·</span>
                        <span className="stats-chip">{edges.length} <span className="stats-label">edges</span></span>
                    </div>
                    <span className="alg-tag" title={algInfo.title}>
                        {ALGORITHM_TAG_NAMES[algorithm] || algInfo.title}
                    </span>
                    <button
                        type="button"
                        className="visualize-cta-btn"
                        onClick={handleVisualize}
                        disabled={nodes.length === 0}
                    >
                        <span>Visualize</span>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <UserMenu />
                </div>
            </header>

            {/* Mobile Context & Metadata Strip (Visible only on <= 900px) */}
            <div className="editor-mobile-meta-bar">
                <div className="mobile-meta-row">
                    <span className="alg-tag" title={algInfo.title}>
                        {ALGORITHM_TAG_NAMES[algorithm] || algInfo.title}
                    </span>
                    <div className="graph-stats">
                        <span className="stats-chip">{nodes.length} <span className="stats-label">nodes</span></span>
                        <span className="stats-sep">·</span>
                        <span className="stats-chip">{edges.length} <span className="stats-label">edges</span></span>
                    </div>
                </div>

                <div className="mobile-meta-row mobile-meta-secondary">
                    {forcedDirected !== null ? (
                        <div
                            className={`graph-type-badge ${forcedDirected ? 'directed' : 'undirected'}`}
                            title={forcedDirected ? 'This algorithm requires a directed graph' : 'MST algorithms require an undirected graph'}
                        >
                            <span className="badge-icon">{forcedDirected ? '➔' : '⬡'}</span>
                            <span className="badge-text">{forcedDirected ? 'Directed' : 'Undirected'}</span>
                            <span className="badge-subtitle">
                                {algorithm === 'Kruskal' || algorithm === 'Prim'
                                    ? 'MST'
                                    : isFlow
                                        ? 'Flow'
                                        : 'SCC'}
                            </span>
                        </div>
                    ) : (
                        <div className="graph-type-toggle">
                            <button
                                type="button"
                                className={`toggle-option ${!isDirected ? 'active' : ''}`}
                                onClick={() => setIsDirected(false)}
                                title="Undirected graph"
                            >
                                Undirected
                            </button>
                            <button
                                type="button"
                                className={`toggle-option ${isDirected ? 'active' : ''}`}
                                onClick={() => setIsDirected(true)}
                                title="Directed graph"
                            >
                                Directed
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mode Instruction Banner */}
            <div className={`editor-instruction-bar mode-${editMode} ${edgeSource ? 'connecting' : ''}`}>
                <span className="instruction-icon">
                    {editMode === 'node' && '📍'}
                    {editMode === 'edge' && (edgeSource ? '🎯' : '🔗')}
                    {editMode === 'weight' && '⚖️'}
                    {editMode === 'start' && '⭐'}
                    {editMode === 'delete' && '⚠️'}
                </span>
                <span className="instruction-text">{getInstructionText()}</span>
                {edgeSource && (
                    <button type="button" className="cancel-edge-btn" onClick={() => setEdgeSource(null)}>
                        Cancel {!isMobile && <kbd>Esc</kbd>}
                    </button>
                )}
            </div>

            {/* Canvas */}
            <main className="editor-canvas-container">
                <ReactFlowProvider>
                    <EditorCanvas
                        nodes={nodes} edges={edges} editMode={editMode}
                        edgeSource={edgeSource} startNode={startNode}
                        isDirected={isDirected} isWeighted={isWeighted}
                        algorithm={algorithm}
                        hasStartOption={hasStartOption}
                        isMobile={isMobile}
                        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        addNode={addNode} addEdge={addEdge} deleteNode={deleteNode}
                        deleteEdge={deleteEdge} onEditEdgeWeight={setEditingEdge}
                        setEdgeSource={setEdgeSource} setStartNode={setStartNode}
                    />
                </ReactFlowProvider>
            </main>

            {/* Edge Weight / Capacity Modal */}
            <EdgeWeightModal
                edge={editingEdge}
                isOpen={Boolean(editingEdge)}
                onClose={() => setEditingEdge(null)}
                onSave={(edgeId, newWeight) => setEdgeWeight(edgeId, newWeight)}
                onDelete={(edgeId) => deleteEdge(edgeId)}
                isFlow={isFlow}
                isDirected={isDirected}
                algorithm={algorithm}
                onToggleDirected={(dir) => setIsDirected(dir)}
            />
        </div>
    );
}
