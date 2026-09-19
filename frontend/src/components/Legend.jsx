import React from 'react';

export default function Legend({ algorithm, isDirected }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const renderItems = () => {
        if (algorithm === 'Kruskal') return (
            <>
                <LegendLine cls="mst">MST Edge</LegendLine>
                <LegendLine cls="checked">Considering edge</LegendLine>
                <LegendLine cls="rejected">Rejected edge (cycle)</LegendLine>
                <div className="legend-item">
                    <span className="legend-chip-sample">&#123;u, v&#125;</span>
                    <span>Disjoint component</span>
                </div>
            </>
        );

        if (algorithm === 'Prim') return (
            <>
                <LegendLine cls="mst">MST Edge</LegendLine>
                <LegendLine cls="checked">Checking neighbor</LegendLine>
                <LegendLine cls="relax">Updated key (cheaper edge)</LegendLine>
                <LegendLine cls="rejected">Rejected edge (cycle)</LegendLine>
                <LegendDot cls="black">In MST (extracted)</LegendDot>
                <LegendDot cls="gray">In Q (active)</LegendDot>
                <div className="legend-item">
                    <span className="legend-badge-sample">k:w</span>
                    <span>Vertex key (w)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-badge-sample">π:node</span>
                    <span>Parent pointer</span>
                </div>
            </>
        );

        if (algorithm === 'Dijkstra') return (
            <>
                <LegendLine cls="mst">Shortest Path Tree (SPT)</LegendLine>
                <LegendLine cls="relax">Relaxed edge</LegendLine>
                <LegendLine cls="checked">Checking edge</LegendLine>
                <LegendDot cls="black">Finalized (extracted)</LegendDot>
                <LegendDot cls="gray">In Queue</LegendDot>
                <div className="legend-item">
                    <span className="legend-badge-sample">d:val</span>
                    <span>Distance label</span>
                </div>
                <div className="legend-item">
                    <span className='legend-badge-sample'>π:node</span>
                    <span>Parent pointer</span>
                </div>
            </>
        );

        if (algorithm === 'FloydWarshall') return (
            <>
                <LegendLine cls="relax">Updated path (i→j via k)</LegendLine>
                <LegendLine cls="checked">Checking path</LegendLine>
                <div className="legend-item">
                    <span className="legend-chip-sample">k</span>
                    <span>Intermediate vertex</span>
                </div>
            </>
        );

        if (algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp') return (
            <>
                <LegendRole role="source">Source vertex (s)</LegendRole>
                <LegendRole role="sink">Sink vertex (t)</LegendRole>
                <LegendLine cls="flow">Augmenting path (p)</LegendLine>
                <LegendLine cls="positive-flow">Flow edge (0 &lt; f &lt; c)</LegendLine>
                <LegendLine cls="checked">
                    {algorithm === 'EdmondsKarp' ? 'Residual BFS exploration' : 'Residual DFS exploration'}
                </LegendLine>
                <LegendLine cls="saturated">Saturated edge (f = c)</LegendLine>
                <LegendLine cls="min-cut">Min-Cut line (S, T)</LegendLine>
                <div className="legend-item">
                    <span className="legend-badge-sample">f / c</span>
                    <span>Flow / Capacity</span>
                </div>
            </>
        );

        if (algorithm === 'Kosaraju') return (
            <>
                <div className="legend-item">
                    <span className="legend-badge-sample">d / f</span>
                    <span>Discovery / Finish (d / f)</span>
                </div>
                <LegendLine cls="checked">Checking edge</LegendLine>
            </>
        );

        if (algorithm === 'Tarjan') return (
            <>
                <div className="legend-item">
                    <span className="legend-badge-sample">idx / low</span>
                    <span>u.index / u.lowLink</span>
                </div>
                <LegendLine cls="checked">Checking edge</LegendLine>
            </>
        );

        if (algorithm === 'DFS' || algorithm === 'BFS') return (
            <>
                <div className="legend-item">
                    <span className="legend-badge-sample">d / f</span>
                    <span>{'Discovery / Finish (d / f)'}</span>
                </div>
                <LegendDot cls="white">White (unvisited)</LegendDot>
                <LegendDot cls="gray">Gray (active / discovered)</LegendDot>
                <LegendDot cls="black">Black (finished)</LegendDot>
                <div className="legend-divider" />
                <LegendLine cls="tree">Tree edge</LegendLine>
                {(algorithm === 'DFS' || isDirected) && (
                    <LegendLine cls="back">Back edge (cycle)</LegendLine>
                )}
                {algorithm === 'DFS' && isDirected && (
                    <LegendLine cls="forward">Forward edge</LegendLine>
                )}
                {(algorithm === 'BFS' || isDirected) && (
                    <LegendLine cls="cross">Cross edge</LegendLine>
                )}
                <LegendLine cls="checked">Checking edge</LegendLine>

                <EdgeClassificationTable currentAlg={algorithm} isDirected={isDirected} />
            </>
        );

        // Default
        return (
            <>
                <div className="legend-item">
                    <span className="legend-badge-sample">d / f</span>
                    <span>Discovery / Finish timestamp</span>
                </div>
                <LegendDot cls="white">White (unvisited)</LegendDot>
                <LegendDot cls="gray">Gray (discovered)</LegendDot>
                <LegendDot cls="black">Black (finished)</LegendDot>
                <div className="legend-divider" />
                <LegendLine cls="tree">Tree edge</LegendLine>
                <LegendLine cls="back">Back edge (cycle)</LegendLine>
                <LegendLine cls="forward">Forward edge</LegendLine>
                <LegendLine cls="cross">Cross edge</LegendLine>
                <LegendLine cls="checked">Checking edge</LegendLine>
            </>
        );
    };

    return (
        <div className={`legend-container ${isOpen ? 'is-expanded mobile-expanded' : 'is-collapsed mobile-collapsed'}`}>
            <button
                type="button"
                className="legend-toggle-btn legend-mobile-toggle-btn"
                onClick={() => setIsOpen(prev => !prev)}
                title={isOpen ? "Hide Legend" : "Show Legend"}
                aria-expanded={isOpen}
            >
                <span className="toggle-icon">ℹ️</span>
                <span className="toggle-text">Legend</span>
                <span className="toggle-arrow">{isOpen ? '▾' : '▴'}</span>
            </button>
            <div className="legend">
                <div className="legend-header legend-mobile-header">
                    <span className="legend-header-title">Legend</span>
                    <button
                        type="button"
                        className="legend-close-btn legend-mobile-close-btn"
                        onClick={() => setIsOpen(false)}
                        title="Close Legend"
                    >
                        ✕
                    </button>
                </div>
                {renderItems()}
            </div>
        </div>
    );
}

export function EdgeClassificationTable({ currentAlg, isDirected }) {
    const allRows = [
        { graph: 'Undirected', alg: 'DFS', tree: 'Yes', back: 'Yes', forward: 'No', cross: 'No' },
        { graph: 'Undirected', alg: 'BFS', tree: 'Yes', back: 'No', forward: 'No', cross: 'Yes' },
        { graph: 'Directed', alg: 'DFS', tree: 'Yes', back: 'Yes', forward: 'Yes', cross: 'Yes' },
        { graph: 'Directed', alg: 'BFS', tree: 'Yes', back: 'Yes', forward: 'No', cross: 'Yes' },
    ];

    const currentGraph = isDirected ? 'Directed' : 'Undirected';
    const rows = (currentAlg === 'BFS' || currentAlg === 'DFS')
        ? allRows.filter(r => r.alg === currentAlg)
        : allRows;

    return (
        <div className="edge-matrix-card">
            <div className="edge-matrix-title">Edge Classification</div>
            <table className="edge-matrix-table">
                <thead>
                    <tr>
                        <th>Graph</th>
                        <th>Algorithm</th>
                        <th className="th-tree">Tree</th>
                        <th className="th-back">Back</th>
                        <th className="th-forward">Forward</th>
                        <th className="th-cross">Cross</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => {
                        const isActive = r.graph === currentGraph && r.alg === currentAlg;
                        return (
                            <tr key={idx} className={isActive ? 'active-row' : ''}>
                                <td className="cell-graf">{r.graph}</td>
                                <td className="cell-alg">{r.alg}</td>
                                <td className={`cell-val ${r.tree === 'Yes' ? 'yes' : 'no'}`}>{r.tree}</td>
                                <td className={`cell-val ${r.back === 'Yes' ? 'yes' : 'no'}`}>{r.back}</td>
                                <td className={`cell-val ${r.forward === 'Yes' ? 'yes' : 'no'}`}>{r.forward}</td>
                                <td className={`cell-val ${r.cross === 'Yes' ? 'yes' : 'no'}`}>{r.cross}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function LegendRole({ role, children }) {
    return (
        <div className="legend-item">
            <span className={`legend-role-sample ${role}`}>{role === 'source' ? 's' : role === 'sink' ? 't' : 'r'}</span>
            <span>{children}</span>
        </div>
    );
}

function LegendDot({ cls, children, style }) {
    return (
        <div className="legend-item">
            <span className={`legend-dot ${cls || ''}`} style={style} />
            <span>{children}</span>
        </div>
    );
}

function LegendLine({ cls, children }) {
    return (
        <div className="legend-item">
            <span className={`legend-line ${cls || ''}`} />
            <span>{children}</span>
        </div>
    );
}
