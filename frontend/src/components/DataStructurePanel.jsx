import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function MatrixPanel({ distMatrix, activeK, activeI, activeJ, negativeCycleInfo }) {
    if (!distMatrix) {
        return (
            <div className="ds-panel">
                <div className="ds-header">
                    <span className="ds-label">Distance Matrix D</span>
                </div>
                <div className="ds-body" style={{ justifyContent: 'center' }}>
                    <span className="ds-empty" style={{ opacity: 0.5 }}>Awaiting computation…</span>
                </div>
            </div>
        );
    }

    const nodes = Object.keys(distMatrix).sort();
    const hasDiagNegCycle = nodes.some(v => typeof distMatrix[v]?.[v] === 'number' && distMatrix[v][v] < 0);
    const hasCycle = Boolean(negativeCycleInfo?.hasCycle || hasDiagNegCycle);

    return (
        <div className="ds-panel ds-panel-matrix">
            <div className="ds-header">
                <div className="ds-header-left">
                    <span className="ds-label">Distance Matrix D[i][j]</span>
                    {activeK && (
                        <span className="ds-intermediate-badge" title="Intermediate vertex k">
                            via <strong>{activeK}</strong>
                        </span>
                    )}
                </div>
                <span className="ds-size">{nodes.length} × {nodes.length}</span>
            </div>

            {hasCycle && (
                <div className="ds-neg-cycle-banner">
                    <span className="ds-neg-cycle-icon">⚠️</span>
                    <div className="ds-neg-cycle-content">
                        <div className="ds-neg-cycle-title">Negative-Weight Cycle Detected</div>
                        <div className="ds-neg-cycle-msg">
                            {negativeCycleInfo?.message || 'Diagonal entry D[v][v] < 0 indicates an absorbing negative cycle. Shortest paths do not exist because cycling infinitely reduces path cost.'}
                        </div>
                    </div>
                </div>
            )}

            <div className="ds-matrix-scroll">
                <table className="ds-matrix-table">
                    <thead>
                        <tr>
                            <th className="ds-matrix-corner">D</th>
                            {nodes.map(j => (
                                <th key={j} className={`ds-matrix-head ${j === activeJ ? 'col-active' : ''} ${j === activeK ? 'k-active' : ''}`}>
                                    {j}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {nodes.map(i => (
                            <tr key={i}>
                                <th className={`ds-matrix-head ${i === activeI ? 'row-active' : ''} ${i === activeK ? 'k-active' : ''}`}>
                                    {i}
                                </th>
                                {nodes.map(j => {
                                    const val = distMatrix[i]?.[j];
                                    const display = val === null || val === undefined || val === Infinity ? '∞' : val;
                                    const isDiag = i === j;
                                    const isNegDiag = isDiag && typeof val === 'number' && val < 0;
                                    const isTargetCell = i === activeI && j === activeJ;
                                    const isKCell = (i === activeI && j === activeK) || (i === activeK && j === activeJ);

                                    let cellCls = 'ds-matrix-cell';
                                    if (isDiag) cellCls += ' diag';
                                    if (isNegDiag) cellCls += ' cell-neg-cycle';
                                    if (display === '∞') cellCls += ' inf';
                                    if (isTargetCell) cellCls += ' cell-target';
                                    else if (isKCell) cellCls += ' cell-k-sum';

                                    return (
                                        <td key={j} className={cellCls} title={isNegDiag ? `Negative cycle: dist[${i}][${i}] = ${val} < 0` : undefined}>
                                            {display}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FlowNetworkPanel({ flowInfo, maxFlow, items = [], algorithm }) {
    const { pathStr, bottleneck, minCutS, minCutT, saturatedEdges, iteration } = flowInfo || {};
    const isFF = algorithm === 'FordFulkerson';

    return (
        <div className="ds-panel ds-panel-flow">
            <div className="ds-header">
                <div className="ds-header-left">
                    <span className="ds-label">
                        {isFF ? 'Augmenting Path & Flow (Ford-Fulkerson Method)' : 'Augmenting Path & Flow (Edmonds-Karp)'}
                    </span>
                    {iteration != null && iteration > 0 && (
                        <span className="ds-iteration-badge">Augmentation #{iteration}</span>
                    )}
                </div>
                <div className="ds-flow-total">
                    <span className="flow-total-label">Total Flow:</span>
                    <span className="flow-total-val">{maxFlow ?? 0}</span>
                </div>
            </div>

            <div className="ds-flow-body">
                {/* Current Augmenting Path */}
                <div className="flow-path-card">
                    <span className="flow-card-label">Current Path p (s → t):</span>
                    {pathStr ? (
                        <div className="flow-path-display">
                            <span className="flow-path-str">{pathStr}</span>
                            {bottleneck != null && (
                                <span className="flow-bottleneck-badge" title="Bottleneck capacity cf(p)">
                                    cf(p) = +{bottleneck}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="flow-path-idle">
                            {minCutS
                                ? 'No more augmenting paths in residual graph.'
                                : (isFF ? 'Exploring residual graph via DFS…' : 'Exploring residual graph via BFS…')}
                        </span>
                    )}
                </div>

                {/* Active exploration frontier tracker */}
                {!pathStr && !minCutS && items && items.length > 0 && (
                    <div className="flow-ds-tracker">
                        <span className="flow-ds-tracker-label">{isFF ? 'DFS Stack (LIFO):' : 'BFS Queue (FIFO):'}</span>
                        <div className="flow-ds-tracker-chips">
                            {items.map((node, idx) => (
                                <span
                                    key={`${node}-${idx}`}
                                    className={`flow-ds-chip ${idx === (isFF ? items.length - 1 : 0) ? 'active-tip' : ''}`}
                                    title={idx === (isFF ? items.length - 1 : 0) ? (isFF ? 'Stack Top (next to explore)' : 'Queue Front (next to dequeue)') : undefined}
                                >
                                    {node}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Min-Cut presentation when done */}
                {minCutS && minCutT && (
                    <motion.div
                        className="flow-mincut-card"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mincut-header">
                            <span className="mincut-title">Max-Flow Min-Cut Theorem</span>
                            <span className="mincut-capacity">Cut Capacity = {maxFlow}</span>
                        </div>
                        <div className="mincut-partitions">
                            <div className="cut-set s-set">
                                <span className="cut-set-name">Source Partition (S):</span>
                                <span className="cut-set-members">&#123;{minCutS.join(', ')}&#125;</span>
                            </div>
                            <div className="cut-set t-set">
                                <span className="cut-set-name">Sink Partition (T):</span>
                                <span className="cut-set-members">&#123;{minCutT.join(', ')}&#125;</span>
                            </div>
                        </div>
                        {saturatedEdges && saturatedEdges.length > 0 ? (
                            <div className="saturated-edges-list">
                                <span className="cut-set-name">Bottleneck Saturated Cut Edges:</span>
                                <div className="saturated-chips">
                                    {saturatedEdges.map((e, idx) => (
                                        <span key={idx} className="saturated-chip">
                                            {e.u} → {e.v} ({e.capacity})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="saturated-edges-list">
                                <span className="cut-set-name">Bottleneck Saturated Cut Edges:</span>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                    None (source cannot reach sink; flow is 0)
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function SccPanel({ algorithm, phase, stackItems = [], sccList = [] }) {
    const isKosaraju = algorithm === 'Kosaraju';
    const stackLabel = isKosaraju
        ? (phase === 2 ? 'Finish Stack (Pop Order)' : 'Finish Stack (DFS Pass 1)')
        : 'Tarjan Stack (S)';

    return (
        <div className="ds-panel ds-panel-scc">
            <div className="ds-header">
                <div className="ds-header-left">
                    <span className="ds-label">{isKosaraju ? 'Kosaraju SCC' : 'Tarjan SCC'}</span>
                    {isKosaraju && (
                        <span className={`ds-phase-badge phase-${phase || 1}`}>
                            {phase === 2 ? 'Pass 2: DFS on Gᵀ' : 'Pass 1: DFS on G (Finish times)'}
                        </span>
                    )}
                </div>
                <span className="ds-size">
                    {sccList.length} {sccList.length === 1 ? 'component' : 'components'} found
                </span>
            </div>

            <div className="ds-scc-body">
                {/* Active Stack */}
                <div className="scc-stack-section">
                    <div className="scc-section-title">
                        <span>{stackLabel}</span>
                        <span className="stack-count">({stackItems.length} {stackItems.length === 1 ? 'node' : 'nodes'})</span>
                    </div>
                    <span className="ds-arrow-label left">Bottom</span>
                    <div className="ds-items-container scc-stack-container">
                        <AnimatePresence mode="popLayout">
                            {stackItems.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    className="ds-empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    exit={{ opacity: 0 }}
                                >
                                    empty
                                </motion.div>
                            ) : (
                                stackItems.map((item, index) => {
                                    const nodeName = typeof item === 'object' ? item.node : item;
                                    const isTop = index === stackItems.length - 1;
                                    const isBot = index === 0 && stackItems.length > 1;
                                    return (
                                        <motion.div
                                            key={nodeName}
                                            className={`ds-item scc-stack-item ${isTop ? 'top' : ''}`}
                                            initial={{ opacity: 0, scale: 0.6 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.6 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            layout
                                        >
                                            {nodeName}
                                            {isTop && <span className="stack-top-indicator">top</span>}
                                            {isBot && <span className="stack-bot-indicator">bot</span>}
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="ds-arrow-label right">Top (LIFO) ⟵</span>
                </div>

                {/* Discovered SCCs */}
                <div className="scc-components-section">
                    <span className="scc-section-title">Identified Components (SCCs):</span>
                    <div className="scc-list-container">
                        {sccList.length === 0 ? (
                            <span className="ds-empty" style={{ fontSize: '0.85rem' }}>No SCCs completed yet…</span>
                        ) : (
                            sccList.map((comp) => (
                                <motion.div
                                    key={comp.id}
                                    className="scc-component-chip"
                                    style={{
                                        borderColor: comp.color,
                                        backgroundColor: `${comp.color}22`,
                                    }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <span className="scc-dot" style={{ backgroundColor: comp.color }} />
                                    <strong className="scc-id" style={{ color: comp.color }}>SCC {comp.id}:</strong>
                                    <span className="scc-members">&#123;{comp.members.join(', ')}&#125;</span>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PriorityQueuePanel({ algorithm, items = [] }) {
    const isPrim = algorithm === 'Prim';
    const isDijkstra = algorithm === 'Dijkstra';
    const label = isPrim ? 'Min-Priority Queue Q (MST-Prim)' : (isDijkstra ? 'Min-Priority Queue Q (Dijkstra)' : 'Priority Queue Q');

    return (
        <div className="ds-panel ds-panel-pq">
            <div className="ds-header">
                <span className="ds-label">{label}</span>
                <span className="ds-size">{items.length} in Q</span>
            </div>
            <div className="ds-body ds-body-pq">
                <span className="ds-arrow-label left">⟵ Extract-Min</span>
                <div className="ds-items-container ds-pq-container">
                    <AnimatePresence mode="popLayout">
                        {items.length === 0 ? (
                            <motion.div key="empty" className="ds-empty">empty (Q = ∅)</motion.div>
                        ) : (
                            items.map((item, index) => {
                                const nodeName = typeof item === 'object' ? item.node : item;
                                const keyDisplay = typeof item === 'object'
                                    ? (item.key_display ?? (item.key !== null && item.key !== undefined ? item.key : '∞'))
                                    : '';
                                const piDisplay = typeof item === 'object' && item.pi ? `π:${item.pi}` : null;
                                return (
                                    <motion.div
                                        key={`${nodeName}-${index}`}
                                        className={`ds-pq-item ${index === 0 ? 'front' : ''}`}
                                        initial={{ opacity: 0, scale: 0.6, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.6, y: -10 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        layout
                                    >
                                        <div className="pq-node-id">{nodeName}</div>
                                        <div className="pq-node-meta">
                                            <span className="pq-key">{isDijkstra ? 'd' : 'k'}: {keyDisplay}</span>
                                            {piDisplay && <span className="pq-pi">{piDisplay}</span>}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function DisjointSetsPanel({ sets = [] }) {
    return (
        <div className="ds-panel ds-panel-disjoint">
            <div className="ds-header">
                <span className="ds-label">Disjoint Sets Forest (Union-Find)</span>
                <span className="ds-size">{sets.length} {sets.length === 1 ? 'component' : 'components'}</span>
            </div>
            <div className="ds-body ds-body-sets">
                <AnimatePresence mode="popLayout">
                    {sets.length === 0 ? (
                        <motion.div key="empty" className="ds-empty">empty</motion.div>
                    ) : (
                        sets.map((setGroup, idx) => (
                            <motion.div
                                key={`set-${Array.isArray(setGroup) ? setGroup.join('-') : idx}`}
                                className="ds-set-group"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                                layout
                            >
                                <span className="ds-set-brace">&#123;</span>
                                <span className="ds-set-members">
                                    {Array.isArray(setGroup) ? setGroup.join(', ') : String(setGroup)}
                                </span>
                                <span className="ds-set-brace">&#125;</span>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function QueueStackPanel({ type, items = [] }) {
    const label = type === 'queue' ? 'Queue Q (FIFO)' : 'Stack S (LIFO)';
    const iconLeft = type === 'queue' ? '⟵ Dequeue' : '⟵ Pop';
    const iconRight = type === 'queue' ? 'Enqueue ⟶' : 'Push ⟶';

    return (
        <div className="ds-panel">
            <div className="ds-header">
                <span className="ds-label">{label}</span>
                <span className="ds-size">{items.length} items</span>
            </div>
            <div className="ds-body">
                <span className="ds-arrow-label left">{iconLeft}</span>
                <div className="ds-items-container">
                    <AnimatePresence mode="popLayout">
                        {items.length === 0 ? (
                            <motion.div
                                key="empty"
                                className="ds-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                            >
                                empty
                            </motion.div>
                        ) : (
                            items.map((item, index) => (
                                <motion.div
                                    key={`${item}-${index}`}
                                    className={`ds-item ${index === 0 ? 'front' : ''}`}
                                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: -20 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    layout
                                >
                                    {item}
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
                <span className="ds-arrow-label right">{iconRight}</span>
            </div>
        </div>
    );
}

export default function DataStructurePanel({
    type, items = [], distMatrix, negativeCycleInfo, algorithm,
    flowInfo, maxFlow, sccList = [], phase,
    activeK, activeI, activeJ
}) {
    if (algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp') {
        return <FlowNetworkPanel flowInfo={flowInfo} maxFlow={maxFlow} items={items} algorithm={algorithm} />;
    }
    if (algorithm === 'Kosaraju' || algorithm === 'Tarjan') {
        return <SccPanel algorithm={algorithm} phase={phase} stackItems={items} sccList={sccList} />;
    }
    if (type === 'matrix') {
        return <MatrixPanel distMatrix={distMatrix} negativeCycleInfo={negativeCycleInfo} activeK={activeK} activeI={activeI} activeJ={activeJ} />;
    }
    if (type === 'priority_queue') {
        return <PriorityQueuePanel algorithm={algorithm} items={items} />;
    }
    if (type === 'disjoint_sets') {
        return <DisjointSetsPanel sets={items} />;
    }
    return <QueueStackPanel type={type} items={items} />;
}
