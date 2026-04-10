import React from 'react';

export const CenterGrid = ({ obstacles }: any) => {
  const size = 140;
  const half = size / 2;
  const SCALE = 18;

  return (
    <div
      style={{
        position: 'absolute',
        top: '55%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid rgba(0,255,255,0.4)',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 150
      }}
    >
      <svg width={size} height={size}>
        {/* center */}
        <circle cx={half} cy={half} r="4" fill="cyan" />

        {/* cyan rings */}
        {[1,2,3].map(i => (
          <circle
            key={i}
            cx={half}
            cy={half}
            r={i * 20}
            stroke="rgba(0,255,255,0.3)"
            fill="none"
          />
        ))}

        {/* obstacles */}
        {obstacles.map((o:any, i:number) => {
          const x = half + o.x * SCALE;
          const y = half + (-o.z) * SCALE;

          const dist = Math.sqrt(o.x * o.x + o.z * o.z);

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={dist < 1.5 ? 'red' : 'cyan'}
            />
          );
        })}
      </svg>
    </div>
  );
};