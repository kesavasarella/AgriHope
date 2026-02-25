"use client"

import React, { useEffect, useMemo, useState } from "react"

export interface PieDatum {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieDatum[]
  size?: number
  strokeWidth?: number
  animate?: boolean
  durationMs?: number
}

export function PieChart({ data, size = 180, strokeWidth = 24, animate = true, durationMs = 900 }: PieChartProps) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const [ready, setReady] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number; pct: number } | null>(null)
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setReady(true), 30)
      return () => clearTimeout(t)
    }
    setReady(true)
  }, [animate])

  let offset = 0

  // Precompute slice angles for tooltip positioning
  const slices = useMemo(() => {
    let start = -Math.PI / 2 // start at top
    return data.map((d) => {
      const pct = Math.max(0, d.value) / total
      const angle = pct * Math.PI * 2
      const mid = start + angle / 2
      const slice = { start, angle, mid, pct }
      start += angle
      return slice
    })
  }, [data, total])

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {data.map((d, i) => {
            const pct = Math.max(0, d.value) / total
            const dash = (ready ? pct : 0) * circumference
            const dashArray = `${dash} ${circumference - dash}`
            const isHover = hoverIdx === i
            const strokeW = isHover ? strokeWidth + 4 : strokeWidth
            const color = d.color || COLORS[i % COLORS.length]

            // Tooltip anchor at slice mid
            const mid = slices[i]?.mid ?? 0
            const tipR = radius + strokeW / 2
            const tipX = size / 2 + Math.cos(mid) * (tipR + 6)
            const tipY = size / 2 + Math.sin(mid) * (tipR + 6)

            const handleEnter = () => {
              setHoverIdx(i)
              setTooltip({
                x: tipX,
                y: tipY,
                label: d.label,
                value: d.value,
                pct: Math.round((pct * 100 + Number.EPSILON) * 10) / 10,
              })
            }
            const handleLeave = () => {
              setHoverIdx(null)
              setTooltip(null)
            }

            const circle = (
              <circle
                key={i}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeW}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
                style={{ transition: animate ? `stroke-width 160ms ease, stroke-dasharray ${durationMs}ms ease, stroke-dashoffset ${durationMs}ms ease` : undefined, cursor: "pointer" }}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
              />
            )
            offset += dash
            return circle
          })}

          {/* Center label on hover */}
          {hoverIdx != null && (
            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#111827">
              {data[hoverIdx].label} ({Math.round((data[hoverIdx].value / total) * 100)}%)
            </text>
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-white px-2 py-1 text-xs shadow border text-foreground"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <div className="font-medium">{tooltip.label}</div>
          <div className="text-muted-foreground">{tooltip.value} ({tooltip.pct}%)</div>
        </div>
      )}
    </div>
  )
}

const COLORS = [
  "#16a34a", // green
  "#2563eb", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#7c3aed", // violet
  "#10b981", // emerald
  "#3b82f6", // sky
]
