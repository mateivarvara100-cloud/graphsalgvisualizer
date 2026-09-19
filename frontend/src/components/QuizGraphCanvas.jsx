import React from 'react';

export default function QuizGraphCanvas({ graph, mini = false }) {
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
        return null;
    }

    const { nodes, edges = [], directed = false, isWeighted = false } = graph;

    // Node radius matching visualizer proportions (50px diameter node)
    const R = mini ? 16 : 25;
    const padding = mini ? 36 : 64;

    // Helper for point to line segment distance
    function distToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l2 = dx * dx + dy * dy;
        if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), t: 0 };
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return { dist: Math.hypot(px - projX, py - projY), t };
    }

    // Helper for quadratic bezier point
    function getBezierPt(p0, p1, p2, t) {
        const mt = 1 - t;
        return {
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        };
    }

    // Map for fast node lookup
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Set of directed edge keys to detect reverse pairs for curving
    const edgeKeySet = new Set();
    edges.forEach(e => {
        edgeKeySet.add(`${e.source}->${e.target}`);
    });

    // Pre-calculate paths and check for obstacle node penetrations
    const edgePaths = edges.map((edge, idx) => {
        const u = nodeMap[edge.source];
        const v = nodeMap[edge.target];
        if (!u || !v) return null;

        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        const hasReverse = directed && edgeKeySet.has(`${edge.target}->${edge.source}`);

        // Check if a straight edge would penetrate an intermediate node
        let obstacle = null;
        let minObsDist = Infinity;
        if (!hasReverse) {
            for (const otherNode of nodes) {
                if (otherNode.id === edge.source || otherNode.id === edge.target) continue;
                const { dist: d, t } = distToSegment(otherNode.x, otherNode.y, u.x, u.y, v.x, v.y);
                // Node radius is R; if closer than R + 12px, it's colliding/touching
                if (t > 0.08 && t < 0.92 && d < R + 12) {
                    if (d < minObsDist) {
                        minObsDist = d;
                        obstacle = { node: otherNode, dist: d, t };
                    }
                }
            }
        }

        // Effective target radius: directly at node border so arrow tip seamlessly touches the node perimeter
        const effTargetR = R;

        if (hasReverse) {
            // Curve slightly to the right for reverse edges
            const px = ny;
            const py = -nx;
            const curveOffset = Math.max(24, Math.min(38, dist * 0.22));
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2;
            const ctrl = { x: midX + px * curveOffset, y: midY + py * curveOffset };

            const toCtrlSx = ctrl.x - u.x;
            const toCtrlSy = ctrl.y - u.y;
            const distCtrlS = Math.hypot(toCtrlSx, toCtrlSy) || 1;
            const s = { x: u.x + (toCtrlSx / distCtrlS) * R, y: u.y + (toCtrlSy / distCtrlS) * R };

            const fromCtrlTx = v.x - ctrl.x;
            const fromCtrlTy = v.y - ctrl.y;
            const distCtrlT = Math.hypot(fromCtrlTx, fromCtrlTy) || 1;
            const t = { x: v.x - (fromCtrlTx / distCtrlT) * effTargetR, y: v.y - (fromCtrlTy / distCtrlT) * effTargetR };

            return {
                edge,
                idx,
                type: 'bezier',
                s,
                ctrl,
                t,
                pathData: `M ${s.x} ${s.y} Q ${ctrl.x} ${ctrl.y} ${t.x} ${t.y}`,
                labelT: 0.5
            };
        } else if (obstacle) {
            // Curve away from the obstacle node to clear it cleanly
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2;
            const p1x = ny;
            const p1y = -nx;
            const p2x = -ny;
            const p2y = nx;
            const toOx = obstacle.node.x - midX;
            const toOy = obstacle.node.y - midY;
            const dot = toOx * p1x + toOy * p1y;

            // Choose direction away from obstacle
            let chosenPx = dot > 0 ? p2x : p1x;
            let chosenPy = dot > 0 ? p2y : p1y;

            // If perfectly collinear, curve upwards (or leftwards if vertical)
            if (Math.abs(dot) < 1e-4) {
                if (Math.abs(dx) >= Math.abs(dy)) {
                    chosenPx = 0;
                    chosenPy = -1; // Arch upwards
                } else {
                    chosenPx = -1;
                    chosenPy = 0; // Arch leftwards
                }
            }

            const curveOffset = Math.max(56, Math.min(95, dist * 0.28));
            const ctrl = { x: midX + chosenPx * curveOffset, y: midY + chosenPy * curveOffset };

            const toCtrlSx = ctrl.x - u.x;
            const toCtrlSy = ctrl.y - u.y;
            const distCtrlS = Math.hypot(toCtrlSx, toCtrlSy) || 1;
            const s = { x: u.x + (toCtrlSx / distCtrlS) * R, y: u.y + (toCtrlSy / distCtrlS) * R };

            const fromCtrlTx = v.x - ctrl.x;
            const fromCtrlTy = v.y - ctrl.y;
            const distCtrlT = Math.hypot(fromCtrlTx, fromCtrlTy) || 1;
            const t = { x: v.x - (fromCtrlTx / distCtrlT) * effTargetR, y: v.y - (fromCtrlTy / distCtrlT) * effTargetR };

            return {
                edge,
                idx,
                type: 'bezier',
                s,
                ctrl,
                t,
                pathData: `M ${s.x} ${s.y} Q ${ctrl.x} ${ctrl.y} ${t.x} ${t.y}`,
                labelT: 0.5
            };
        } else {
            // Straight edge
            const s = { x: u.x + nx * R, y: u.y + ny * R };
            const t = { x: v.x - nx * effTargetR, y: v.y - ny * effTargetR };

            return {
                edge,
                idx,
                type: 'line',
                s,
                t,
                pathData: `M ${s.x} ${s.y} L ${t.x} ${t.y}`,
                labelT: 0.5
            };
        }
    });

    // Helper to evaluate label position on edge at parameter t
    function getPointOnEdge(edgePath, t) {
        if (!edgePath) return { x: 0, y: 0 };
        if (edgePath.type === 'bezier') {
            return getBezierPt(edgePath.s, edgePath.ctrl, edgePath.t, t);
        }
        return {
            x: (1 - t) * edgePath.s.x + t * edgePath.t.x,
            y: (1 - t) * edgePath.s.y + t * edgePath.t.y
        };
    }

    // Label anti-collision: detect crossing edges whose label midpoints collide, and stagger them
    const validPaths = edgePaths.filter(p => p !== null);
    for (let i = 0; i < validPaths.length; i++) {
        for (let j = i + 1; j < validPaths.length; j++) {
            const p1 = validPaths[i];
            const p2 = validPaths[j];
            const e1 = p1.edge;
            const e2 = p2.edge;
            const hasL1 = e1.weight !== undefined || e1.capacity !== undefined || e1.label !== undefined;
            const hasL2 = e2.weight !== undefined || e2.capacity !== undefined || e2.label !== undefined;
            if (!hasL1 || !hasL2) continue;

            const pos1 = getPointOnEdge(p1, p1.labelT);
            const pos2 = getPointOnEdge(p2, p2.labelT);
            const dist = Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);

            if (dist < 38) {
                // Shift labels away from intersection along their respective paths
                if (p1.labelT === 0.5 && p2.labelT === 0.5) {
                    p1.labelT = 0.32;
                    p2.labelT = 0.68;
                } else if (p1.labelT === 0.5) {
                    p1.labelT = p2.labelT > 0.5 ? 0.32 : 0.68;
                } else if (p2.labelT === 0.5) {
                    p2.labelT = p1.labelT < 0.5 ? 0.68 : 0.32;
                }
            }
        }
    }

    // Expand bounding box if control points exist beyond node bounds
    const allXs = [...nodes.map(n => n.x)];
    const allYs = [...nodes.map(n => n.y)];
    validPaths.forEach(p => {
        if (p.ctrl) {
            allXs.push(p.ctrl.x);
            allYs.push(p.ctrl.y);
        }
    });
    const minX = Math.min(...allXs);
    const maxX = Math.max(...allXs);
    const minY = Math.min(...allYs);
    const maxY = Math.max(...allYs);

    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbW = Math.max(mini ? 300 : 540, maxX - minX + padding * 2);
    const vbH = Math.max(mini ? 160 : 300, maxY - minY + padding * 2);

    return (
        <div className={`quiz-graph-card ${mini ? 'mini-card' : ''}`}>
            <div className="quiz-graph-header">
                <div className="graph-tag-group">
                    <span className="graph-chip">
                        {directed ? '➔ Directed Graph' : '⬡ Undirected Graph'}
                    </span>
                    {isWeighted && (
                        <span className="graph-chip chip-weighted">⚖️ Weighted</span>
                    )}
                </div>
                <span className="graph-stats-hint">
                    {nodes.length} vertices · {edges.length} edges
                </span>
            </div>

            <div className="quiz-graph-svg-wrapper">
                <svg
                    viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                    className="quiz-graph-svg"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {/* Node Drop Shadow matching AcademicNode */}
                        <filter id="quiz-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.09" />
                        </filter>

                        {/* Edge Pill Shadow */}
                        <filter id="quiz-pill-shadow" x="-25%" y="-25%" width="150%" height="150%">
                            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.08" />
                        </filter>

                        {/* Standard Directed Arrowhead Marker (visualizer style: touches node perimeter) */}
                        <marker
                            id="quiz-arrow"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="7.5"
                            markerHeight="7.5"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
                        </marker>
                    </defs>

                    {/* Clean White Canvas Background */}
                    <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#ffffff" />

                    {/* ── Edges ── */}
                    {validPaths.map((pInfo) => {
                        const { edge, idx, pathData, labelT } = pInfo;
                        const labelPos = getPointOnEdge(pInfo, labelT);

                        const weightLabel = edge.weight !== undefined
                            ? (edge.capacity !== undefined ? `${edge.weight}/${edge.capacity}` : `${edge.weight}`)
                            : (edge.label || (edge.capacity !== undefined ? `${edge.capacity}` : null));

                        const labelStr = weightLabel != null ? String(weightLabel) : '';
                        const pillW = Math.max(26, labelStr.length * 9 + 16);
                        const pillH = 22;

                        return (
                            <g key={`edge-${idx}`} className="graph-edge-group">
                                <path
                                    d={pathData}
                                    stroke="#64748b"
                                    strokeWidth="2.4"
                                    fill="none"
                                    markerEnd={directed ? 'url(#quiz-arrow)' : undefined}
                                    className="graph-line"
                                />

                                {/* Clean White Weight / Capacity Pill */}
                                {labelStr && (
                                    <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                                        <rect
                                            x={-pillW / 2}
                                            y={-pillH / 2}
                                            width={pillW}
                                            height={pillH}
                                            rx="5"
                                            ry="5"
                                            fill="#ffffff"
                                            stroke="#cbd5e1"
                                            strokeWidth="1.6"
                                            filter="url(#quiz-pill-shadow)"
                                        />
                                        <text
                                            x="0"
                                            y="1"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#0f172a"
                                            fontSize={mini ? "10" : "12"}
                                            fontWeight="700"
                                            fontFamily="'JetBrains Mono', monospace"
                                        >
                                            {labelStr}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}


                    {/* ── Nodes (AcademicNode Replication, 50px Diameter) ── */}
                    {nodes.map((node) => {
                        const isStart = node.isStart || node.role === 'start';
                        const isSource = node.role === 'source';
                        const isSink = node.role === 'sink';
                        const isTarget = node.role === 'target';

                        return (
                            <g
                                key={`node-${node.id}`}
                                className="graph-node-group"
                            >
                                {/* Node Outer Amber Ring if Start Vertex */}
                                {isStart && (
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={R + 4}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="2.5"
                                        strokeDasharray="5 3"
                                    />
                                )}

                                {/* Node Body (AcademicNode style: clean white fill, solid slate border) */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={R}
                                    fill="#ffffff"
                                    stroke="#334155"
                                    strokeWidth="2.5"
                                    filter="url(#quiz-node-shadow)"
                                    className="graph-node-circle"
                                />

                                {/* Node Label in JetBrains Mono bold dark slate */}
                                <text
                                    x={node.x}
                                    y={node.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill="#1e293b"
                                    fontSize={mini ? "13" : "16"}
                                    fontWeight="700"
                                    fontFamily="'JetBrains Mono', monospace"
                                >
                                    {node.label || node.id}
                                </text>

                                {/* Start Node Star Badge (matching AcademicNode .node-start-badge) */}
                                {isStart && !isSource && (
                                    <g transform={`translate(${node.x - R + 5}, ${node.y - R + 5})`}>
                                        <circle
                                            r="9"
                                            fill="#f59e0b"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x="0"
                                            y="1"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#0f172a"
                                            fontSize="10.5"
                                            fontWeight="900"
                                        >
                                            ★
                                        </text>
                                    </g>
                                )}

                                {/* Source Node Role Badge (matching AcademicNode .node-role-badge.source) */}
                                {isSource && (
                                    <g transform={`translate(${node.x - R + 5}, ${node.y - R + 5})`}>
                                        <circle
                                            r="9"
                                            fill="#10b981"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x="0"
                                            y="0.5"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#ffffff"
                                            fontSize="10.5"
                                            fontWeight="800"
                                            fontFamily="'JetBrains Mono', monospace"
                                        >
                                            s
                                        </text>
                                    </g>
                                )}

                                {/* Sink Node Role Badge (matching AcademicNode .node-role-badge.sink) */}
                                {isSink && (
                                    <g transform={`translate(${node.x - R + 5}, ${node.y - R + 5})`}>
                                        <circle
                                            r="9"
                                            fill="#ef4444"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x="0"
                                            y="0.5"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#ffffff"
                                            fontSize="10.5"
                                            fontWeight="800"
                                            fontFamily="'JetBrains Mono', monospace"
                                        >
                                            t
                                        </text>
                                    </g>
                                )}

                                {/* Target Node Role Badge */}
                                {isTarget && !isSink && (
                                    <g transform={`translate(${node.x - R + 5}, ${node.y - R + 5})`}>
                                        <circle
                                            r="9"
                                            fill="#8b5cf6"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        <text
                                            x="0"
                                            y="0.5"
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontWeight="800"
                                            fontFamily="'JetBrains Mono', monospace"
                                        >
                                            T
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
