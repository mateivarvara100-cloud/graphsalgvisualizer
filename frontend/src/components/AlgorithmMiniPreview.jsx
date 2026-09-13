import React from 'react';

export default function AlgorithmMiniPreview({ algorithm }) {
    switch (algorithm) {
        case 'BFS':
            return (
                <div className="mini-preview-card bfs-preview">
                    <div className="mini-preview-badge">Breadth-First Search · Spanning Tree & Cross Edges</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* Cross Edges (dashed, non-tree graph edges) */}
                        <line x1="102" y1="28" x2="100" y2="92" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
                        <line x1="100" y1="92" x2="172" y2="28" stroke="#334155" strokeWidth="1.4" strokeDasharray="3 3" />
                        <line x1="172" y1="28" x2="174" y2="92" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
                        <line x1="174" y1="92" x2="238" y2="60" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />

                        {/* BFS Tree Edges (solid discovered paths) */}
                        <line x1="42" y1="60" x2="102" y2="28" stroke="#38bdf8" strokeWidth="2.8" />
                        <line x1="42" y1="60" x2="100" y2="92" stroke="#38bdf8" strokeWidth="2.8" />
                        <line x1="102" y1="28" x2="172" y2="28" stroke="#38bdf8" strokeWidth="2.8" />
                        <line x1="100" y1="92" x2="174" y2="92" stroke="#38bdf8" strokeWidth="2.8" />
                        <line x1="172" y1="28" x2="238" y2="60" stroke="#38bdf8" strokeWidth="2.8" />

                        {/* Start Node A */}
                        <circle cx="42" cy="60" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                        <text x="42" y="64" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">A</text>
                        <text x="42" y="40" fill="#f59e0b" fontSize="8" fontWeight="800" textAnchor="middle">Start</text>
                        <text x="42" y="81" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">1/4</text>

                        {/* Graph Nodes with d/f timestamps */}
                        <circle cx="102" cy="28" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="102" y="32" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">B</text>
                        <text x="102" y="12" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">2/7</text>

                        <circle cx="100" cy="92" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="100" y="96" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">C</text>
                        <text x="100" y="112" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">3/9</text>

                        <circle cx="172" cy="28" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="172" y="32" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">D</text>
                        <text x="172" y="12" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">5/10</text>

                        <circle cx="174" cy="92" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="174" y="96" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">E</text>
                        <text x="174" y="112" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">6/11</text>

                        <circle cx="238" cy="60" r="13" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                        <text x="238" y="64" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">F</text>
                        <text x="238" y="40" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">8/12</text>
                    </svg>

                    <div className="mini-preview-footer">
                        <span className="queue-chip">FIFO Queue</span>
                        <span className="queue-items">d/f timestamps · Spanning Tree & Cross Edges</span>
                    </div>
                </div>
            );

        case 'DFS':
            return (
                <div className="mini-preview-card dfs-preview">
                    <div className="mini-preview-badge">Deep Traversal & Backtracking</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* Tree path */}
                        <line x1="40" y1="35" x2="100" y2="35" stroke="#f59e0b" strokeWidth="3" />
                        <line x1="100" y1="35" x2="160" y2="70" stroke="#f59e0b" strokeWidth="3" />
                        <line x1="160" y1="70" x2="220" y2="70" stroke="#f59e0b" strokeWidth="3" />
                        {/* Back edge */}
                        <path d="M 220 70 C 200 110, 80 110, 40 35" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />

                        {/* Nodes with d/f timestamps */}
                        <circle cx="40" cy="35" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                        <text x="40" y="39" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">A</text>
                        <text x="40" y="16" fill="#38bdf8" fontSize="8.5" fontWeight="700" textAnchor="middle">1/8</text>

                        <circle cx="100" cy="35" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                        <text x="100" y="39" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">B</text>
                        <text x="100" y="16" fill="#38bdf8" fontSize="8.5" fontWeight="700" textAnchor="middle">2/7</text>

                        <circle cx="160" cy="70" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                        <text x="160" y="74" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">C</text>
                        <text x="160" y="96" fill="#38bdf8" fontSize="8.5" fontWeight="700" textAnchor="middle">3/6</text>

                        <circle cx="220" cy="70" r="13" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                        <text x="220" y="74" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">D</text>
                        <text x="220" y="96" fill="#38bdf8" fontSize="8.5" fontWeight="700" textAnchor="middle">4/5</text>
                    </svg>
                    <div className="mini-preview-footer">
                        <span className="queue-chip stack-chip">LIFO Stack</span>
                        <span className="queue-items">d/f timestamps · Back Edge Detection</span>
                    </div>
                </div>
            );

        case 'Dijkstra':
            return (
                <div className="mini-preview-card dijkstra-preview">
                    <div className="mini-preview-badge">Single-Source Shortest Paths (SPT)</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* Rejected Non-tree edge (E-F, w=6 rejected: 4+3=7 < 2+1+6=9) */}
                        <line x1="170" y1="60" x2="244" y2="90" stroke="#334155" strokeWidth="1.8" strokeDasharray="4 3" />
                        <rect x="202" y="69" width="16" height="11" rx="2.5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                        <text x="210" y="77.5" fill="#64748b" fontSize="7.5" fontWeight="700" textAnchor="middle">6</text>

                        {/* Shortest Path Tree (SPT) Edges in Green */}
                        {/* A -> C (w=2) */}
                        <line x1="36" y1="60" x2="98" y2="90" stroke="#10b981" strokeWidth="3" />
                        <rect x="59" y="80" width="16" height="11" rx="2.5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="67" y="88.5" fill="#6ee7b7" fontSize="7.5" fontWeight="800" textAnchor="middle">2</text>

                        {/* C -> F (w=1) - Clean horizontal line with clear weight badge */}
                        <line x1="98" y1="90" x2="244" y2="90" stroke="#10b981" strokeWidth="3" />
                        <rect x="162" y="84.5" width="16" height="11" rx="2.5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="170" y="93" fill="#6ee7b7" fontSize="7.5" fontWeight="800" textAnchor="middle">1</text>

                        {/* A -> B (w=4) */}
                        <line x1="36" y1="60" x2="98" y2="30" stroke="#10b981" strokeWidth="3" />
                        <rect x="59" y="30" width="16" height="11" rx="2.5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="67" y="38.5" fill="#6ee7b7" fontSize="7.5" fontWeight="800" textAnchor="middle">4</text>

                        {/* B -> D (w=5) */}
                        <line x1="98" y1="30" x2="168" y2="24" stroke="#10b981" strokeWidth="3" />
                        <rect x="125" y="15" width="16" height="11" rx="2.5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="133" y="23.5" fill="#6ee7b7" fontSize="7.5" fontWeight="800" textAnchor="middle">5</text>

                        {/* B -> E (w=3, relaxed to 4+3=7) */}
                        <line x1="98" y1="30" x2="170" y2="60" stroke="#10b981" strokeWidth="3" />
                        <rect x="126" y="47" width="16" height="11" rx="2.5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                        <text x="134" y="55.5" fill="#6ee7b7" fontSize="7.5" fontWeight="800" textAnchor="middle">3</text>

                        {/* Start Node A */}
                        <circle cx="36" cy="60" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                        <text x="36" y="64" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">A</text>
                        <text x="36" y="40" fill="#f59e0b" fontSize="8" fontWeight="800" textAnchor="middle">Start</text>
                        <text x="36" y="81" fill="#f59e0b" fontSize="8" fontWeight="800" textAnchor="middle">d:0</text>

                        {/* Node B */}
                        <circle cx="98" cy="30" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="98" y="34" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">B</text>
                        <text x="98" y="13" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">d:4</text>

                        {/* Node C */}
                        <circle cx="98" cy="90" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="98" y="94" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">C</text>
                        <text x="98" y="112" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">d:2</text>

                        {/* Node D */}
                        <circle cx="168" cy="24" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="168" y="28" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">D</text>
                        <text x="168" y="9" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">d:9</text>

                        {/* Node E */}
                        <circle cx="170" cy="60" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="170" y="64" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">E</text>
                        <text x="195" y="63" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">d:7</text>

                        {/* Node F */}
                        <circle cx="244" cy="90" r="13" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="244" y="94" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">F</text>
                        <text x="244" y="112" fill="#38bdf8" fontSize="8" fontWeight="800" textAnchor="middle">d:3</text>
                    </svg>

                    <div className="mini-preview-footer">
                        <span className="queue-chip pq-chip">Min-Priority Queue</span>
                        <span className="queue-items">Shortest Path Tree (SPT) · Relaxation: d[v] = min(d[v], d[u] + w)</span>
                    </div>
                </div>
            );

        case 'FloydWarshall':
            return (
                <div className="mini-preview-card floyd-preview">
                    <div className="mini-preview-badge">All-Pairs Dynamic Programming</div>
                    <div className="mini-matrix-grid">
                        <div className="matrix-row header">
                            <span></span><span>A</span><span className="active-k">B (k)</span><span>C</span>
                        </div>
                        <div className="matrix-row">
                            <span className="row-hdr">A</span><span>0</span><span className="active-k">3</span><span className="highlight-cell">5</span>
                        </div>
                        <div className="matrix-row active-k-row">
                            <span className="row-hdr active-k">B (k)</span><span className="active-k">∞</span><span className="active-k">0</span><span className="active-k">2</span>
                        </div>
                        <div className="matrix-row">
                            <span className="row-hdr">C</span><span>4</span><span className="active-k">7</span><span>0</span>
                        </div>
                    </div>
                    <div className="mini-preview-footer">
                        <span className="queue-chip matrix-chip">Distance Matrix D^(k)</span>
                        <span className="queue-items">D[i,j] = min(D[i,j], D[i,k] + D[k,j])</span>
                    </div>
                </div>
            );

        case 'Kruskal':
        case 'Prim':
            return (
                <div className="mini-preview-card mst-preview">
                    <div className="mini-preview-badge">Minimum Spanning Tree (MST)</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* Non-MST edges */}
                        <line x1="50" y1="35" x2="140" y2="25" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="90" y1="90" x2="230" y2="85" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />

                        {/* MST Edges (glowing green) */}
                        <line x1="50" y1="35" x2="90" y2="90" stroke="#10b981" strokeWidth="3.5" />
                        <line x1="90" y1="90" x2="180" y2="55" stroke="#10b981" strokeWidth="3.5" />
                        <line x1="180" y1="55" x2="230" y2="85" stroke="#10b981" strokeWidth="3.5" />
                        <line x1="180" y1="55" x2="140" y2="25" stroke="#10b981" strokeWidth="3.5" />

                        {/* Edge weight badges */}
                        <rect x="58" y="58" width="16" height="12" rx="3" fill="#10b981" />
                        <text x="66" y="67" fill="#0f172a" fontSize="8.5" fontWeight="800" textAnchor="middle">1</text>

                        <rect x="126" y="68" width="16" height="12" rx="3" fill="#10b981" />
                        <text x="134" y="77" fill="#0f172a" fontSize="8.5" fontWeight="800" textAnchor="middle">2</text>

                        <rect x="200" y="65" width="16" height="12" rx="3" fill="#10b981" />
                        <text x="208" y="74" fill="#0f172a" fontSize="8.5" fontWeight="800" textAnchor="middle">3</text>

                        <rect x="152" y="34" width="16" height="12" rx="3" fill="#10b981" />
                        <text x="160" y="43" fill="#0f172a" fontSize="8.5" fontWeight="800" textAnchor="middle">4</text>

                        {/* Nodes */}
                        <circle cx="50" cy="35" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="50" y="39" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">A</text>

                        <circle cx="90" cy="90" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="90" y="94" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">B</text>

                        <circle cx="140" cy="25" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="140" y="29" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">C</text>

                        <circle cx="180" cy="55" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="180" y="59" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">D</text>

                        <circle cx="230" cy="85" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                        <text x="230" y="89" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">E</text>
                    </svg>
                    <div className="mini-preview-footer">
                        <span className="queue-chip mst-chip">{algorithm === 'Kruskal' ? 'Disjoint Sets (Union-Find)' : 'Priority Queue Cut'}</span>
                        <span className="queue-items">Total Weight: 10 · Acyclic Tree</span>
                    </div>
                </div>
            );

        case 'FordFulkerson':
        case 'EdmondsKarp':
            return (
                <div className="mini-preview-card flow-preview">
                    <div className="mini-preview-badge">Maximum Network Flow & Residual Graph</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* Flow edges */}
                        <line x1="45" y1="60" x2="120" y2="30" stroke="#8b5cf6" strokeWidth="3.5" />
                        <line x1="45" y1="60" x2="120" y2="90" stroke="#f43f5e" strokeWidth="3.5" />
                        <line x1="120" y1="30" x2="235" y2="60" stroke="#f43f5e" strokeWidth="3.5" />
                        <line x1="120" y1="90" x2="235" y2="60" stroke="#059669" strokeWidth="3" />

                        {/* Min-Cut Line separating S={s,B} and T={C,t} */}
                        <path
                            d="M 185 8 Q 130 60 75 112"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="5 3.5"
                        />
                        <rect x="170" y="3" width="46" height="13" rx="3" fill="#1e293b" stroke="#ef4444" strokeWidth="1" />
                        <text x="193" y="12.5" fill="#fca5a5" fontSize="7.5" fontWeight="800" textAnchor="middle">✂ Cut: 18</text>

                        {/* Partition labels */}
                        <text x="75" y="16" fill="#c4b5fd" fontSize="8" fontWeight="700">Set S</text>
                        <text x="200" y="105" fill="#fca5a5" fontSize="8" fontWeight="700">Set T</text>

                        {/* Flow / Capacity badges */}
                        <rect x="68" y="30" width="28" height="13" rx="3" fill="#1e293b" stroke="#7c3aed" />
                        <text x="82" y="40" fill="#c4b5fd" fontSize="8" fontWeight="700" textAnchor="middle">10/12</text>

                        <rect x="68" y="80" width="28" height="13" rx="3" fill="#1e293b" stroke="#f43f5e" />
                        <text x="82" y="90" fill="#fca5a5" fontSize="8" fontWeight="800" textAnchor="middle">8/8 ★</text>

                        <rect x="160" y="30" width="30" height="13" rx="3" fill="#1e293b" stroke="#f43f5e" />
                        <text x="175" y="40" fill="#fca5a5" fontSize="8" fontWeight="800" textAnchor="middle">10/10 ★</text>

                        <rect x="160" y="80" width="28" height="13" rx="3" fill="#1e293b" stroke="#059669" />
                        <text x="174" y="90" fill="#6ee7b7" fontSize="8" fontWeight="700" textAnchor="middle">8/8</text>

                        {/* Source (s) and Sink (t) */}
                        <circle cx="45" cy="60" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
                        <text x="45" y="64" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">s</text>
                        <text x="45" y="40" fill="#10b981" fontSize="9" fontWeight="800" textAnchor="middle">Source</text>

                        <circle cx="120" cy="30" r="12" fill="#0f172a" stroke="#8b5cf6" strokeWidth="2" />
                        <text x="120" y="34" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">B</text>

                        <circle cx="120" cy="90" r="12" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                        <text x="120" y="94" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">C</text>

                        <circle cx="235" cy="60" r="14" fill="#0f172a" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="235" y="64" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">t</text>
                        <text x="235" y="40" fill="#ef4444" fontSize="9" fontWeight="800" textAnchor="middle">Sink</text>
                    </svg>
                    <div className="mini-preview-footer">
                        <span className="queue-chip flow-chip">Augmenting Paths</span>
                        <span className="queue-items">Max-Flow = Min-Cut = 18</span>
                    </div>
                </div>
            );

        case 'Kosaraju':
        case 'Tarjan':
        default:
            return (
                <div className="mini-preview-card scc-preview">
                    <div className="mini-preview-badge">Strongly Connected Components (SCC)</div>
                    <svg viewBox="0 0 280 120" className="mini-preview-svg">
                        {/* SCC 1 Hull */}
                        <rect x="25" y="20" width="105" height="80" rx="14" fill="rgba(139, 92, 246, 0.12)" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x="77" y="15" fill="#a78bfa" fontSize="9" fontWeight="700" textAnchor="middle">Component #1</text>

                        {/* SCC 2 Hull */}
                        <rect x="150" y="20" width="105" height="80" rx="14" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x="202" y="15" fill="#6ee7b7" fontSize="9" fontWeight="700" textAnchor="middle">Component #2</text>

                        {/* SCC 1 internal cycle */}
                        <line x1="50" y1="45" x2="105" y2="45" stroke="#8b5cf6" strokeWidth="2" />
                        <line x1="105" y1="45" x2="77" y2="82" stroke="#8b5cf6" strokeWidth="2" />
                        <line x1="77" y1="82" x2="50" y2="45" stroke="#8b5cf6" strokeWidth="2" />

                        {/* Bridge between SCCs */}
                        <line x1="105" y1="45" x2="175" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />

                        {/* SCC 2 internal cycle */}
                        <line x1="175" y1="45" x2="230" y2="45" stroke="#10b981" strokeWidth="2" />
                        <line x1="230" y1="45" x2="202" y2="82" stroke="#10b981" strokeWidth="2" />
                        <line x1="202" y1="82" x2="175" y2="45" stroke="#10b981" strokeWidth="2" />

                        {/* Nodes */}
                        <circle cx="50" cy="45" r="10" fill="#8b5cf6" />
                        <text x="50" y="48.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">A</text>
                        <circle cx="105" cy="45" r="10" fill="#8b5cf6" />
                        <text x="105" y="48.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">B</text>
                        <circle cx="77" cy="82" r="10" fill="#8b5cf6" />
                        <text x="77" y="85.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">C</text>

                        <circle cx="175" cy="45" r="10" fill="#10b981" />
                        <text x="175" y="48.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">D</text>
                        <circle cx="230" cy="45" r="10" fill="#10b981" />
                        <text x="230" y="48.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">E</text>
                        <circle cx="202" cy="82" r="10" fill="#10b981" />
                        <text x="202" y="85.5" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">F</text>
                    </svg>
                    <div className="mini-preview-footer">
                        <span className="queue-chip scc-chip">{algorithm === 'Kosaraju' ? 'DFS on G and Gᵀ' : 'Low-Link & Tarjan Stack'}</span>
                        <span className="queue-items">Maximal Connected Subgraphs</span>
                    </div>
                </div>
            );
    }
}
