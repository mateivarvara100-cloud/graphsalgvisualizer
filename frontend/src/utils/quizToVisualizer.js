/**
 * quizToVisualizer.js
 * Converts a static quiz graph specification into a dynamic ReactFlow graph payload
 * compatible with useAlgorithm / initializeGraph and backend Python solvers.
 */

export function convertQuizGraphToPayload(quizGraph, algorithmName) {
    if (!quizGraph || !quizGraph.nodes || quizGraph.nodes.length === 0) {
        return null;
    }

    const isDir = Boolean(quizGraph.directed ?? true);
    const isFlow = algorithmName === 'FordFulkerson' || algorithmName === 'EdmondsKarp';
    const isWeighted = Boolean(
        quizGraph.isWeighted ??
        ['Dijkstra', 'FloydWarshall', 'Kruskal', 'Prim', 'FordFulkerson', 'EdmondsKarp'].includes(algorithmName)
    );

    // Identify start, source, and sink nodes
    const startNode = quizGraph.nodes.find(n => n.role === 'start' || n.isStart)?.id 
        || (isFlow ? (quizGraph.nodes.find(n => n.role === 'source')?.id || 's') : quizGraph.nodes[0]?.id);
    const sourceNode = isFlow ? (quizGraph.nodes.find(n => n.role === 'source')?.id || 's') : null;
    const sinkNode = isFlow ? (quizGraph.nodes.find(n => n.role === 'sink')?.id || 't') : null;

    // ReactFlow nodes with AcademicNode data
    const rfNodes = quizGraph.nodes.map(n => ({
        id: n.id,
        position: {
            x: Math.round((n.x ?? 100) * 1.35 + 80),
            y: Math.round((n.y ?? 100) * 1.35 + 50)
        },
        data: {
            label: n.label || n.id,
            isStart: !isFlow && (n.id === startNode),
            isSource: isFlow && (n.id === sourceNode),
            isSink: isFlow && (n.id === sinkNode),
            status: 'white',
            isActive: false,
        },
        type: 'academic'
    }));

    // ReactFlow edges with FloatingEdge compatibility
    const rfEdges = (quizGraph.edges || []).map((e, idx) => {
        const val = e.weight !== undefined 
            ? Number(e.weight) 
            : (e.capacity !== undefined ? Number(e.capacity) : 1);
        const label = isWeighted ? String(val) : undefined;
        return {
            id: `e-${e.source}-${e.target}-${idx}`,
            source: e.source,
            target: e.target,
            origSource: e.source,
            origTarget: e.target,
            weight: val,
            capacity: e.capacity !== undefined ? Number(e.capacity) : undefined,
            label,
            labelStyle: isWeighted ? { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' } : undefined,
            labelBgStyle: isWeighted ? { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 } : undefined,
            labelBgPadding: isWeighted ? [6, 4] : undefined,
            labelBgBorderRadius: isWeighted ? 6 : undefined,
            type: 'straight'
        };
    });

    // Build adjacency list (graphData) and weightedGraph for backend Python endpoints
    const adj = {};
    const weightedGraph = {};
    quizGraph.nodes.forEach(n => {
        adj[n.id] = [];
        weightedGraph[n.id] = {};
    });

    (quizGraph.edges || []).forEach(e => {
        const val = Number(e.weight ?? e.capacity ?? 1);
        if (adj[e.source] && !adj[e.source].includes(e.target)) {
            adj[e.source].push(e.target);
        }
        if (weightedGraph[e.source]) {
            weightedGraph[e.source][e.target] = val;
        }

        if (!isDir) {
            if (adj[e.target] && !adj[e.target].includes(e.source)) {
                adj[e.target].push(e.source);
            }
            if (weightedGraph[e.target]) {
                weightedGraph[e.target][e.source] = val;
            }
        }
    });

    Object.keys(adj).forEach(k => adj[k].sort());

    const edgeList = rfEdges.map(e => ({
        u: e.source,
        v: e.target,
        source: e.source,
        target: e.target,
        weight: Number(e.weight ?? 1)
    }));

    return {
        nodes: rfNodes,
        edges: rfEdges,
        startNode,
        sourceNode,
        sinkNode,
        isDirected: isDir,
        isWeighted,
        graphData: adj,
        weightedGraph,
        edgeList
    };
}
