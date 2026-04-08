import React from 'react';

interface ZLogoProps {
  size?: number;
  radius?: number | string;
  background?: string;
  svgFill?: string;
  style?: React.CSSProperties;
}

export function ZLogo({
  size = 32,
  radius = 'var(--r-lg)',
  background = 'var(--accent)',
  svgFill = '#fff',
  style,
}: ZLogoProps) {

  const padding = size * 0.18;
  const innerSize = size - padding * 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={innerSize}
        height={innerSize}
        viewBox="0 0 24 24"
        fill={svgFill}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="4,5 20,5 20,8 8.5,16 20,16 20,19 4,19 4,16 15.5,8 4,8" />
      </svg>
    </div>
  );
}
