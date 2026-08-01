'use client';

// Gráfico de linha simples (SVG puro, sem dependências) pra evolução de carga.
// points: [{ label, value }]
export default function ProgressChart({ points, unit = 'kg', height = 170 }) {
  const data = (points || []).filter((p) => p.value != null && !isNaN(p.value));

  if (data.length < 2) {
    return (
      <div style={{ color: '#8a8a94', padding: '28px 0', textAlign: 'center', fontSize: 14 }}>
        Registre pelo menos 2 treinos desse exercício pra ver a evolução.
      </div>
    );
  }

  const w = 600;
  const h = height;
  const padX = 34;
  const padY = 24;
  const ys = data.map((d) => d.value);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;

  const X = (i) => padX + (i / (data.length - 1)) * (w - padX * 2);
  const Y = (v) => h - padY - ((v - minY) / range) * (h - padY * 2);

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${X(i)} ${Y(d.value)}`).join(' ');
  const area = `${line} L ${X(data.length - 1)} ${h - padY} L ${X(0)} ${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Evolução de carga">
      <defs>
        <linearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* limites de referência */}
      <text x={padX} y={Y(maxY) - 6} fill="#8a8a94" fontSize="13">
        {maxY} {unit}
      </text>
      <text x={padX} y={Y(minY) + 16} fill="#8a8a94" fontSize="13">
        {minY} {unit}
      </text>

      <path d={area} fill="url(#pcFill)" style={{ opacity: 0, animation: 'fadeInUp 0.6s ease 0.5s both' }} />
      <path
        d={line}
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ strokeDasharray: 1200, animation: 'dashDraw 1.1s ease forwards' }}
      />

      {data.map((d, i) => (
        <circle
          key={i}
          cx={X(i)}
          cy={Y(d.value)}
          r="4.5"
          fill="#0f0f12"
          stroke="#22c55e"
          strokeWidth="2.5"
          style={{ opacity: 0, animation: 'fadeInUp 0.4s ease both', animationDelay: `${0.5 + i * 0.06}s` }}
        />
      ))}
    </svg>
  );
}
