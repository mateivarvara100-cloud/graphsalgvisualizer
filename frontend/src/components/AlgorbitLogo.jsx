import React from 'react';

export default function AlgorbitLogo({ size = 36, className = '', glow = true }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`algorbit-logo ${className}`}
            style={{ flexShrink: 0 }}
        >
            <defs>
                <linearGradient id="algorbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <linearGradient id="algorbitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="60%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#e879f9" />
                </linearGradient>
                <radialGradient id="algorbitNodeCyan" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#e0f2fe" />
                    <stop offset="40%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>
                <radialGradient id="algorbitNodePurple" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fae8ff" />
                    <stop offset="40%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#7e22ce" />
                </radialGradient>
                {glow && (
                    <>
                        <filter id="algorbitGlow" x="-25%" y="-25%" width="150%" height="150%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="algorbitStrongGlow" x="-35%" y="-35%" width="170%" height="170%">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </>
                )}
            </defs>

            {/* Outer perimeter bounding circle */}
            <circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#algorbitGrad1)"
                strokeWidth="2.4"
                strokeOpacity="0.85"
                filter={glow ? "url(#algorbitGlow)" : undefined}
            />

            {/* Swirling orbital ellipses */}
            <g filter={glow ? "url(#algorbitGlow)" : undefined}>
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <ellipse
                        key={angle}
                        cx="50"
                        cy="50"
                        rx="36"
                        ry="19"
                        transform={`rotate(${angle} 50 50)`}
                        stroke={i % 2 === 0 ? "url(#algorbitGrad1)" : "url(#algorbitGrad2)"}
                        strokeWidth="2.2"
                        fill="none"
                        strokeOpacity="0.9"
                    />
                ))}
            </g>

            {/* Central vortex core */}
            <circle
                cx="50"
                cy="50"
                r="11"
                stroke="url(#algorbitGrad2)"
                strokeWidth="2.4"
                fill="#0f172a"
                strokeOpacity="0.95"
            />
            <circle
                cx="50"
                cy="50"
                r="4.5"
                fill="#38bdf8"
                filter={glow ? "url(#algorbitStrongGlow)" : undefined}
                opacity="0.95"
            />

            {/* Outer vertices at 60-degree increments */}
            {[
                { cx: 50, cy: 8, fill: 'url(#algorbitNodeCyan)', glowColor: '#38bdf8' },
                { cx: 86.4, cy: 29, fill: 'url(#algorbitNodeCyan)', glowColor: '#38bdf8' },
                { cx: 86.4, cy: 71, fill: 'url(#algorbitNodeCyan)', glowColor: '#38bdf8' },
                { cx: 50, cy: 92, fill: 'url(#algorbitNodePurple)', glowColor: '#c084fc' },
                { cx: 13.6, cy: 71, fill: 'url(#algorbitNodePurple)', glowColor: '#c084fc' },
                { cx: 13.6, cy: 29, fill: 'url(#algorbitNodePurple)', glowColor: '#c084fc' },
            ].map((node, i) => (
                <g key={i}>
                    {glow && (
                        <circle
                            cx={node.cx}
                            cy={node.cy}
                            r="6.5"
                            fill={node.glowColor}
                            opacity="0.4"
                            filter="url(#algorbitStrongGlow)"
                        />
                    )}
                    <circle
                        cx={node.cx}
                        cy={node.cy}
                        r="4.2"
                        fill={node.fill}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                    />
                </g>
            ))}

            {/* Inner orbital vertices */}
            {[
                { cx: 33, cy: 38, fill: 'url(#algorbitNodePurple)', glowColor: '#c084fc' },
                { cx: 67, cy: 38, fill: 'url(#algorbitNodeCyan)', glowColor: '#38bdf8' },
                { cx: 62, cy: 62, fill: 'url(#algorbitNodeCyan)', glowColor: '#38bdf8' },
                { cx: 38, cy: 62, fill: 'url(#algorbitNodePurple)', glowColor: '#c084fc' },
            ].map((node, i) => (
                <g key={i}>
                    {glow && (
                        <circle
                            cx={node.cx}
                            cy={node.cy}
                            r="5"
                            fill={node.glowColor}
                            opacity="0.35"
                            filter="url(#algorbitStrongGlow)"
                        />
                    )}
                    <circle
                        cx={node.cx}
                        cy={node.cy}
                        r="3.5"
                        fill={node.fill}
                        stroke="#ffffff"
                        strokeWidth="1"
                    />
                </g>
            ))}
        </svg>
    );
}
