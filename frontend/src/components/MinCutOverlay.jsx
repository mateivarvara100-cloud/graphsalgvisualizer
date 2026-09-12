import React, { useMemo } from 'react';
import { useStore } from 'reactflow';
import { motion } from 'framer-motion';

export default function MinCutOverlay({ algorithm, nodes = [], edges = [], flowInfo = {}, maxFlow }) {
    // Only render for flow algorithms (Ford-Fulkerson & Edmonds-Karp)
    const isFlowAlg = algorithm === 'FordFulkerson' || algorithm === 'EdmondsKarp';
    const { minCutS, minCutT } = flowInfo || {};

    // Get current ReactFlow transform (pan & zoom) and measured node internals
    const transform = useStore((store) => store.transform);
    const nodeInternals = useStore((store) => store.nodeInternals);
    const [tx, ty, zoom] = transform || [0, 0, 1];

    // Compute geometry for a clean straight red separating line without shaders
    const straightLine = useMemo(() => {
        // Edge case: if flow is 0 or negative, there is no flow pushed and no cut to display
        const effectiveFlow = maxFlow != null ? maxFlow : (flowInfo?.bottleneck || 0);
        if (!isFlowAlg || effectiveFlow <= 0 || !minCutS || !minCutT || minCutS.length === 0 || minCutT.length === 0) {
            return null;
        }

        const sSet = new Set(minCutS);
        const tSet = new Set(minCutT);

        // Map node centers dynamically
        const nodeMap = new Map();
        nodes.forEach((n) => {
            const internal = nodeInternals?.get?.(n.id);
            const w = internal?.width || n.width || 52;
            const h = internal?.height || n.height || 52;
            const posX = internal?.positionAbsolute?.x ?? n.positionAbsolute?.x ?? n.position?.x ?? 0;
            const posY = internal?.positionAbsolute?.y ?? n.positionAbsolute?.y ?? n.position?.y ?? 0;
            nodeMap.set(n.id, { x: posX + w / 2, y: posY + h / 2 });
        });

        // Compute centroids of Set S and Set T to determine separation axis
        let sSumX = 0, sSumY = 0, sCount = 0;
        minCutS.forEach((id) => {
            const p = nodeMap.get(id);
            if (p) { sSumX += p.x; sSumY += p.y; sCount++; }
        });
        const sCentroid = sCount > 0 ? { x: sSumX / sCount, y: sSumY / sCount } : null;

        let tSumX = 0, tSumY = 0, tCount = 0;
        minCutT.forEach((id) => {
            const p = nodeMap.get(id);
            if (p) { tSumX += p.x; tSumY += p.y; tCount++; }
        });
        const tCentroid = tCount > 0 ? { x: tSumX / tCount, y: tSumY / tCount } : null;

        // Crossing edges: forward edges (S -> T) are the cut bottleneck edges
        const forwardCutEdges = edges.filter((e) => sSet.has(e.source) && tSet.has(e.target));
        const crossingEdges = forwardCutEdges.length > 0 
            ? forwardCutEdges 
            : edges.filter((e) => (sSet.has(e.source) && tSet.has(e.target)) || (sSet.has(e.target) && tSet.has(e.source)));

        if (crossingEdges.length === 0) {
            // Fallback: perpendicular bisector between centroids if no crossing edges found
            if (!sCentroid || !tCentroid) return null;
            const mx = (sCentroid.x + tCentroid.x) / 2;
            const my = (sCentroid.y + tCentroid.y) / 2;
            const dX = tCentroid.x - sCentroid.x;
            const dY = tCentroid.y - sCentroid.y;
            const len = Math.hypot(dX, dY) || 1;
            const nx = -dY / len;
            const ny = dX / len;
            return {
                x1: mx - 100 * nx,
                y1: my - 100 * ny,
                x2: mx + 100 * nx,
                y2: my + 100 * ny,
            };
        }

        // Find midpoints of all crossing edges
        const midpoints = [];
        crossingEdges.forEach((e) => {
            const pU = nodeMap.get(e.source);
            const pV = nodeMap.get(e.target);
            if (pU && pV) {
                midpoints.push({
                    x: (pU.x + pV.x) / 2,
                    y: (pU.y + pV.y) / 2,
                });
            }
        });

        // Compute cut tangent axis (perpendicular to vector from S centroid to T centroid)
        let tanX = 0;
        let tanY = 1;
        if (sCentroid && tCentroid) {
            const sepX = tCentroid.x - sCentroid.x;
            const sepY = tCentroid.y - sCentroid.y;
            tanX = -sepY;
            tanY = sepX;
        }
        const tanLen = Math.hypot(tanX, tanY) || 1;
        const uTanX = tanX / tanLen;
        const uTanY = tanY / tanLen;

        // Sort midpoints along the cut tangent axis
        midpoints.sort((a, b) => (a.x * uTanX + a.y * uTanY) - (b.x * uTanX + b.y * uTanY));

        const pFirst = midpoints[0];
        const pLast = midpoints[midpoints.length - 1];
        const dSpanX = pLast.x - pFirst.x;
        const dSpanY = pLast.y - pFirst.y;
        const spanDist = Math.hypot(dSpanX, dSpanY);

        let dirX = uTanX;
        let dirY = uTanY;
        if (spanDist > 15) {
            dirX = dSpanX / spanDist;
            dirY = dSpanY / spanDist;
        }

        const ext = 70;
        const x1 = pFirst.x - ext * dirX;
        const y1 = pFirst.y - ext * dirY;
        const x2 = pLast.x + ext * dirX;
        const y2 = pLast.y + ext * dirY;

        return { x1, y1, x2, y2 };
    }, [isFlowAlg, minCutS, minCutT, nodes, edges, nodeInternals, maxFlow, flowInfo]);

    if (!straightLine) return null;

    const { x1, y1, x2, y2 } = straightLine;

    return (
        <svg
            className="min-cut-overlay-svg"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
                overflow: 'visible',
            }}
        >
            <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
                {/* Straight red dashed line matching the legend */}
                <motion.line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ef4444"
                    strokeWidth={2.8}
                    strokeDasharray="7 5"
                    strokeLinecap="butt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                />
            </g>
        </svg>
    );
}
