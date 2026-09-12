import { useState, useCallback, useRef } from 'react';
import { applyNodeChanges, applyEdgeChanges, MarkerType } from 'reactflow';
import axios from 'axios';
import config from '../data/config.json';

// ── Edge / marker style presets ──────────────────────────────────────────
const baseEdge        = { stroke: '#cbd5e1', strokeWidth: 2 };
const activeEdge      = { stroke: '#f59e0b', strokeWidth: 3.5 };
const treeEdge        = { stroke: '#1e293b', strokeWidth: 3 };
const backEdge        = { stroke: '#ef4444', strokeWidth: 2.5, strokeDasharray: '6 3' };
const forwardEdge     = { stroke: '#3b82f6', strokeWidth: 2.5, strokeDasharray: '6 3' };
const crossEdge       = { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '6 3' };
const mstEdge         = { stroke: '#10b981', strokeWidth: 3.5 };
const skipEdge        = { stroke: '#ef4444', strokeWidth: 2.5, strokeDasharray: '6 3' };
const relaxEdge       = { stroke: '#38bdf8', strokeWidth: 3 };
const flowEdge        = { stroke: '#0f172a', strokeWidth: 3.5 };
const saturatedEdge   = { stroke: '#059669', strokeWidth: 4 };

const baseMarker      = { type: MarkerType.ArrowClosed, color: '#cbd5e1', width: 15, height: 15 };
const activeMarker    = { type: MarkerType.ArrowClosed, color: '#f59e0b', width: 18, height: 18 };
const treeMarker      = { type: MarkerType.ArrowClosed, color: '#1e293b', width: 18, height: 18 };
const backMarker      = { type: MarkerType.ArrowClosed, color: '#ef4444', width: 16, height: 16 };
const forwardMarker   = { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 };
const crossMarker     = { type: MarkerType.ArrowClosed, color: '#10b981', width: 16, height: 16 };
const mstMarker       = { type: MarkerType.ArrowClosed, color: '#10b981', width: 18, height: 18 };
const skipMarker      = { type: MarkerType.ArrowClosed, color: '#ef4444', width: 15, height: 15 };
const relaxMarker     = { type: MarkerType.ArrowClosed, color: '#38bdf8', width: 18, height: 18 };
const flowMarker      = { type: MarkerType.ArrowClosed, color: '#0f172a', width: 18, height: 18 };
const saturatedMarker = { type: MarkerType.ArrowClosed, color: '#059669', width: 20, height: 20 };
const settledFlowMarker = { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 17, height: 17 };

const defaultGraphData = {
    nodes: config.initialNodes.map(n => ({
        ...n, type: 'academic',
        data: { ...n.data, status: 'white', isActive: false, timestamp: null, keyVal: null, isStart: n.id === 'A' },
    })),
    edges: config.initialEdges.map(e => ({
        ...e,
        origSource: e.source,
        origTarget: e.target,
        type: 'straight',
        style: { ...baseEdge, transition: 'stroke 0.3s ease, stroke-width 0.3s ease' },
        markerEnd: undefined, animated: false,
    })),
    graphData: config.graphDataForPython,
    edgeList: config.initialEdges.map(e => ({ u: e.source, v: e.target, weight: Number(e.weight || 1) })),
    startNode: 'A',
    isDirected: false,
};

const SPEEDS = { slow: 1400, normal: 750, fast: 320 };
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const API_ENDPOINT = {
    BFS:          'bfs',
    DFS:          'dfs',
    Dijkstra:     'dijkstra',
    FloydWarshall:'floydwarshall',
    Kruskal:      'kruskal',
    Prim:         'prim',
    FordFulkerson:'fordfulkerson',
    EdmondsKarp:  'edmondskarp',
    Kosaraju:     'kosaraju',
    Tarjan:       'tarjan',
};

export function useAlgorithm() {
    const currentGraphRef = useRef(defaultGraphData);
    const [nodes, setNodes] = useState(() => JSON.parse(JSON.stringify(defaultGraphData.nodes)));
    const [edges, setEdges] = useState(() => JSON.parse(JSON.stringify(defaultGraphData.edges)));
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [speed, setSpeed] = useState('normal');
    const [activeLine, setActiveLine] = useState(null);
    const [dsState, setDsState] = useState([]);
    const [totalWeight, setTotalWeight] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [totalSteps, setTotalSteps] = useState(0);

    // Floyd-Warshall states
    const [distMatrix, setDistMatrix] = useState(null);
    const [negativeCycleInfo, setNegativeCycleInfo] = useState(null);
    const [activeK, setActiveK] = useState(null);
    const [activeI, setActiveI] = useState(null);
    const [activeJ, setActiveJ] = useState(null);

    // SCC states (Kosaraju / Tarjan)
    const [sccColors, setSccColors] = useState({});
    const [sccList, setSccList] = useState([]);
    const [phase, setPhase] = useState(1);

    // Ford-Fulkerson flow states
    const [maxFlow, setMaxFlow] = useState(null);
    const [flowInfo, setFlowInfo] = useState({});

    const pauseRef        = useRef(false);
    const stepsRef        = useRef([]);
    const stepIndexRef    = useRef(0);
    const resolveStepRef  = useRef(null);
    const speedRef        = useRef('normal');
    const cancelledRef    = useRef(false);
    const nodeStatesRef   = useRef({});
    const activeAlgRef    = useRef('');

    const onNodesChange = useCallback((changes) => setNodes(nds => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges(eds => applyEdgeChanges(changes, eds)), []);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const initializeGraph = useCallback((customData, algName) => {
        if (!customData) return;
        const isDir = customData.isDirected ?? false;
        const isKruskal = algName === 'Kruskal';
        const isFlow = algName === 'FordFulkerson' || algName === 'EdmondsKarp';
        const startNode = isKruskal ? null : (customData.startNode || customData.nodes?.[0]?.id || 'A');
        const sourceNode = isFlow ? (customData.sourceNode || startNode) : null;
        const sinkNode = isFlow ? (customData.sinkNode || (() => {
            const nds = customData.nodes || [];
            const remaining = nds.filter(n => n.id !== sourceNode);
            if (remaining.length === 0) return nds[0]?.id || 'F';
            const sortedByX = [...remaining].sort((a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0));
            return sortedByX[0]?.id || nds[nds.length - 1]?.id || 'F';
        })()) : null;
        const isUnweighted = algName ? ['BFS', 'DFS', 'Kosaraju', 'Tarjan'].includes(algName) : customData.isWeighted === false;

        const formattedNodes = (customData.nodes || []).map(n => ({
            ...n, type: 'academic',
            data: {
                ...n.data,
                status: 'white',
                isActive: false,
                timestamp: null,
                keyVal: null,
                piVal: null,
                distVal: null,
                tarjanIdx: null,
                tarjanLow: null,
                sccColor: null,
                sccId: null,
                isStart: !isKruskal && !isFlow && (n.id === startNode),
                isSource: isFlow && (n.id === sourceNode),
                isSink: isFlow && (n.id === sinkNode),
                isRoot: false,
            },
        }));

        const formattedEdges = (customData.edges || []).map(e => ({
            ...e,
            origSource: e.origSource || e.source,
            origTarget: e.origTarget || e.target,
            type: 'straight',
            style: { ...baseEdge, transition: 'stroke 0.3s ease, stroke-width 0.3s ease' },
            markerEnd: isDir ? baseMarker : undefined,
            animated: false,
            label: isUnweighted ? undefined : (e.label || (e.weight != null ? String(e.weight) : undefined)),
            labelStyle: isUnweighted ? undefined : (e.labelStyle || { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }),
            labelBgStyle: isUnweighted ? undefined : (e.labelBgStyle || { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 }),
            labelBgPadding: isUnweighted ? undefined : (e.labelBgPadding || [6, 4]),
            labelBgBorderRadius: isUnweighted ? undefined : (e.labelBgBorderRadius || 6),
        }));

        const edgeList = customData.edgeList || formattedEdges.map(e => ({
            u: e.source, v: e.target, weight: Number(e.weight ?? 1),
        }));

        currentGraphRef.current = {
            nodes: formattedNodes, edges: formattedEdges,
            graphData: customData.graphData || config.graphDataForPython,
            weightedGraph: customData.weightedGraph || {},
            edgeList, startNode, sourceNode, sinkNode, isDirected: isDir,
        };

        setNodes(JSON.parse(JSON.stringify(formattedNodes)));
        setEdges(JSON.parse(JSON.stringify(formattedEdges)));
        setActiveLine(null); setDsState([]); setTotalWeight(0);
        setCurrentStepIndex(-1); setTotalSteps(0); setIsFinished(false);
        setDistMatrix(null); setNegativeCycleInfo(null); setActiveK(null); setActiveI(null); setActiveJ(null);
        setSccColors({}); setSccList([]); setPhase(1);
        setMaxFlow(null); setFlowInfo({});
        stepsRef.current = []; nodeStatesRef.current = {};
    }, []);

    // ── applyStep ─────────────────────────────────────────────────────────
    const applyStep = (step, algName) => {
        if (!step) return;
        const ns = nodeStatesRef.current;
        const isDir = currentGraphRef.current.isDirected;
        const curBaseMarker      = isDir ? baseMarker      : undefined;
        const curActiveMarker    = isDir ? activeMarker    : undefined;
        const curTreeMarker      = isDir ? treeMarker      : undefined;
        const curBackMarker      = isDir ? backMarker      : undefined;
        const curForwardMarker   = isDir ? forwardMarker   : undefined;
        const curCrossMarker     = isDir ? crossMarker     : undefined;
        const curMstMarker       = isDir ? mstMarker       : undefined;
        const curSkipMarker      = isDir ? skipMarker      : undefined;
        const curRelaxMarker     = isDir ? relaxMarker     : undefined;
        const curFlowMarker      = isDir ? flowMarker      : undefined;
        const curSettledFlowMarker = isDir ? settledFlowMarker : undefined;
        const curSaturatedMarker = isDir ? saturatedMarker : undefined;

        setActiveLine(step.line || null);
        setCurrentStepIndex(stepIndexRef.current);

        // ═════════════════════════════════════════════════════════════════════
        // 1. FLOYD-WARSHALL
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'FloydWarshall') {
            if (step.dist_matrix) setDistMatrix(step.dist_matrix);
            setActiveK(step.k || null);
            setActiveI(step.i || null);
            setActiveJ(step.j || null);

            const isNegCycle = step.action === 'negative_cycle' || Boolean(step.has_negative_cycle);
            const negNodes = step.negative_cycle_nodes || [];
            if (isNegCycle && negNodes.length > 0) {
                setNegativeCycleInfo({
                    hasCycle: true,
                    nodes: negNodes,
                    message: step.message || `Negative-weight cycle detected at vertex '${negNodes[0]}' (dist[${negNodes[0]}][${negNodes[0]}] < 0). Shortest paths do not mathematically exist.`,
                });
            }

            setNodes(prev => prev.map(n => ({
                ...n, data: {
                    ...n.data,
                    isActive: (step.active_nodes || []).includes(n.id),
                    keyVal: n.id === step.k ? `k` : null,
                    isNegativeCycle: isNegCycle && negNodes.includes(n.id),
                },
            })));

            setEdges(prev => prev.map(e => {
                const isIJ = (e.source === step.i && e.target === step.j) || (!isDir && e.source === step.j && e.target === step.i);
                const isIK = (e.source === step.i && e.target === step.k) || (!isDir && e.source === step.k && e.target === step.i);
                const isKJ = (e.source === step.k && e.target === step.j) || (!isDir && e.source === step.j && e.target === step.k);

                if (step.action === 'update_dist' && isIJ) {
                    return { ...e, style: { ...relaxEdge }, markerEnd: curRelaxMarker, animated: false };
                }
                if (step.action === 'check_path') {
                    if (isIJ) return { ...e, style: { ...relaxEdge }, markerEnd: curRelaxMarker, animated: false };
                    if (isIK || isKJ) return { ...e, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
                }
                return { ...e, style: { ...baseEdge }, markerEnd: isDir ? baseMarker : undefined, animated: false };
            }));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 2. DIJKSTRA
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'Dijkstra') {
            if (step.pq) setDsState(step.pq);
            if (step.node_states) Object.assign(ns, step.node_states);

            setNodes(prev => prev.map(n => ({
                ...n, data: {
                    ...n.data,
                    status: ns[n.id] || 'white',
                    isActive: n.id === step.node || n.id === step.v,
                    distVal: step.distances ? (step.distances[n.id] ?? '∞') : n.data.distVal,
                    piVal: step.predecessors ? (step.predecessors[n.id] ?? null) : n.data.piVal,
                    isStart: n.id === currentGraphRef.current.startNode,
                },
            })));

            // Edge highlighting: tree edges vs current active edge
            const shortestTreePairs = new Set((step.shortest_path_edges || []).map(p => `${p.u}->${p.v}`));
            setEdges(prev => prev.map(e => {
                const isCheck = (e.source === step.u && e.target === step.v) || (!isDir && e.source === step.v && e.target === step.u);
                const isTreeEdge = shortestTreePairs.has(`${e.source}->${e.target}`) || (!isDir && shortestTreePairs.has(`${e.target}->${e.source}`));

                if (isTreeEdge) {
                    return { ...e, style: { ...mstEdge }, markerEnd: curMstMarker, animated: false };
                }
                if (isCheck) {
                    if (step.action === 'relax_edge') {
                        return { ...e, style: { ...relaxEdge }, markerEnd: curRelaxMarker, animated: false };
                    }
                    if (step.action === 'check_edge' || step.action === 'check_relax') {
                        return { ...e, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
                    }
                }
                return { ...e, style: { ...baseEdge }, markerEnd: isDir ? baseMarker : undefined, animated: false };
            }));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 3. KRUSKAL
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'Kruskal') {
            if (step.total_weight !== undefined) setTotalWeight(step.total_weight);
            if (step.sets) setDsState(step.sets);

            const mstPairs = new Set((step.mst_edges || []).map(m => [m.u, m.v].sort().join('-')));
            const rejectedPairs = new Set((step.rejected_edges || []).map(m => [m.u, m.v].sort().join('-')));

            setEdges(prev => prev.map(e => {
                const pairKey = [e.source, e.target].sort().join('-');
                const isMst = mstPairs.has(pairKey);
                const isRejected = rejectedPairs.has(pairKey);
                const isTarget = (e.source === step.u && e.target === step.v) || (e.source === step.v && e.target === step.u);

                if (isMst) {
                    return { ...e, style: { ...mstEdge }, markerEnd: curMstMarker, animated: false };
                }
                if (isTarget) {
                    if (step.action === 'check_edge') return { ...e, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
                    if (step.action === 'add_to_mst' || step.action === 'union') return { ...e, style: { ...mstEdge }, markerEnd: curMstMarker, animated: false };
                    if (step.action === 'skip_edge')  return { ...e, style: { ...skipEdge }, markerEnd: curSkipMarker, animated: false };
                }
                if (isRejected) {
                    return { ...e, style: { ...skipEdge }, markerEnd: curSkipMarker, animated: false };
                }
                return { ...e, style: { ...baseEdge }, markerEnd: isDir ? baseMarker : undefined, animated: false };
            }));

            setNodes(prev => prev.map(n => ({
                ...n, data: { ...n.data, isActive: n.id === step.u || n.id === step.v },
            })));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. PRIM
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'Prim') {
            if (step.total_weight !== undefined) setTotalWeight(step.total_weight);
            if (step.pq) setDsState(step.pq);
            if (step.action === 'extract_min') ns[step.u] = 'black';
            else if (step.action === 'check_neighbor' || step.action === 'decrease_key') {
                if (ns[step.v] !== 'black') ns[step.v] = 'gray';
            }

            const mstPairs = new Set((step.mst_edges || []).map(m => [m.u, m.v].sort().join('-')));
            const rejectedPairs = new Set((step.rejected_edges || []).map(m => [m.u, m.v].sort().join('-')));

            setEdges(prev => prev.map(e => {
                const pairKey = [e.source, e.target].sort().join('-');
                const isMst = mstPairs.has(pairKey);
                const isRejected = rejectedPairs.has(pairKey);
                const isTarget = (e.source === step.u && e.target === step.v) || (e.source === step.v && e.target === step.u);

                if (isMst) {
                    return { ...e, style: { ...mstEdge }, markerEnd: curMstMarker, animated: false };
                }
                if (isTarget) {
                    if (step.action === 'check_neighbor') return { ...e, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
                    if (step.action === 'decrease_key')   return { ...e, style: { ...relaxEdge }, markerEnd: curRelaxMarker, animated: false };
                    if (step.action === 'skip_neighbor')  return { ...e, style: { ...skipEdge }, markerEnd: curSkipMarker, animated: false };
                }
                if (isRejected) {
                    return { ...e, style: { ...skipEdge }, markerEnd: curSkipMarker, animated: false };
                }
                return { ...e, style: { ...baseEdge }, markerEnd: isDir ? baseMarker : undefined, animated: false };
            }));

            const activeNodeId = step.action === 'check_neighbor' ? step.v : step.u;
            setNodes(prev => prev.map(n => ({
                ...n, data: {
                    ...n.data,
                    status: ns[n.id] || 'white',
                    isActive: n.id === activeNodeId,
                    keyVal: step.keys ? (step.keys[n.id] ?? null) : n.data.keyVal,
                    piVal: step.predecessors ? (step.predecessors[n.id] ?? null) : n.data.piVal,
                    isStart: n.id === (step.start_node || currentGraphRef.current.startNode),
                    isRoot: false,
                },
            })));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. FORD-FULKERSON & EDMONDS-KARP (Max Flow Networks)
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'FordFulkerson' || algName === 'EdmondsKarp') {
            if (step.max_flow !== undefined) setMaxFlow(step.max_flow);
            setFlowInfo({
                path: step.path,
                pathStr: step.path_str,
                bottleneck: step.bottleneck,
                minCutS: step.min_cut_S,
                minCutT: step.min_cut_T,
                saturatedEdges: step.saturated_edges,
                iteration: step.iteration,
            });

            if (step.stack) setDsState([...step.stack]);
            else if (step.queue) setDsState([...step.queue]);
            else if (step.path_nodes) setDsState([...step.path_nodes]);
            else if (step.action === 'init' || step.action === 'dfs_start' || step.action === 'bfs_start') setDsState([step.source]);
            else if (step.action === 'done') setDsState([]);

            if (step.node_states) Object.assign(ns, step.node_states);

            const pathPairs = new Set((step.path || []).map(p => `${p.u}->${p.v}`));

            // Update edge labels to show f/c (e.g. 4/16) and highlight active path
            setEdges(prev => prev.map(e => {
                const edgeKey = `${e.source}->${e.target}`;
                const ef = step.edge_flows?.[edgeKey];
                const isPathEdge = pathPairs.has(edgeKey);
                const isBfsActive = (e.source === step.u && e.target === step.v);

                const label = ef ? ef.display : e.label;

                if (isPathEdge) {
                    return {
                        ...e, label,
                        style: { ...flowEdge, stroke: '#0f172a', strokeWidth: 4 },
                        markerEnd: curFlowMarker, animated: true,
                    };
                }
                if (isBfsActive && step.action === 'check_edge') {
                    return {
                        ...e, label,
                        style: { ...activeEdge },
                        markerEnd: curActiveMarker, animated: false,
                    };
                }
                if (ef?.saturated) {
                    return {
                        ...e, label,
                        style: { ...saturatedEdge },
                        markerEnd: curSaturatedMarker, animated: false,
                    };
                }
                if (ef && ef.flow > 0) {
                    return {
                        ...e, label,
                        style: { stroke: '#8b5cf6', strokeWidth: 3 },
                        markerEnd: curSettledFlowMarker, animated: false,
                    };
                }
                return {
                    ...e, label,
                    style: { ...baseEdge },
                    markerEnd: curActiveMarker ? baseMarker : undefined,
                    animated: false,
                };
            }));

            // Node states and source/sink badges
            setNodes(prev => prev.map(n => ({
                ...n, data: {
                    ...n.data,
                    status: (step.path_nodes || []).includes(n.id) ? 'gray' : (step.min_cut_S?.includes(n.id) ? 'black' : (ns[n.id] || 'white')),
                    isActive: step.action === 'check_edge' && (n.id === step.u || n.id === step.v),
                    isSource: n.id === step.source,
                    isSink: n.id === step.sink,
                },
            })));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. KOSARAJU (Strongly Connected Components)
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'Kosaraju') {
            const curPhase = step.phase || 1;
            setPhase(curPhase);
            if (step.scc_colors) setSccColors(step.scc_colors);
            if (step.scc_list) setSccList(step.scc_list);
            if (step.finish_stack !== undefined) setDsState([...step.finish_stack]);
            if (step.node_states) Object.assign(ns, step.node_states);

            setNodes(prev => prev.map(n => {
                const assignedColor = step.scc_colors?.[n.id] || null;
                const assignedScc = (step.scc_list || []).find(s => s.members.includes(n.id));

                return {
                    ...n, data: {
                        ...n.data,
                        status: assignedColor ? 'scc-colored' : (ns[n.id] || 'white'),
                        isActive: n.id === (step.node || step.u),
                        sccColor: assignedColor,
                        sccId: assignedScc ? assignedScc.id : (step.scc_id && n.id === step.node ? step.scc_id : null),
                        timestamp: curPhase === 1 ? (step.timestamps?.[n.id] || n.data.timestamp) : null,
                    },
                };
            }));

            // Edge highlighting and direction reversal:
            // In Phase 1: edges flow in original direction (origSource -> origTarget)
            // In Phase 2: edges flow in transposed direction (origTarget -> origSource for G^T)
            setEdges(prev => prev.map(e => {
                const origSrc = e.origSource || e.source;
                const origTgt = e.origTarget || e.target;

                const isPhase2 = curPhase === 2;
                const currentSource = isPhase2 ? origTgt : origSrc;
                const currentTarget = isPhase2 ? origSrc : origTgt;

                const isTarget = isPhase2
                    ? ((currentSource === step.u && currentTarget === step.v) || (origSrc === step.orig_u && origTgt === step.orig_v))
                    : (currentSource === step.u && currentTarget === step.v);

                const baseObj = {
                    ...e,
                    origSource: origSrc,
                    origTarget: origTgt,
                    source: currentSource,
                    target: currentTarget,
                    label: undefined,
                };

                if (isPhase2) {
                    if (isTarget && step.action === 'check_edge') {
                        return {
                            ...baseObj,
                            style: { ...activeEdge },
                            markerEnd: curActiveMarker,
                            animated: false,
                        };
                    }

                    return {
                        ...baseObj,
                        style: { ...baseEdge },
                        markerEnd: curBaseMarker || baseMarker,
                        animated: false,
                    };
                } else {
                    // Phase 1: DFS on G
                    if (isTarget && step.action === 'check_edge') {
                        return {
                            ...baseObj,
                            style: { ...activeEdge },
                            markerEnd: curActiveMarker,
                            animated: false,
                        };
                    }

                    return {
                        ...baseObj,
                        style: { ...baseEdge },
                        markerEnd: curBaseMarker || baseMarker,
                        animated: false,
                    };
                }
            }));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. TARJAN (Strongly Connected Components)
        // ═════════════════════════════════════════════════════════════════════
        if (algName === 'Tarjan') {
            if (step.scc_colors) setSccColors(step.scc_colors);
            if (step.scc_list) setSccList(step.scc_list);
            if (step.tarjan_stack !== undefined) setDsState([...step.tarjan_stack]);
            if (step.node_states) Object.assign(ns, step.node_states);

            setNodes(prev => prev.map(n => {
                const assignedColor = step.scc_colors?.[n.id] || null;
                const assignedScc = (step.scc_list || []).find(s => s.members.includes(n.id));

                return {
                    ...n, data: {
                        ...n.data,
                        status: assignedColor ? 'scc-colored' : (ns[n.id] || 'white'),
                        isActive: n.id === (step.node || step.u),
                        sccColor: assignedColor,
                        sccId: assignedScc ? assignedScc.id : null,
                        tarjanIdx: step.indices ? (step.indices[n.id] ?? null) : n.data.tarjanIdx,
                        tarjanLow: step.lowlinks ? (step.lowlinks[n.id] ?? null) : n.data.tarjanLow,
                    },
                };
            }));

            setEdges(prev => prev.map(e => {
                const isTarget = (e.source === step.u && e.target === step.v);
                const baseObj = { ...e, label: undefined }; // Tarjan has no edge weight numbers

                if (isTarget && (step.action === 'check_edge' || step.action === 'back_edge')) {
                    return { ...baseObj, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
                }
                return { ...baseObj, style: { ...baseEdge }, markerEnd: curBaseMarker || baseMarker, animated: false };
            }));
            return;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. BFS / DFS
        // ═════════════════════════════════════════════════════════════════════
        if (['visit_node', 'init_source', 'discover_node', 'enqueue_node'].includes(step.action)) {
            ns[step.node] = 'gray';
        } else if (step.action === 'finish_node') {
            ns[step.node] = 'black';
        }

        let timestamps = {};
        if (step.timestamps) {
            timestamps = step.timestamps;
        } else if (algName === 'BFS' && step.distances) {
            for (const [key, val] of Object.entries(step.distances)) {
                timestamps[key] = { d: val != null ? val : null, f: null };
            }
        }

        let activeNode = null;
        if (['visit_node', 'init_source', 'finish_node'].includes(step.action)) activeNode = step.node;
        else if (step.action === 'backtrack') activeNode = step.node;
        else if (['check_edge', 'traverse_edge', 'skip_edge'].includes(step.action)) activeNode = step.u;
        else if (['discover_node', 'enqueue_node'].includes(step.action)) activeNode = step.node;

        setNodes(prev => prev.map(n => ({
            ...n, data: {
                ...n.data,
                status: ns[n.id] || 'white',
                isActive: n.id === activeNode,
                timestamp: timestamps[n.id] || null,
                isStart: algName !== 'Kruskal' && algName !== 'Prim' && algName !== 'FordFulkerson' && algName !== 'EdmondsKarp' && n.id === currentGraphRef.current.startNode,

            },
        })));

        setEdges(prev => prev.map(e => {
            const isTarget = isDir
                ? (e.source === step.u && e.target === step.v)
                : ((e.source === step.u && e.target === step.v) || (e.source === step.v && e.target === step.u));

            if (!isTarget) return e;

            // Never overwrite an already-accepted tree edge
            if (e.isTreeEdge) {
                return e;
            }

            if (step.action === 'check_edge') {
                return { ...e, style: { ...activeEdge }, markerEnd: curActiveMarker, animated: false };
            }

            if (step.action === 'traverse_edge') {
                return {
                    ...e,
                    isTreeEdge: true,
                    label: undefined,
                    style: { ...treeEdge },
                    markerEnd: curTreeMarker,
                    animated: false,
                };
            }

            if (step.action === 'skip_edge') {
                const edgeType = step.edge_type || 'back';
                let style = { ...backEdge };
                let marker = curBackMarker;

                if (edgeType === 'forward') {
                    style = { ...forwardEdge };
                    marker = curForwardMarker;
                } else if (edgeType === 'cross') {
                    style = { ...crossEdge };
                    marker = curCrossMarker;
                }

                return {
                    ...e,
                    label: undefined,
                    style,
                    markerEnd: marker,
                    animated: false,
                };
            }

            return e;
        }));

        if (step.queue_state) setDsState(step.queue_state);
        if (step.stack_state) setDsState(step.stack_state);
    };

    // ── Pause / Step control ─────────────────────────────────────────────
    const waitForResume = () => new Promise(resolve => { resolveStepRef.current = resolve; });

    const buildPayload = (algName) => {
        const { graphData, weightedGraph, edgeList, startNode, nodes: graphNodes, isDirected } = currentGraphRef.current;
        const isDir = Boolean(isDirected);

        switch (algName) {
            case 'BFS':
            case 'DFS':
                return { graph: graphData, start_node: startNode, is_directed: isDir };
            case 'Dijkstra':
                return { graph: weightedGraph, start_node: startNode };
            case 'FloydWarshall':
                return { graph: weightedGraph };
            case 'Kruskal':
                return { graph: graphData, edges: edgeList };
            case 'Prim':
                return { graph: graphData, edges: edgeList, start_node: startNode };
            case 'FordFulkerson':
            case 'EdmondsKarp': {
                const verts = (graphNodes || []).map(n => n.id);
                const source = currentGraphRef.current.sourceNode || (startNode && verts.includes(startNode) ? startNode : verts[0]);
                const sink = currentGraphRef.current.sinkNode || (() => {
                    const remaining = (graphNodes || []).filter(n => n.id !== source);
                    const sortedByX = [...remaining].sort((a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0));
                    return sortedByX[0]?.id || verts.filter(v => v !== source).pop() || verts[verts.length - 1];
                })();
                return {
                    vertices: verts,
                    edges: edgeList.map(e => ({ u: e.u, v: e.v, capacity: e.weight })),
                    source,
                    sink
                };
            }
            case 'Kosaraju':
            case 'Tarjan':
                return { graph: graphData };
            default:
                return { graph: graphData, start_node: startNode };
        }
    };

    const runAlgorithm = async (algName) => {
        setIsRunning(true); setIsPaused(false); setIsFinished(false);
        pauseRef.current = false; cancelledRef.current = false;
        nodeStatesRef.current = {}; activeAlgRef.current = algName;
        setCurrentStepIndex(-1); setActiveLine(null); setDsState([]);
        setTotalWeight(0); setDistMatrix(null); setNegativeCycleInfo(null); setActiveK(null); setActiveI(null); setActiveJ(null);
        setSccColors({}); setSccList([]); setPhase(1); setMaxFlow(null); setFlowInfo({});

        const { nodes: baseNodes, edges: baseEdges } = currentGraphRef.current;
        setNodes(JSON.parse(JSON.stringify(baseNodes)));
        setEdges(JSON.parse(JSON.stringify(baseEdges)));

        try {
            const endpoint = API_ENDPOINT[algName] || algName.toLowerCase();
            const response = await axios.post(`${API_BASE_URL}/api/${endpoint}`, buildPayload(algName));
            const steps = response.data.steps || [];
            stepsRef.current = steps;
            setTotalSteps(steps.length);

            for (let i = 0; i < steps.length; i++) {
                if (cancelledRef.current) break;
                stepIndexRef.current = i;
                if (pauseRef.current) {
                    setIsPaused(true);
                    await waitForResume();
                    setIsPaused(false);
                    if (cancelledRef.current) break;
                }
                applyStep(steps[i], algName);
                await sleep(SPEEDS[speedRef.current]);
            }
        } catch (error) {
            console.error('Algorithm execution failed:', error);
        } finally {
            if (!cancelledRef.current) setIsFinished(true);
            setIsRunning(false); setIsPaused(false); setActiveLine(null);
            const isDir = currentGraphRef.current.isDirected;
            const curBaseMarker = isDir ? baseMarker : undefined;
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isActive: false } })));
            setEdges(eds => eds.map(e => {
                if (e.style?.stroke === activeEdge.stroke) return { ...e, style: { ...baseEdge }, markerEnd: curBaseMarker, animated: false };
                return { ...e, animated: false };
            }));
        }
    };

    const togglePause = () => {
        if (pauseRef.current) {
            pauseRef.current = false;
            if (resolveStepRef.current) { resolveStepRef.current(); resolveStepRef.current = null; }
        } else {
            pauseRef.current = true;
        }
    };

    const stepForward = () => {
        if (pauseRef.current && resolveStepRef.current) {
            resolveStepRef.current(); resolveStepRef.current = null;
            pauseRef.current = true;
        }
    };

    // Step backward: replay from step 0 to stepIndex - 1
    const stepBackward = useCallback(() => {
        if (!pauseRef.current) return;
        const target = Math.max(0, stepIndexRef.current - 1);
        if (target === stepIndexRef.current) return;

        const algName = activeAlgRef.current;
        const { nodes: baseNodes, edges: baseEdges } = currentGraphRef.current;
        nodeStatesRef.current = {};
        setNodes(JSON.parse(JSON.stringify(baseNodes)));
        setEdges(JSON.parse(JSON.stringify(baseEdges)));
        setDistMatrix(null); setSccColors({}); setSccList([]); setMaxFlow(null); setFlowInfo({}); setDsState([]);

        for (let i = 0; i <= target; i++) {
            applyStep(stepsRef.current[i], algName);
        }
        stepIndexRef.current = target;
    }, []);

    const changeSpeed = (newSpeed) => {
        setSpeed(newSpeed);
        speedRef.current = newSpeed;
    };

    const resetGraph = () => {
        if (isRunning) {
            cancelledRef.current = true;
            if (resolveStepRef.current) { resolveStepRef.current(); resolveStepRef.current = null; }
        }
        const { nodes: baseNodes, edges: baseEdges } = currentGraphRef.current;
        setNodes(JSON.parse(JSON.stringify(baseNodes)));
        setEdges(JSON.parse(JSON.stringify(baseEdges)));
        setActiveLine(null); setDsState([]); setTotalWeight(0);
        setCurrentStepIndex(-1); setTotalSteps(0); setIsFinished(false);
        setDistMatrix(null); setNegativeCycleInfo(null); setActiveK(null); setActiveI(null); setActiveJ(null);
        setSccColors({}); setSccList([]); setPhase(1); setMaxFlow(null); setFlowInfo({});
        nodeStatesRef.current = {};
    };

    return {
        nodes, edges, isRunning, isPaused, isFinished,
        speed, activeLine, dsState, totalWeight,
        currentStepIndex, totalSteps,
        distMatrix, negativeCycleInfo, activeK, activeI, activeJ,
        sccColors, sccList, phase,
        maxFlow, flowInfo,
        isDirected: currentGraphRef.current.isDirected,
        onNodesChange, onEdgesChange,
        initializeGraph, runAlgorithm, resetGraph,
        togglePause, stepForward, stepBackward, changeSpeed,
    };
}