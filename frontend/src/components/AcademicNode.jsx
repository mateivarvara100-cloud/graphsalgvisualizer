import React from 'react';
import { Handle, Position } from 'reactflow';

export default function AcademicNode({ data }) {
    const {
        label, status, isActive, timestamp, keyVal, piVal, distVal,
        isStart, isSource, isSink, isRoot, isEdgeSource, sccColor, sccId,
        tarjanIdx, tarjanLow
    } = data;

    const classNames = [
        'academic-node',
        // If an SCC color is set, use 'scc-colored'
        sccColor ? 'scc-colored' : (status || 'white'),
        isActive     ? 'active'       : '',
        isEdgeSource ? 'edge-source'  : '',
    ].filter(Boolean).join(' ');

    // SCC inline color override
    const sccStyle = sccColor ? {
        backgroundColor: sccColor,
        borderColor: sccColor,
        color: '#ffffff',
        boxShadow: `0 0 16px ${sccColor}88, 0 4px 14px rgba(0,0,0,0.25)`,
    } : {};

    // Format timestamp label: "d/f" for DFS/Kosaraju, or "d"
    let timestampLabel = null;
    if (timestamp) {
        if (timestamp.d != null && timestamp.f != null) {
            timestampLabel = `${timestamp.d}/${timestamp.f}`;
        } else if (timestamp.d != null) {
            timestampLabel = `${timestamp.d}`;
        }
    }

    // Tarjan index / lowLink badge (v.index and v.lowLink)
    const tarjanLabel = (tarjanIdx != null) ? `${tarjanIdx}/${tarjanLow != null ? tarjanLow : tarjanIdx}` : null;

    return (
        <div className={classNames} style={sccStyle}>
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    minWidth: 0,
                    minHeight: 0,
                    width: 1,
                    height: 1,
                    border: 0,
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    minWidth: 0,
                    minHeight: 0,
                    width: 1,
                    height: 1,
                    border: 0,
                }}
            />

            {/* Animated ring layers */}
            {isActive && <div className="node-ring pulse-ring" />}
            {status === 'gray' && !sccColor && <div className="node-ring discovery-ring" />}

            {/* Role badges */}
            {isSource && (
                <span className="node-role-badge source" title="Source (s)">s</span>
            )}
            {isSink && (
                <span className="node-role-badge sink" title="Sink (t)">t</span>
            )}
            {(isStart || isRoot) && !isSource && (
                <span className="node-start-badge" title="Start Node">★</span>
            )}

            {/* Node label */}
            <span className="node-label">{label}</span>

            {/* Timestamp badge (DFS / Kosaraju Phase 1 d/f) */}
            {timestampLabel && (
                <span className="node-timestamp" title="Discovery / Finish time (d/f)">
                    {timestampLabel}
                </span>
            )}

            {/* Tarjan index/lowlink badge */}
            {tarjanLabel && (
                <span className="node-tarjan-badge" title="index / lowLink">
                    {tarjanLabel}
                </span>
            )}

            {/* Prim key & pi badge */}
            {keyVal !== undefined && keyVal !== null && (
                <span className="node-key-badge" title="v.key and predecessor π">
                    k:{keyVal}{piVal ? ` π:${piVal}` : ''}
                </span>
            )}

            {/* Dijkstra dist & pi badge */}
            {distVal !== undefined && distVal !== null && (
                <span className="node-key-badge dijkstra-badge" title="v.d and predecessor π">
                    d:{distVal}{piVal ? ` π:${piVal}` : ''}
                </span>
            )}

            {/* SCC indicator badge */}
            {sccId && (
                <span className="node-scc-indicator" title={`SCC ${sccId}`}>
                    SCC {sccId}
                </span>
            )}
        </div>
    );
}