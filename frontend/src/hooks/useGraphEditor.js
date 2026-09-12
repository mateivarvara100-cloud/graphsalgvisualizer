import { useState, useCallback, useRef, useEffect } from 'react';
import { applyNodeChanges, applyEdgeChanges, MarkerType } from 'reactflow';

const baseMarker = { type: MarkerType.ArrowClosed, color: '#cbd5e1', width: 15, height: 15 };
const baseEdgeStyle = { stroke: '#cbd5e1', strokeWidth: 2, transition: 'stroke 0.3s ease, stroke-width 0.3s ease' };

const MAX_HISTORY = 50;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getNextNodeLabel(existingNodes) {
    const existingIds = new Set(existingNodes.map(n => n.id));
    for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i);
        if (!existingIds.has(char)) return char;
    }
    let counter = 1;
    while (true) {
        for (let i = 0; i < 26; i++) {
            const char = `${String.fromCharCode(65 + i)}${counter}`;
            if (!existingIds.has(char)) return char;
        }
        counter++;
    }
}

function getSinkId(nds, sourceId) {
    const remaining = (nds || []).filter(n => n.id !== sourceId);
    if (remaining.length === 0) return null;
    return remaining.reduce((furthest, n) => {
        return (!furthest || (n.position?.x ?? 0) > (furthest.position?.x ?? 0)) ? n : furthest;
    }, null)?.id || remaining[remaining.length - 1]?.id;
}

// ── Flow Network Formatter ───────────────────────────────────────────────────
function formatFlowEdges(edgeDefs) {
    return edgeDefs.map(e => ({
        id: `e${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: 'straight',
        style: baseEdgeStyle,
        markerEnd: baseMarker,
        animated: false,
        weight: e.weight,
        label: String(e.weight),
        labelStyle: { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 },
        labelBgPadding: [6, 4],
    }));
}

function getFlowTemplate(index, isFirst = false) {
    switch (index % 5) {
        // Template 0: Canonical 6-Node Flow Network (Balanced source-sink network)
        case 0: {
            const crossDir = Math.random() > 0.5;
            return {
                nodes: [
                    { id: 'A', type: 'academic', position: { x: 100, y: 230 }, data: { label: 'A', status: 'white', isActive: false, isSource: true,  isSink: false, isStart: true,  isEdgeSource: false } },
                    { id: 'B', type: 'academic', position: { x: 340, y: 90 },  data: { label: 'B', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'C', type: 'academic', position: { x: 360, y: 370 }, data: { label: 'C', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'D', type: 'academic', position: { x: 620, y: 90 },  data: { label: 'D', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'E', type: 'academic', position: { x: 640, y: 370 }, data: { label: 'E', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'F', type: 'academic', position: { x: 880, y: 230 }, data: { label: 'F', status: 'white', isActive: false, isSource: false, isSink: true,  isStart: false, isEdgeSource: false } },
                ],
                edges: isFirst ? [
                    { source: 'A', target: 'B', weight: 16 },
                    { source: 'A', target: 'C', weight: 13 },
                    { source: 'B', target: 'D', weight: 12 },
                    { source: 'B', target: 'C', weight: 4 },
                    { source: 'D', target: 'C', weight: 9 },
                    { source: 'C', target: 'E', weight: 14 },
                    { source: 'E', target: 'D', weight: 7 },
                    { source: 'D', target: 'F', weight: 20 },
                    { source: 'E', target: 'F', weight: 4 },
                ] : [
                    { source: 'A', target: 'B', weight: getRandomInt(12, 20) },
                    { source: 'A', target: 'C', weight: getRandomInt(10, 16) },
                    { source: 'B', target: 'D', weight: getRandomInt(10, 16) },
                    crossDir ? { source: 'B', target: 'C', weight: getRandomInt(3, 8) } : { source: 'C', target: 'B', weight: getRandomInt(3, 8) },
                    { source: 'D', target: 'C', weight: getRandomInt(4, 10) },
                    { source: 'C', target: 'E', weight: getRandomInt(11, 16) },
                    { source: 'E', target: 'D', weight: getRandomInt(4, 9) },
                    { source: 'D', target: 'F', weight: getRandomInt(16, 24) },
                    { source: 'E', target: 'F', weight: getRandomInt(4, 10) },
                ],
                startNode: 'A',
                sinkNode: 'F',
            };
        }

        // Template 1: Dual-Crossover Bipartite Network
        case 1: {
            return {
                nodes: [
                    { id: 'A', type: 'academic', position: { x: 100, y: 230 }, data: { label: 'A', status: 'white', isActive: false, isSource: true,  isSink: false, isStart: true,  isEdgeSource: false } },
                    { id: 'B', type: 'academic', position: { x: 340, y: 100 }, data: { label: 'B', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'C', type: 'academic', position: { x: 360, y: 360 }, data: { label: 'C', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'D', type: 'academic', position: { x: 620, y: 100 }, data: { label: 'D', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'E', type: 'academic', position: { x: 640, y: 360 }, data: { label: 'E', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'F', type: 'academic', position: { x: 880, y: 230 }, data: { label: 'F', status: 'white', isActive: false, isSource: false, isSink: true,  isStart: false, isEdgeSource: false } },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: getRandomInt(12, 18) },
                    { source: 'A', target: 'C', weight: getRandomInt(12, 18) },
                    { source: 'B', target: 'D', weight: getRandomInt(8, 15) },
                    { source: 'B', target: 'E', weight: getRandomInt(6, 12) },
                    { source: 'C', target: 'D', weight: getRandomInt(6, 12) },
                    { source: 'C', target: 'E', weight: getRandomInt(8, 15) },
                    { source: 'B', target: 'C', weight: getRandomInt(3, 7) },
                    { source: 'D', target: 'F', weight: getRandomInt(12, 20) },
                    { source: 'E', target: 'F', weight: getRandomInt(12, 20) },
                ],
                startNode: 'A',
                sinkNode: 'F',
            };
        }

        // Template 2: Highway & Bottleneck Network
        case 2: {
            return {
                nodes: [
                    { id: 'A', type: 'academic', position: { x: 100, y: 230 }, data: { label: 'A', status: 'white', isActive: false, isSource: true,  isSink: false, isStart: true,  isEdgeSource: false } },
                    { id: 'B', type: 'academic', position: { x: 340, y: 90 },  data: { label: 'B', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'C', type: 'academic', position: { x: 350, y: 370 }, data: { label: 'C', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'D', type: 'academic', position: { x: 620, y: 90 },  data: { label: 'D', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'E', type: 'academic', position: { x: 630, y: 370 }, data: { label: 'E', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'F', type: 'academic', position: { x: 880, y: 230 }, data: { label: 'F', status: 'white', isActive: false, isSource: false, isSink: true,  isStart: false, isEdgeSource: false } },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: getRandomInt(16, 24) },
                    { source: 'A', target: 'C', weight: getRandomInt(8, 14) },
                    { source: 'B', target: 'D', weight: getRandomInt(14, 20) },
                    { source: 'B', target: 'E', weight: getRandomInt(5, 10) },
                    { source: 'C', target: 'E', weight: getRandomInt(12, 18) },
                    { source: 'D', target: 'E', weight: getRandomInt(4, 8) },
                    { source: 'D', target: 'F', weight: getRandomInt(14, 22) },
                    { source: 'E', target: 'F', weight: getRandomInt(10, 16) },
                ],
                startNode: 'A',
                sinkNode: 'F',
            };
        }

        // Template 3: 7-Node 3-Column Flow Network
        case 3: {
            return {
                nodes: [
                    { id: 'A', type: 'academic', position: { x: 90,  y: 230 }, data: { label: 'A', status: 'white', isActive: false, isSource: true,  isSink: false, isStart: true,  isEdgeSource: false } },
                    { id: 'B', type: 'academic', position: { x: 290, y: 110 }, data: { label: 'B', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'C', type: 'academic', position: { x: 290, y: 350 }, data: { label: 'C', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'D', type: 'academic', position: { x: 500, y: 80 },  data: { label: 'D', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'E', type: 'academic', position: { x: 500, y: 230 }, data: { label: 'E', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'F', type: 'academic', position: { x: 500, y: 380 }, data: { label: 'F', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'G', type: 'academic', position: { x: 860, y: 230 }, data: { label: 'G', status: 'white', isActive: false, isSource: false, isSink: true,  isStart: false, isEdgeSource: false } },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: getRandomInt(12, 18) },
                    { source: 'A', target: 'C', weight: getRandomInt(12, 18) },
                    { source: 'B', target: 'D', weight: getRandomInt(8, 14) },
                    { source: 'B', target: 'E', weight: getRandomInt(6, 11) },
                    { source: 'C', target: 'E', weight: getRandomInt(6, 11) },
                    { source: 'C', target: 'F', weight: getRandomInt(8, 14) },
                    { source: 'D', target: 'E', weight: getRandomInt(4, 8) },
                    { source: 'D', target: 'G', weight: getRandomInt(10, 16) },
                    { source: 'E', target: 'G', weight: getRandomInt(8, 14) },
                    { source: 'F', target: 'G', weight: getRandomInt(10, 16) },
                ],
                startNode: 'A',
                sinkNode: 'G',
            };
        }

        // Template 4: Diagonal Bypass Network
        default: {
            return {
                nodes: [
                    { id: 'A', type: 'academic', position: { x: 100, y: 230 }, data: { label: 'A', status: 'white', isActive: false, isSource: true,  isSink: false, isStart: true,  isEdgeSource: false } },
                    { id: 'B', type: 'academic', position: { x: 340, y: 90 },  data: { label: 'B', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'C', type: 'academic', position: { x: 340, y: 370 }, data: { label: 'C', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'D', type: 'academic', position: { x: 620, y: 90 },  data: { label: 'D', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'E', type: 'academic', position: { x: 620, y: 370 }, data: { label: 'E', status: 'white', isActive: false, isSource: false, isSink: false, isStart: false, isEdgeSource: false } },
                    { id: 'F', type: 'academic', position: { x: 880, y: 230 }, data: { label: 'F', status: 'white', isActive: false, isSource: false, isSink: true,  isStart: false, isEdgeSource: false } },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: getRandomInt(12, 18) },
                    { source: 'A', target: 'C', weight: getRandomInt(12, 18) },
                    { source: 'A', target: 'E', weight: getRandomInt(8, 14) },
                    { source: 'B', target: 'D', weight: getRandomInt(10, 16) },
                    { source: 'B', target: 'C', weight: getRandomInt(4, 8) },
                    { source: 'C', target: 'E', weight: getRandomInt(10, 16) },
                    { source: 'D', target: 'C', weight: getRandomInt(5, 10) },
                    { source: 'D', target: 'F', weight: getRandomInt(14, 20) },
                    { source: 'E', target: 'F', weight: getRandomInt(14, 20) },
                ],
                startNode: 'A',
                sinkNode: 'F',
            };
        }
    }
}

export function useGraphEditor(initialDirected = false, isWeighted = false, hasStartOption = true, algorithm = null) {
    const isFlow = algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp';
    const [isDirected, setIsDirectedState] = useState(Boolean(isFlow ? true : initialDirected));
    const [editMode, setEditModeState] = useState('node');
    const [edgeSource, setEdgeSourceState] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [startNode, setStartNodeState] = useState(null);
    const [edges, setEdges] = useState([]);

    const lastFlowTemplateRef = useRef(-1);

    useEffect(() => {
        if (!hasStartOption && !isFlow) {
            setStartNodeState(null);
            setNodes(nds => nds.map(n => (n.data?.isStart ? { ...n, data: { ...n.data, isStart: false } } : n)));
        }
    }, [hasStartOption, isFlow]);

    useEffect(() => {
        if (!isWeighted && !isFlow) {
            setEdges(prev => prev.map(e => ({
                ...e,
                label: undefined,
                labelStyle: undefined,
                labelBgStyle: undefined,
                labelBgPadding: undefined,
            })));
        }
    }, [isWeighted, isFlow]);

    // ── Undo / Redo history ──────────────────────────────────────────────
    const historyRef = useRef([]);       // past snapshots
    const futureRef  = useRef([]);       // redo snapshots

    const snapshot = useCallback((currentNodes, currentEdges, currentStart) => ({
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges)),
        startNode: currentStart,
    }), []);

    const pushHistory = useCallback((nodesSnap, edgesSnap, startSnap) => {
        historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), snapshot(nodesSnap, edgesSnap, startSnap)];
        futureRef.current = [];
    }, [snapshot]);

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const refreshUndoRedo = useCallback(() => {
        setCanUndo(historyRef.current.length > 0);
        setCanRedo(futureRef.current.length > 0);
    }, []);

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return;
        setNodes(n => {
            setEdges(e => {
                setStartNodeState(s => {
                    const past = historyRef.current[historyRef.current.length - 1];
                    futureRef.current = [...futureRef.current, snapshot(n, e, s)];
                    historyRef.current = historyRef.current.slice(0, -1);
                    setNodes(past.nodes);
                    setEdges(past.edges);
                    setStartNodeState(past.startNode);
                    refreshUndoRedo();
                    return past.startNode;
                });
                return e;
            });
            return n;
        });
    }, [snapshot, refreshUndoRedo]);

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return;
        setNodes(n => {
            setEdges(e => {
                setStartNodeState(s => {
                    const next = futureRef.current[futureRef.current.length - 1];
                    historyRef.current = [...historyRef.current, snapshot(n, e, s)];
                    futureRef.current = futureRef.current.slice(0, -1);
                    setNodes(next.nodes);
                    setEdges(next.edges);
                    setStartNodeState(next.startNode);
                    refreshUndoRedo();
                    return next.startNode;
                });
                return e;
            });
            return n;
        });
    }, [snapshot, refreshUndoRedo]);

    // ── Change handlers ──────────────────────────────────────────────────
    const onNodesChange = useCallback((changes) => {
        setNodes(nds => applyNodeChanges(changes, nds));
    }, []);

    const onEdgesChange = useCallback((changes) => {
        setEdges(eds => applyEdgeChanges(changes, eds));
    }, []);

    const setIsDirected = useCallback((val) => {
        const nextVal = typeof val === 'function' ? val(isDirected) : Boolean(val);
        setIsDirectedState(nextVal);
        setEdges(eds => eds.map(e => ({ ...e, markerEnd: nextVal ? baseMarker : undefined })));
    }, [isDirected]);

    const setEditMode = useCallback((mode) => {
        setEditModeState(mode);
        setEdgeSourceState(null);
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isEdgeSource: false } })));
    }, []);

    const setEdgeSource = useCallback((sourceId) => {
        setEdgeSourceState(sourceId);
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isEdgeSource: n.id === sourceId } })));
    }, []);

    const setStartNode = useCallback((nodeId) => {
        if (!hasStartOption && !isFlow) return;
        setStartNodeState(nodeId);
        setNodes(nds => {
            const nextSink = isFlow ? getSinkId(nds, nodeId) : null;
            return nds.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    isStart: n.id === nodeId,
                    isSource: isFlow && n.id === nodeId,
                    isSink: isFlow && n.id === nextSink,
                }
            }));
        });
    }, [hasStartOption, isFlow]);

    const addNode = useCallback((position) => {
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    const nextLabel = getNextNodeLabel(prevNodes);
                    const isFirst = prevNodes.length === 0;
                    const newStart = (hasStartOption && isFirst) ? nextLabel : prevStart;
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return newStart;
                });
                return prevEdges;
            });
            const nextLabel = getNextNodeLabel(prevNodes);
            const isFirst = prevNodes.length === 0;
            const curStart = (hasStartOption && isFirst) ? nextLabel : startNode;

            const newNode = {
                id: nextLabel,
                type: 'academic',
                position: { x: Math.round(position.x), y: Math.round(position.y) },
                data: {
                    label: nextLabel,
                    status: 'white',
                    isActive: false,
                    isStart: hasStartOption && isFirst,
                    isSource: isFlow && isFirst,
                    isSink: false,
                    isEdgeSource: false,
                },
            };
            if (hasStartOption && isFirst) setStartNodeState(nextLabel);

            const updatedNodes = [...prevNodes, newNode];
            if (isFlow) {
                const effectiveStart = curStart || nextLabel;
                const nextSink = getSinkId(updatedNodes, effectiveStart);
                return updatedNodes.map(n => ({
                    ...n,
                    data: {
                        ...n.data,
                        isSource: n.id === effectiveStart,
                        isSink: n.id === nextSink,
                    }
                }));
            }
            return updatedNodes;
        });
    }, [hasStartOption, isFlow, startNode, pushHistory, refreshUndoRedo]);

    const addEdge = useCallback((source, target, customWeight) => {
        if (!source || !target) return;
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    const exists = prevEdges.some(e =>
                        isDirected
                            ? e.source === source && e.target === target
                            : (e.source === source && e.target === target) || (e.source === target && e.target === source)
                    );
                    if (!exists) {
                        pushHistory(prevNodes, prevEdges, prevStart);
                        refreshUndoRedo();
                    }
                    return prevStart;
                });
                const exists = prevEdges.some(e =>
                    isDirected
                        ? e.source === source && e.target === target
                        : (e.source === source && e.target === target) || (e.source === target && e.target === source)
                );
                if (exists) return prevEdges;

                const edgeId = isDirected
                    ? `e${source}-${target}`
                    : `e${[source, target].sort().join('-')}`;
                const defaultW = isFlow ? getRandomInt(5, 20) : getRandomInt(1, 9);
                const weight = customWeight != null ? customWeight : (isWeighted ? defaultW : 1);
                const newEdge = {
                    id: edgeId, source, target, type: 'straight',
                    style: baseEdgeStyle,
                    markerEnd: isDirected ? baseMarker : undefined,
                    animated: false, weight,
                    label: isWeighted ? String(weight) : undefined,
                    labelStyle: isWeighted ? { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' } : undefined,
                    labelBgStyle: isWeighted ? { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 } : undefined,
                    labelBgPadding: isWeighted ? [6, 4] : undefined,
                };
                return [...prevEdges, newEdge];
            });
            return prevNodes;
        });
    }, [isDirected, isWeighted, isFlow, pushHistory, refreshUndoRedo]);

    const cycleEdgeWeight = useCallback((edgeId) => {
        if (!isWeighted) return;
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return prevStart;
                });
                return prevEdges.map(e => {
                    if (e.id !== edgeId) return e;
                    const nextWeight = (Number(e.weight || 1) % 9) + 1;
                    return { ...e, weight: nextWeight, label: String(nextWeight) };
                });
            });
            return prevNodes;
        });
    }, [isWeighted, pushHistory, refreshUndoRedo]);

    const setEdgeWeight = useCallback((edgeId, newWeight) => {
        if (!isWeighted) return;
        const num = Math.round(Number(newWeight));
        const allowNegative = algorithm === 'FloydWarshall' || algorithm === 'Kruskal' || algorithm === 'Prim';
        let w;
        if (isNaN(num)) {
            w = 1;
        } else if (allowNegative) {
            w = num;
        } else {
            w = num <= 0 ? 1 : num;
        }
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return prevStart;
                });
                return prevEdges.map(e => {
                    if (e.id !== edgeId) return e;
                    return { ...e, weight: w, label: String(w) };
                });
            });
            return prevNodes;
        });
    }, [isWeighted, algorithm, pushHistory, refreshUndoRedo]);

    const deleteNode = useCallback((nodeId) => {
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return prevStart;
                });
                return prevEdges.filter(e => e.source !== nodeId && e.target !== nodeId);
            });
            const remaining = prevNodes.filter(n => n.id !== nodeId);
            const nextStart = hasStartOption ? (startNode === nodeId ? (remaining[0]?.id || null) : startNode) : null;
            if (startNode === nodeId) {
                setStartNodeState(nextStart);
            }
            if (isFlow) {
                const nextSink = getSinkId(remaining, nextStart);
                return remaining.map(n => ({
                    ...n,
                    data: {
                        ...n.data,
                        isStart: n.id === nextStart,
                        isSource: n.id === nextStart,
                        isSink: n.id === nextSink,
                        isEdgeSource: false,
                    }
                }));
            }
            return remaining.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    isStart: hasStartOption && n.id === nextStart,
                    isEdgeSource: false,
                }
            }));
        });
        if (edgeSource === nodeId) setEdgeSource(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasStartOption, isFlow, startNode, edgeSource, pushHistory, refreshUndoRedo]);

    const deleteEdge = useCallback((edgeId) => {
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return prevStart;
                });
                return prevEdges.filter(e => e.id !== edgeId);
            });
            return prevNodes;
        });
    }, [pushHistory, refreshUndoRedo]);

    const clearAll = useCallback(() => {
        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return null;
                });
                return [];
            });
            return [];
        });
        setEdgeSourceState(null);
    }, [pushHistory, refreshUndoRedo]);

    const generateRandom = useCallback((nodeCount = null, directed = isDirected) => {
        if (isFlow) {
            const templateCount = 5;
            const isFirst = lastFlowTemplateRef.current === -1;
            let nextIndex = 0;
            if (isFirst) {
                nextIndex = 0;
            } else {
                nextIndex = (lastFlowTemplateRef.current + 1) % templateCount;
                if (Math.random() > 0.4) {
                    nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (templateCount - 2))) % templateCount;
                }
            }
            lastFlowTemplateRef.current = nextIndex;

            const tmpl = getFlowTemplate(nextIndex, isFirst);
            const formattedEdges = formatFlowEdges(tmpl.edges);

            setNodes(prevNodes => {
                setEdges(prevEdges => {
                    setStartNodeState(prevStart => {
                        pushHistory(prevNodes, prevEdges, prevStart);
                        refreshUndoRedo();
                        return tmpl.startNode;
                    });
                    return formattedEdges;
                });
                return tmpl.nodes;
            });
            setStartNodeState(tmpl.startNode);
            setEdgeSourceState(null);
            return;
        }

        const count = nodeCount || (Math.floor(Math.random() * 4) + 5);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, count);
        const centerX = 360, centerY = 220, radius = 155;

        const newNodes = letters.map((label, idx) => {
            const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
            return {
                id: label, type: 'academic',
                position: { x: Math.round(centerX + radius * Math.cos(angle)), y: Math.round(centerY + radius * Math.sin(angle)) },
                data: { label, status: 'white', isActive: false, isStart: hasStartOption && idx === 0, isEdgeSource: false },
            };
        });

        const connected = [letters[0]];
        const unconnected = [...letters.slice(1)];
        const treeEdges = [];
        while (unconnected.length > 0) {
            const u = connected[Math.floor(Math.random() * connected.length)];
            const vIdx = Math.floor(Math.random() * unconnected.length);
            const v = unconnected.splice(vIdx, 1)[0];
            const weight = isWeighted ? Math.floor(Math.random() * 9) + 1 : 1;
            treeEdges.push({ source: u, target: v, weight });
            connected.push(v);
        }

        const existingSet = new Set();
        treeEdges.forEach(e => { existingSet.add(directed ? `${e.source}->${e.target}` : `${[e.source, e.target].sort().join('-')}`); });

        const extraCandidates = [];
        for (let i = 0; i < letters.length; i++) {
            for (let j = 0; j < letters.length; j++) {
                if (i === j) continue;
                const u = letters[i], v = letters[j];
                const key = directed ? `${u}->${v}` : `${[u, v].sort().join('-')}`;
                if (!existingSet.has(key)) extraCandidates.push({ source: u, target: v, key });
            }
        }
        const extraCount = Math.min(extraCandidates.length, Math.floor(Math.random() * 3) + 1);
        for (let i = extraCandidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [extraCandidates[i], extraCandidates[j]] = [extraCandidates[j], extraCandidates[i]];
        }
        const chosenExtra = [];
        for (const cand of extraCandidates) {
            if (chosenExtra.length >= extraCount) break;
            if (!existingSet.has(cand.key)) {
                existingSet.add(cand.key);
                const weight = isWeighted ? Math.floor(Math.random() * 9) + 1 : 1;
                chosenExtra.push({ source: cand.source, target: cand.target, weight });
            }
        }

        const allPairs = [...treeEdges, ...chosenExtra];
        const newEdges = allPairs.map(e => ({
            id: directed ? `e${e.source}-${e.target}` : `e${[e.source, e.target].sort().join('-')}`,
            source: e.source, target: e.target, type: 'straight',
            style: baseEdgeStyle,
            markerEnd: directed ? baseMarker : undefined,
            animated: false, weight: e.weight || 1,
            label: isWeighted ? String(e.weight || 1) : undefined,
            labelStyle: isWeighted ? { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' } : undefined,
            labelBgStyle: isWeighted ? { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 } : undefined,
            labelBgPadding: isWeighted ? [6, 4] : undefined,
        }));

        setNodes(prevNodes => {
            setEdges(prevEdges => {
                setStartNodeState(prevStart => {
                    pushHistory(prevNodes, prevEdges, prevStart);
                    refreshUndoRedo();
                    return hasStartOption ? letters[0] : null;
                });
                return newEdges;
            });
            return newNodes;
        });
        setStartNodeState(hasStartOption ? letters[0] : null);
        setEdgeSourceState(null);
    }, [isFlow, hasStartOption, isDirected, isWeighted, pushHistory, refreshUndoRedo]);

    const getGraphData = useCallback(() => {
        const adj = {};
        const weightedGraph = {};
        nodes.forEach(n => { adj[n.id] = []; weightedGraph[n.id] = {}; });
        edges.forEach(e => {
            const w = (e.weight !== undefined && !isNaN(Number(e.weight))) ? Number(e.weight) : 1;
            if (adj[e.source] && !adj[e.source].includes(e.target)) adj[e.source].push(e.target);
            if (weightedGraph[e.source]) weightedGraph[e.source][e.target] = w;
            if (!isDirected) {
                if (adj[e.target] && !adj[e.target].includes(e.source)) adj[e.target].push(e.source);
                if (weightedGraph[e.target]) weightedGraph[e.target][e.source] = w;
            }
        });
        Object.keys(adj).forEach(k => { adj[k].sort(); });
        const edgeList = edges.map(e => ({
            u: e.source,
            v: e.target,
            source: e.source,
            target: e.target,
            weight: (e.weight !== undefined && !isNaN(Number(e.weight))) ? Number(e.weight) : 1
        }));

        const effectiveStart = hasStartOption ? (startNode || nodes[0]?.id || null) : null;
        const sourceNode = isFlow ? (effectiveStart || 'A') : effectiveStart;
        const sinkNode = isFlow ? getSinkId(nodes, sourceNode) : null;

        return {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges.map(e => ({
                ...e,
                label: isWeighted ? (e.label || String(e.weight ?? 1)) : undefined,
                labelStyle: isWeighted ? e.labelStyle : undefined,
                labelBgStyle: isWeighted ? e.labelBgStyle : undefined,
                labelBgPadding: isWeighted ? e.labelBgPadding : undefined,
            })))),
            startNode: effectiveStart,
            sourceNode,
            sinkNode,
            isDirected, isWeighted, graphData: adj, weightedGraph, edgeList,
        };
    }, [hasStartOption, nodes, edges, isDirected, isWeighted, startNode, isFlow]);

    return {
        nodes, edges, isDirected, isWeighted, editMode, edgeSource, startNode,
        onNodesChange, onEdgesChange,
        setIsDirected, setEditMode, setEdgeSource, setStartNode,
        addNode, addEdge, cycleEdgeWeight, setEdgeWeight,
        deleteNode, deleteEdge, clearAll, generateRandom, getGraphData,
        undo, redo, canUndo, canRedo,
    };
}

