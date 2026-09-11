import React, { useCallback } from 'react';
import { useStore, getStraightPath, BaseEdge } from 'reactflow';

// Default visualizer dark-pill styling for edge weights / labels
const DEFAULT_LABEL_STYLE = { fill: '#f8fafc', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' };
const DEFAULT_LABEL_BG_STYLE = { fill: '#1e293b', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#475569', strokeWidth: 1.5 };
const DEFAULT_LABEL_BG_PADDING = [6, 4];
const DEFAULT_LABEL_BG_RADIUS = 6;

export default function FloatingEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    label,
    labelStyle,
    labelShowBg = true,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    interactionWidth,
}) {
    const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
    const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

    const hasReverseEdge = useStore(useCallback((store) => {
        return store.edges.some(e => e.source === target && e.target === source);
    }, [source, target]));

    // Node dimensions (defaulting to 52x52 for AcademicNode)
    const sWidth = sourceNode?.width || 52;
    const sHeight = sourceNode?.height || 52;
    const tWidth = targetNode?.width || 52;
    const tHeight = targetNode?.height || 52;

    const sRadius = sWidth / 2;
    const tRadius = tWidth / 2;

    // Center coordinates: prefer direct handle coordinates when available, fallback to node positions
    const cSx = (typeof sourceX === 'number' && !isNaN(sourceX))
        ? sourceX
        : (sourceNode?.positionAbsolute ? sourceNode.positionAbsolute.x + sWidth / 2 : (sourceNode?.position?.x || 0) + sWidth / 2);

    const cSy = (typeof sourceY === 'number' && !isNaN(sourceY))
        ? sourceY
        : (sourceNode?.positionAbsolute ? sourceNode.positionAbsolute.y + sHeight / 2 : (sourceNode?.position?.y || 0) + sHeight / 2);

    const cTx = (typeof targetX === 'number' && !isNaN(targetX))
        ? targetX
        : (targetNode?.positionAbsolute ? targetNode.positionAbsolute.x + tWidth / 2 : (targetNode?.position?.x || 0) + tWidth / 2);

    const cTy = (typeof targetY === 'number' && !isNaN(targetY))
        ? targetY
        : (targetNode?.positionAbsolute ? targetNode.positionAbsolute.y + tHeight / 2 : (targetNode?.position?.y || 0) + tHeight / 2);

    // Self-loop edge case
    if (source === target) {
        const loopRadius = 24;
        const startAngle = -Math.PI / 3;
        const endAngle = -2 * Math.PI / 3;
        const startX = cSx + sRadius * Math.cos(startAngle);
        const startY = cSy + sRadius * Math.sin(startAngle);
        const endX = cSx + sRadius * Math.cos(endAngle);
        const endY = cSy + sRadius * Math.sin(endAngle);

        const path = `M ${startX} ${startY} C ${startX + loopRadius} ${startY - loopRadius * 2}, ${endX - loopRadius} ${endY - loopRadius * 2}, ${endX} ${endY}`;
        const lX = cSx;
        const lY = cSy - sRadius - loopRadius * 1.2;

        return (
            <BaseEdge
                path={path}
                labelX={lX}
                labelY={lY}
                label={label}
                labelStyle={labelStyle}
                labelShowBg={labelShowBg}
                labelBgStyle={labelBgStyle}
                labelBgPadding={labelBgPadding}
                labelBgBorderRadius={labelBgBorderRadius}
                style={style}
                markerEnd={markerEnd}
                markerStart={markerStart}
                interactionWidth={interactionWidth}
            />
        );
    }

    const dx = cTx - cSx;
    const dy = cTy - cSy;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) {
        return null;
    }

    // Effective boundary radii:
    // If there is an arrowhead (markerEnd), the tip touches the node outer boundary (25.5px).
    // If undirected/no arrowhead, the line can extend 1.5px into the 2.5px node border (24.5px) for a seamless bond.
    const effSourceR = markerStart ? (sRadius - 0.5) : (sRadius - 1.5);
    const effTargetR = markerEnd   ? (tRadius - 0.5) : (tRadius - 1.5);

    // Guard against nodes overlapping
    const maxAllowedR = dist / 2;
    const actualSourceR = Math.min(effSourceR, maxAllowedR);
    const actualTargetR = Math.min(effTargetR, maxAllowedR);

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (hasReverseEdge) {
        // Curve the edge to the right of its direction vector to avoid overlapping the reverse edge
        const nx = dx / dist;
        const ny = dy / dist;
        // Vector rotated 90 deg clockwise: (ny, -nx)
        const px = ny;
        const py = -nx;

        const curveOffset = Math.max(22, Math.min(36, dist * 0.18));
        const midX = (cSx + cTx) / 2;
        const midY = (cSy + cTy) / 2;
        const ctrlX = midX + px * curveOffset;
        const ctrlY = midY + py * curveOffset;

        // Compute start point along ray toward ctrl point
        const toCtrlSx = ctrlX - cSx;
        const toCtrlSy = ctrlY - cSy;
        const distCtrlS = Math.hypot(toCtrlSx, toCtrlSy) || 1;
        const sx = cSx + (toCtrlSx / distCtrlS) * actualSourceR;
        const sy = cSy + (toCtrlSy / distCtrlS) * actualSourceR;

        // Compute end point along ray from ctrl point to target center
        const fromCtrlTx = cTx - ctrlX;
        const fromCtrlTy = cTy - ctrlY;
        const distCtrlT = Math.hypot(fromCtrlTx, fromCtrlTy) || 1;
        const tx = cTx - (fromCtrlTx / distCtrlT) * actualTargetR;
        const ty = cTy - (fromCtrlTy / distCtrlT) * actualTargetR;

        edgePath = `M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${tx} ${ty}`;
        // Point on quadratic curve at t = 0.5
        labelX = 0.25 * sx + 0.5 * ctrlX + 0.25 * tx;
        labelY = 0.25 * sy + 0.5 * ctrlY + 0.25 * ty;
    } else {
        // Straight line directly connecting circular perimeters along center-to-center ray
        const nx = dx / dist;
        const ny = dy / dist;

        const sx = cSx + nx * actualSourceR;
        const sy = cSy + ny * actualSourceR;
        const tx = cTx - nx * actualTargetR;
        const ty = cTy - ny * actualTargetR;

        const [path, lx, ly] = getStraightPath({
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
        });

        edgePath = path;
        labelX = lx;
        labelY = ly;
    }

    return (
        <BaseEdge
            path={edgePath}
            labelX={labelX}
            labelY={labelY}
            label={label}
            labelStyle={labelStyle || DEFAULT_LABEL_STYLE}
            labelShowBg={labelShowBg}
            labelBgStyle={labelBgStyle || DEFAULT_LABEL_BG_STYLE}
            labelBgPadding={labelBgPadding || DEFAULT_LABEL_BG_PADDING}
            labelBgBorderRadius={labelBgBorderRadius || DEFAULT_LABEL_BG_RADIUS}
            style={style}
            markerEnd={markerEnd}
            markerStart={markerStart}
            interactionWidth={interactionWidth}
        />
    );
}
