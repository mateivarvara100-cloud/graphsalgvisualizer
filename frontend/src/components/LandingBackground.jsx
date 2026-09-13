import React, { useEffect, useRef } from 'react';

export default function LandingBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Interactive mouse coordinate tracking
        const mouse = { x: -2000, y: -2000, radius: 170 };
        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        const handleMouseLeave = () => {
            mouse.x = -2000;
            mouse.y = -2000;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Color palette for nodes and signal pulses
        const THEME_COLORS = [
            '#38bdf8', // sky cyan
            '#60a5fa', // blue
            '#818cf8', // indigo
            '#a78bfa', // purple
            '#34d399', // emerald
            '#f59e0b', // amber
        ];

        // Dynamic node count based on screen area
        const nodeCount = Math.min(50, Math.max(28, Math.floor((width * height) / 26000)));
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            const color = THEME_COLORS[i % THEME_COLORS.length];
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.55,
                vy: (Math.random() - 0.5) * 0.55,
                radius: Math.random() * 2.2 + 2.2,
                color,
                pulseAngle: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.02,
            });
        }

        // Active traversal pulses (signals traveling along edges)
        const pulses = [];
        const MAX_PULSES = 18;
        const spawnPulse = () => {
            if (pulses.length >= MAX_PULSES) return;
            const fromIdx = Math.floor(Math.random() * nodes.length);
            const fromNode = nodes[fromIdx];
            const neighbors = [];
            for (let j = 0; j < nodes.length; j++) {
                if (j === fromIdx) continue;
                const d = Math.hypot(fromNode.x - nodes[j].x, fromNode.y - nodes[j].y);
                if (d < 165) neighbors.push(j);
            }
            if (neighbors.length > 0) {
                const toIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
                pulses.push({
                    from: fromIdx,
                    to: toIdx,
                    progress: 0,
                    speed: 0.007 + Math.random() * 0.012,
                    color: fromNode.color,
                });
            }
        };

        let lastSpawn = 0;

        const render = (timestamp) => {
            ctx.clearRect(0, 0, width, height);

            // Spawn new signal packet periodically
            if (timestamp - lastSpawn > 260) {
                spawnPulse();
                lastSpawn = timestamp;
            }

            // Update node positions with gentle floating and mouse interaction
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.x += n.vx;
                n.y += n.vy;

                // Screen boundary bounce
                if (n.x < 10) { n.x = 10; n.vx = Math.abs(n.vx); }
                if (n.x > width - 10) { n.x = width - 10; n.vx = -Math.abs(n.vx); }
                if (n.y < 10) { n.y = 10; n.vy = Math.abs(n.vy); }
                if (n.y > height - 10) { n.y = height - 10; n.vy = -Math.abs(n.vy); }

                // Soft repulsion from cursor
                const dxM = mouse.x - n.x;
                const dyM = mouse.y - n.y;
                const distM = Math.hypot(dxM, dyM);
                if (distM < mouse.radius && distM > 0) {
                    const factor = (mouse.radius - distM) / mouse.radius;
                    n.x -= (dxM / distM) * factor * 1.8;
                    n.y -= (dyM / distM) * factor * 1.8;
                }

                n.pulseAngle += n.pulseSpeed;
            }

            // Draw connecting constellation edges
            const maxDist = 160;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[j].x - nodes[i].x;
                    const dy = nodes[j].y - nodes[i].y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.24;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }

                // Interactive connection to cursor
                const dxCursor = mouse.x - nodes[i].x;
                const dyCursor = mouse.y - nodes[i].y;
                const dCursor = Math.hypot(dxCursor, dyCursor);
                if (dCursor < mouse.radius) {
                    const alpha = (1 - dCursor / mouse.radius) * 0.38;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                    ctx.lineWidth = 1.3;
                    ctx.stroke();
                }
            }

            // Draw traveling graph exploration pulses
            for (let p = pulses.length - 1; p >= 0; p--) {
                const pulse = pulses[p];
                pulse.progress += pulse.speed;

                if (pulse.progress >= 1) {
                    pulses.splice(p, 1);
                    continue;
                }

                const n1 = nodes[pulse.from];
                const n2 = nodes[pulse.to];
                if (!n1 || !n2) {
                    pulses.splice(p, 1);
                    continue;
                }

                const curX = n1.x + (n2.x - n1.x) * pulse.progress;
                const curY = n1.y + (n2.y - n1.y) * pulse.progress;

                // Glowing signal packet
                ctx.beginPath();
                ctx.arc(curX, curY, 3.2, 0, Math.PI * 2);
                ctx.fillStyle = pulse.color;
                ctx.shadowColor = pulse.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Draw nodes with animated halos
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const pulse = 1 + Math.sin(n.pulseAngle) * 0.22;
                const r = n.radius * pulse;

                // Ambient glow halo
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.globalAlpha = 0.08;
                ctx.fill();
                ctx.globalAlpha = 1;

                // Solid glowing core
                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.shadowColor = n.color;
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div className="landing-bg-container">
            <canvas ref={canvasRef} className="landing-constellation-canvas" />

            {/* Glowing colorful mesh backdrop */}
            <div className="landing-mesh-orbs">
                <div className="mesh-orb mesh-orb-1" />
                <div className="mesh-orb mesh-orb-2" />
                <div className="mesh-orb mesh-orb-3" />
                <div className="mesh-orb mesh-orb-4" />
            </div>

            {/* Subtle high-tech geometric grid */}
            <div className="landing-grid-overlay" />

            {/* Vignette to soften canvas edges */}
            <div className="landing-vignette" />
        </div>
    );
}
