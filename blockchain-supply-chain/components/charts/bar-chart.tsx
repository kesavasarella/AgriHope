"use client"

import React, { useEffect, useState } from "react"

export interface BarDatum {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarDatum[]
  width?: number
  height?: number
  animate?: boolean
  durationMs?: number
}

export function BarChart({ data, width = 420, height = 220, animate = true, durationMs = 900 }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const padding = 24
  const barGap = 12
  const barWidth = (width - padding * 2 - barGap * (data.length - 1)) / Math.max(1, data.length)

  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!animate) { setProgress(1); return }
    const t = setTimeout(() => setProgress(1), 30)
    return () => clearTimeout(t)
  }, [animate])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Axis */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ddd" />
      {data.map((d, i) => {
        const x = padding + i * (barWidth + barGap)
        const targetH = Math.max(0, (d.value / max) * (height - padding * 2))
        const h = targetH * progress
        const y = height - padding - h
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill={d.color || COLORS[i % COLORS.length]}
              rx={4}
              style={{ transition: animate ? `y ${durationMs}ms ease, height ${durationMs}ms ease` : undefined }}
            />
            <text x={x + barWidth / 2} y={height - padding + 16} textAnchor="middle" fontSize="10" fill="#6b7280" style={{ opacity: progress, transition: animate ? `opacity ${durationMs}ms ease` : undefined }}>
              {d.label}
            </text>
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#374151" style={{ opacity: progress, transition: animate ? `opacity ${durationMs}ms ease` : undefined }}>
              {Math.round(d.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#7c3aed",
]
