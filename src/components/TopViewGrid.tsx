import React, { useMemo } from 'react';

interface GridProps {
  obstacles: { x: number; z: number }[];
}

export const TopViewGrid: React.FC<GridProps> = ({ obstacles }) => {
  const size = 170;
  const half = size / 2;

  // 🔥 scale world → grid
  const SCALE = 22;

  // 🔥 compute danger field (heatmap)
  const heat = useMemo(() => {
    const gridSize = 9;
    const cells = new Array(gridSize).fill(0).map(() => new Array(gridSize).fill(0));

    obstacles.forEach(o => {
      const gx = Math.floor((o.x * SCALE + half) / size * gridSize);
      const gz = Math.floor((o.z * SCALE + half) / size * gridSize);

      if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
        cells[gz][gx] += 1;
      }
    });

    return cells;
  }, [obstacles]);

  // 🔥 compute safe direction (center of least danger)
  const bestDirection = useMemo(() => {
    let bestScore = Infinity;
    let bestX = 0;

    for (let i = 0; i < heat[0].length; i++) {
      let colSum = 0;
      for (let j = 0; j < heat.length; j++) {
        colSum += heat[j][i];
      }

      if (colSum < bestScore) {
        bestScore = colSum;
        bestX = i;
      }
    }

    return (bestX / heat[0].length - 0.5) * size;
  }, [heat]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '110px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(0,255,255,0.3)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
      }}
    >
      <svg width={size} height={size}>
        
        {/* 🔲 HEATMAP */}
        {heat.map((row, y) =>
          row.map((val, x) => {
            if (val === 0) return null;

            const intensity = Math.min(val / 3, 1);

            const color =
              intensity > 0.6 ? 'rgba(255,0,0,0.5)' :
              intensity > 0.3 ? 'rgba(255,165,0,0.4)' :
              'rgba(0,255,255,0.2)';

            return (
              <rect
                key={`${x}-${y}`}
                x={(x / row.length) * size}
                y={(y / heat.length) * size}
                width={size / row.length}
                height={size / heat.length}
                fill={color}
              />
            );
          })
        )}

        {/* center cross */}
        <line x1={half} y1={0} x2={half} y2={size} stroke="rgba(0,255,255,0.2)" />
        <line x1={0} y1={half} x2={size} y2={half} stroke="rgba(0,255,255,0.2)" />

        {/* 🔥 SAFE CORRIDOR LINE */}
        <line
          x1={half}
          y1={half}
          x2={half + bestDirection * 0.5}
          y2={0}
          stroke="cyan"
          strokeWidth="2"
        />

        {/* 🔴 OBSTACLE DOTS */}
        {obstacles.map((o, i) => {
          const x = half + o.x * SCALE;
          const y = half + o.z * SCALE;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="red"
            />
          );
        })}
      </svg>
    </div>
  );
};