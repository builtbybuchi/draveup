import { useMemo } from "react";

type Variant = "blue-on-white" | "white-on-blue" | "blue-on-light";

interface BrandPatternProps {
  variant?: Variant;
  opacity?: number;
  className?: string;
  rows?: number;
  cols?: number;
}

const ROTATIONS = [0, 90, 180, 270];

function getColors(variant: Variant) {
  switch (variant) {
    case "white-on-blue":
      return { circle: "#FFFFFF", semi: "#0A91F9" };
    case "blue-on-light":
      return { circle: "#0A91F9", semi: "#EFF7FF" };
    case "blue-on-white":
    default:
      return { circle: "#0A91F9", semi: "#FFFFFF" };
  }
}

export function BrandPattern({
  variant = "blue-on-white",
  opacity = 0.08,
  className = "",
  rows = 8,
  cols = 14,
}: BrandPatternProps) {
  const { circle, semi } = getColors(variant);
  const R = 14;
  const r = 8;
  const spacing = 36;

  const cells = useMemo(() => {
    const result: { cx: number; cy: number; rotation: number }[] = [];
    let seq = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        result.push({
          cx: col * spacing + spacing / 2,
          cy: row * spacing + spacing / 2,
          rotation: ROTATIONS[seq % 4],
        });
        seq++;
      }
      seq++;
    }
    return result;
  }, [rows, cols, spacing]);

  const width = cols * spacing;
  const height = rows * spacing;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      viewBox={`0 0 ${width} ${height}`}
    >
      {cells.map(({ cx, cy, rotation }, i) => (
        <g key={i} transform={`translate(${cx}, ${cy})`}>
          <circle r={R} fill={circle} />
          <path
            d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`}
            transform={`rotate(${rotation})`}
            fill={semi}
          />
        </g>
      ))}
    </svg>
  );
}
