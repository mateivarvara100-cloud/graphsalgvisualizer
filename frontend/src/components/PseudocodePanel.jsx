import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Pseudocode definitions ───────────────────────────────────────────────

const BFS_PSEUDOCODE = [
    { line: 0, text: 'BFS(G, s):', isHeader: true },
    { line: 1, text: 'for each u ∈ G.V − {s}' },
    { line: 2, text: '    u.color = WHITE' },
    { line: 2, text: '     u.d = ∞' },
    { line: 3, text: '     u.π = NIL' },
    { line: 4, text: 's.color = GRAY' },
    { line: 5, text: 's.d = 0' },
    { line: 6, text: 's.π = NIL' },
    { line: 7, text: 'Q = ∅ //regular queue' },
    { line: 8, text: 'Enqueue(Q,s)' },
    { line: 9, text: 'while Q ≠ ∅' },
    { line: 10, text: '    u = Dequeue(Q)' },
    { line: 11, text: '    for each v ∈ G.Adj[u]' },
    { line: 12, text: '        if v.color == WHITE: //Tree edge' },
    { line: 13, text: '            v.color = GRAY' },
    { line: 14, text: '            v.d = u.d + 1' },
    { line: 15, text: '            v.π = u' },
    { line: 16, text: '            Enqueue(Q, v)' },
    { line: 17, text: '        else if v on ancestor path: //Back edge' },
    { line: 18, text: '            //v is ancestor of u' },
    { line: 19, text: '            //directed BFS only' },
    { line: 20, text: '        else:   //Cross edge' },
    { line: 21, text: '            //same or adjacent level' },
    { line: 22, text: '            //(no Forward edges in BFS)' },
    { line: 23, text: '    u.color = BLACK' },
    { line: 24, text: ' time = time + 1' },
    { line: 25, text: ' u.f = time' }
];

const DFS_PSEUDOCODE = [
    { line: 0, text: 'DFS(G):', isHeader: true },
    { line: 1, text: 'for each vertex u ∈ G.V' },
    { line: 2, text: '    u.color = WHITE' },
    { line: 3, text: '    u.d = NIL' },
    { line: 4, text: '    u.π = NIL' },
    { line: 5, text: 'time = 0' },
    { line: 6, text: 'for each vertex u ∈ G.V' },
    { line: 7, text: '    if u.color == WHITE' },
    { line: 8, text: '        DFS-Visit(G, u)' },
    { line: 0, text: '', isSpacer: true },
    { line: 0, text: 'DFS-Visit(G, u):', isHeader: true },
    { line: 9, displayLine: 1, text: 'time = time + 1' },
    { line: 10, displayLine: 2, text: 'u.d = time' },
    { line: 11, displayLine: 3, text: 'u.color = GRAY' },
    { line: 12, displayLine: 4, text: 'for each v ∈ G.Adj[u]' },
    { line: 13, displayLine: 5, text: '    if v.color == WHITE: //Tree edge' },
    { line: 14, displayLine: 6, text: '        v.π = u' },
    { line: 15, displayLine: 7, text: '        DFS-Visit(G, v)' },
    { line: 16, displayLine: 8, text: '    else if v.color == GRAY: //Back edge' },
    { line: 17, displayLine: 9, text: '        //v.d < u.d < u.f < v.f (or self-loop)' },
    { line: 18, displayLine: 10, text: '    else if u.d < v.d: //Forward edge' },
    { line: 19, displayLine: 11, text: '        // u.d < v.d < v.f < u.f' },
    { line: 20, displayLine: 12, text: '    else: //Cross edge' },
    { line: 21, displayLine: 13, text: '        // v.d < v.f < u.d < u.f' },
    { line: 22, displayLine: 14, text: 'u.color = BLACK' },
    { line: 23, displayLine: 15, text: 'time = time + 1' },
    { line: 24, displayLine: 16, text: 'u.f = time' },
];

const DIJKSTRA_PSEUDOCODE = [
    { line: 0, text: 'DIJKSTRA(G, w, s)', isHeader: true },
    { line: 1, displayLine: 1, text: 'INITIALIZE-SINGLE-SOURCE(G, s)' },
    { line: 2, displayLine: 2, text: 'S = ∅' },
    { line: 3, displayLine: 3, text: 'Q = G.V' },
    { line: 4, displayLine: 4, text: 'while Q ≠ ∅' },
    { line: 5, displayLine: 5, text: '    u = EXTRACT-MIN(Q)' },
    { line: 6, displayLine: 6, text: '    S = S ∪ {u}' },
    { line: 7, displayLine: 7, text: '    for each vertex v ∈ G.Adj[u]' },
    { line: 8, displayLine: 8, text: '        RELAX(u, v, w)' },
    { line: 0, text: '', isSpacer: true },
    { line: 0, text: 'RELAX(u, v, w)', isHeader: true },
    { line: 9, displayLine: 1, text: 'if v.d > u.d + w(u, v)' },
    { line: 10, displayLine: 2, text: '    v.d = u.d + w(u, v)' },
    { line: 11, displayLine: 3, text: '    v.π = u' },
];

const FLOYD_PSEUDOCODE = [
    { line: 0, text: 'Floyd-Warshall(W):', isHeader: true },
    { line: 1, text: 'D = W  // initialise distance matrix' },
    { line: 2, text: 'for k = 1 to n' },
    { line: 3, text: '    for i = 1 to n' },
    { line: 4, text: '        for j = 1 to n' },
    { line: 5, text: '            if D[i][k] + D[k][j] < D[i][j]' },
    { line: 6, text: '                D[i][j] = D[i][k] + D[k][j]' },
    { line: 7, text: 'return D' },
];

const KRUSKAL_PSEUDOCODE = [
    { line: 0, text: 'MST-Kruskal(G, w):', isHeader: true },
    { line: 1, text: 'A = ∅' },
    { line: 2, text: 'for each vertex v ∈ G.V' },
    { line: 3, text: '    Make-Set(v)' },
    { line: 4, text: 'sort the edges G.E by nondecreasing weight w' },
    { line: 5, text: 'for each edge (u, v) ∈ G.E  //sorted order' },
    { line: 6, text: '    if Find-Set(u) ≠ Find-Set(v)' },
    { line: 7, text: '        A = A ∪ {(u, v)}' },
    { line: 8, text: '        Union(u, v)' },
    { line: 9, text: 'return A' },
];

const PRIM_PSEUDOCODE = [
    { line: 0, text: 'MST-Prim(G, w, r):', isHeader: true },
    { line: 1, text: 'for each u ∈ G.V' },
    { line: 2, text: '    u.key = ∞' },
    { line: 3, text: '    u.π = NIL' },
    { line: 4, text: 'r.key = 0' },
    { line: 5, text: 'Q = G.V  //min-priority queue' },
    { line: 6, text: 'while Q ≠ ∅' },
    { line: 7, text: '    u = Extract-Min(Q)' },
    { line: 8, text: '    for each v ∈ G.Adj[u]' },
    { line: 9, text: '        if v ∈ Q and w(u,v) < v.key' },
    { line: 10, text: '            v.π = u' },
    { line: 11, text: '            v.key = w(u, v)' },
];

const FORD_PSEUDOCODE = [
    { line: 0, text: 'Ford-Fulkerson-Method(G, s, t):', isHeader: true },
    { line: 1, text: 'for each edge (u, v) ∈ G.E' },
    { line: 2, text: '    f(u, v) = 0  //zero flow on each edge' },
    { line: 3, text: 'while ∃ path p: s ⇝ t in G_f' },
    { line: 4, text: '    Find p via DFS in residual graph G_f' },
    { line: 5, text: '    c_f(p) = min{ c_f(u,v) | (u,v) ∈ p }' },
    { line: 6, text: '    bottleneck = c_f(p)' },
    { line: 7, text: '    for each (u, v) ∈ p' },
    { line: 7, text: '        f(u, v) = f(u, v) + c_f(p)' },
    { line: 7, text: '        f(v, u) = f(v, u) − c_f(p)' },
    { line: 8, text: 'return f  //max-flow = Σ f(s, v) for v ∈ Adj[s]' },
];

const EK_PSEUDOCODE = [
    { line: 0, text: 'Edmonds-Karp(G, s, t):', isHeader: true },
    { line: 1, text: 'Initialise flow f = 0 on all edges' },
    { line: 2, text: 'Initialise residual graph G_f' },
    { line: 3, text: 'while ∃ augmenting path p: s → t in G_f' },
    { line: 4, text: '    Find p via BFS (shortest path in G_f)' },
    { line: 5, text: '    c_f(p) = min{ c_f(u,v) | (u,v) ∈ p }' },
    { line: 6, text: '    bottleneck = c_f(p)' },
    { line: 7, text: '    for each (u, v) ∈ p' },
    { line: 7, text: '        f(u, v) += bottleneck' },
    { line: 7, text: '        f(v, u) -= bottleneck  //reverse' },
    { line: 8, text: 'return max_flow = Σ f(s, v)  for v ∈ G.Adj[s]' },
];

const KOSARAJU_PSEUDOCODE = [
    { line: 0, text: 'Kosaraju-SCC(G):', isHeader: true },
    { line: 1, text: 'Call DFS(G) to compute finish times u.f' },
    { line: 2, text: 'for each u ∈ G.V' },
    { line: 3, text: '    if u.color == WHITE' },
    { line: 4, text: '        DFS-Visit(G, u)' },
    { line: 5, text: '        push u onto finish stack' },
    { line: 0, text: '', isSpacer: true },
    { line: 6, text: 'Compute G^T  (transpose / reverse all edges)' },
    { line: 0, text: '', isSpacer: true },
    { line: 7, text: 'for each u from finish stack (pop order)' },
    { line: 8, text: '    if u not yet visited' },
    { line: 8, text: '        DFS-Visit(G^T, u)  → new SCC' },
    { line: 9, text: '        output vertices in this DFS tree as 1 SCC' },
];

const TARJAN_PSEUDOCODE = [
    { line: 0, text: 'TARJAN(G)', isHeader: true },
    { line: 1, displayLine: 1, text: 'global index = 0' },
    { line: 2, displayLine: 2, text: 'global S = NULL //stack' },
    { line: 3, displayLine: 3, text: 'global nrComponents = 0' },
    { line: 4, displayLine: 4, text: 'for each vertex u ∈ G.V' },
    { line: 5, displayLine: 5, text: '    u.index = u.lowLink = -1' },
    { line: 6, displayLine: 6, text: '    u.onStack = FALSE' },
    { line: 7, displayLine: 7, text: '    u.comp = 0' },
    { line: 8, displayLine: 8, text: 'for each vertex u ∈ G.V' },
    { line: 9, displayLine: 9, text: '    if u.index == -1' },
    { line: 10, displayLine: 10, text: '        STRONG-CONNECT(G, u)' },
    { line: 0, text: '', isSpacer: true },
    { line: 0, text: 'STRONG-CONNECT(G, u)', isHeader: true },
    { line: 11, displayLine: 1, text: 'u.index = u.lowLink = index' },
    { line: 12, displayLine: 2, text: 'index = index + 1' },
    { line: 13, displayLine: 3, text: 'Push(S, u)' },
    { line: 14, displayLine: 4, text: 'u.onStack = TRUE' },
    { line: 15, displayLine: 5, text: 'for each v ∈ G.Adj[u]' },
    { line: 16, displayLine: 6, text: '    if v.index == -1' },
    { line: 17, displayLine: 7, text: '        STRONG-CONNECT(G, v)' },
    { line: 18, displayLine: 8, text: '        u.lowLink = min(u.lowLink, v.lowLink)' },
    { line: 19, displayLine: 9, text: '    elseif v.onStack' },
    { line: 20, displayLine: 10, text: '        u.lowLink = min(u.lowLink, v.index)' },
    { line: 21, displayLine: 11, text: 'if u.lowLink == u.index' },
    { line: 22, displayLine: 12, text: '    nrComponents = nrComponents + 1' },
    { line: 23, displayLine: 13, text: '    repeat' },
    { line: 24, displayLine: 14, text: '        v = POP(S)' },
    { line: 25, displayLine: 15, text: '        v.onStack = FALSE' },
    { line: 26, displayLine: 16, text: '        v.comp = nrComponents' },
    { line: 27, displayLine: 17, text: '    until v == u' },
];

const PSEUDOCODES = {
    BFS: { lines: BFS_PSEUDOCODE, title: 'BFS(G, s)' },
    DFS: { lines: DFS_PSEUDOCODE, title: 'DFS(G)' },
    Dijkstra: { lines: DIJKSTRA_PSEUDOCODE, title: 'DIJKSTRA(G, w, s)' },
    FloydWarshall: { lines: FLOYD_PSEUDOCODE, title: 'Floyd-Warshall(W)' },
    Kruskal: { lines: KRUSKAL_PSEUDOCODE, title: 'MST-Kruskal(G, w)' },
    Prim: { lines: PRIM_PSEUDOCODE, title: 'MST-Prim(G, w, r)' },
    FordFulkerson: { lines: FORD_PSEUDOCODE, title: 'Ford-Fulkerson-Method(G, s, t)' },
    EdmondsKarp: { lines: EK_PSEUDOCODE, title: 'Edmonds-Karp(G, s, t)' },
    Kosaraju: { lines: KOSARAJU_PSEUDOCODE, title: 'Kosaraju-SCC(G)' },
    Tarjan: { lines: TARJAN_PSEUDOCODE, title: 'TARJAN(G)' },
};

export default function PseudocodePanel({ algorithm, activeLine }) {
    const { lines, title } = PSEUDOCODES[algorithm] || PSEUDOCODES.BFS;
    const activeRef = useRef(null);
    const bodyRef = useRef(null);

    // Auto-scroll to active line
    useEffect(() => {
        if (activeRef.current && bodyRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeLine]);

    return (
        <div className="pseudocode-panel">
            <div className="pseudocode-header">
                <span className="pseudocode-icon">{'</>'}</span>
                <span>{title}</span>
            </div>
            <div className="pseudocode-body" ref={bodyRef}>
                {lines.map((entry, idx) => {
                    if (entry.isSpacer) return <div key={idx} className="pseudocode-spacer" />;
                    const isActive = (Array.isArray(activeLine) ? activeLine.includes(entry.line) : entry.line === activeLine) && !entry.isHeader && entry.line !== 0;
                    return (
                        <div
                            key={idx}
                            ref={isActive ? activeRef : null}
                            className={`pseudocode-line ${isActive ? 'active' : ''} ${entry.isHeader ? 'header' : ''}`}
                        >
                            {!entry.isHeader && (
                                <span className="line-number">{entry.displayLine !== undefined ? entry.displayLine : entry.line}</span>
                            )}
                            <span className="line-text">{entry.text}</span>
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        className="line-highlight"
                                        layoutId="highlight"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
