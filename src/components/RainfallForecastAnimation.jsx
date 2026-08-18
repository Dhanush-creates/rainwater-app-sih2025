import { useMemo } from 'react'
import { motion } from 'framer-motion'

// Chart visualization of upcoming rainfall using forecast data (4 days, no animations)
export default function RainfallForecastAnimation({ forecast = [] }) {
  const days = useMemo(() => {
    if (!Array.isArray(forecast)) return []
    return forecast.slice(0, 4)
  }, [forecast])

  if (days.length === 0) return null

  const maxVal = Math.max(1, ...days.map(d => d?.day?.totalprecip_mm || 0))
  const paddedMax = Math.ceil(maxVal * 1.25)

  const colorByIntensity = (intensity) => {
    const i = String(intensity || '').toLowerCase()
    if (i.includes('heavy')) return 'from-indigo-700 to-blue-600'
    if (i.includes('moderate')) return 'from-blue-600 to-cyan-500'
    return 'from-sky-400 to-sky-300'
  }

  // Build coordinates for main line chart
  const coords = days.map((d, idx) => {
    const v = d?.day?.totalprecip_mm || 0
    const x = 10 + (idx / (days.length - 1)) * 80 // 10% padding left/right
    const y = 80 - (v / paddedMax) * 60 // 20% top/bottom padding area (20..80)
    return { x, y, v, label: d.date ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }) : `D${idx+1}` }
  })

  const polylinePoints = coords.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M ${coords[0].x},80 L ${coords.map(p => `${p.x},${p.y}`).join(' L ')} L ${coords[coords.length-1].x},80 Z`

  // Simple rain animation density based on average mm
  const total = days.reduce((s, d) => s + (d?.day?.totalprecip_mm || 0), 0)
  const avg = total / days.length
  const dropCount = avg >= 12 ? 140 : avg >= 8 ? 90 : avg >= 3 ? 40 : 15
  const dropSpeed = avg >= 12 ? 900 : avg >= 8 ? 1200 : 1600

  return (
    <div className="rounded-2xl border border-blue-200 bg-white shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-sky-50 to-cyan-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div className="text-slate-700 font-semibold">Upcoming Rainfall (next 4 days)</div>
        </div>
        <div className="text-xs text-slate-500">mm · estimated precipitation</div>
      </div>

      {/* Split content: chart + ambient animation */}
      <div className="grid md:grid-cols-2">
        {/* Main Chart */}
        <div className="relative p-4">
          <svg viewBox="0 0 100 100" className="w-full h-72">
          {/* defs for gradient */}
          <defs>
            <linearGradient id="rain-line" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="rain-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0,1,2,3].map(i => (
            <line key={i} x1={10} x2={90} y1={20 + i*20} y2={20 + i*20} stroke="#e5e7eb" strokeDasharray="2 3" />
          ))}
          {[0,1,2,3].map(i => (
            <line key={`v${i}`} x1={10 + i*20} x2={10 + i*20} y1={20} y2={80} stroke="#eef2f7" />
          ))}

          {/* area under curve */}
          <path d={areaPath} fill="url(#rain-area)" />
          {/* line */}
          <polyline points={polylinePoints} fill="none" stroke="url(#rain-line)" strokeWidth="2.5" />

          {/* points */}
          {coords.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="1.8" fill="#0ea5e9" />
              {/* value label */}
              <text x={p.x} y={p.y - 3} textAnchor="middle" fontSize="3" fill="#0f172a">{p.v}mm</text>
              {/* day label */}
              <text x={p.x} y={85} textAnchor="middle" fontSize="3.2" fill="#334155">{p.label}</text>
            </g>
          ))}

          {/* y-axis labels */}
          {[0, 0.5, 1].map((t, idx) => (
            <text key={idx} x={6} y={80 - t*60} textAnchor="end" fontSize="3" fill="#64748b">{Math.round(paddedMax*t)}mm</text>
          ))}
          </svg>
        </div>

        {/* Ambient animation panel */}
        <div className="relative overflow-hidden min-h-[18rem] bg-gradient-to-b from-sky-100 to-sky-200">
          {/* clouds */}
          <motion.div className="absolute top-6 left-4 w-24 h-10 bg-white/70 rounded-full"
            animate={{ x: [0, 60, 0] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="absolute top-14 right-6 w-16 h-8 bg-white/60 rounded-full"
            animate={{ x: [0, -50, 0] }} transition={{ duration: 12, repeat: Infinity }} />

          {/* raindrops density by avg */}
          {Array.from({ length: dropCount }).map((_, i) => {
            const left = Math.random() * 100
            const delay = Math.random() * 1.2
            const size = avg >= 12 ? 2.5 : avg >= 8 ? 2 : 1.5
            return (
              <motion.span
                key={i}
                className="absolute bg-blue-500/70"
                style={{ left: `${left}%`, width: `${size}px`, height: `${size * 10}px`, borderRadius: '2px' }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 340, opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: dropSpeed / 1000, delay, repeat: Infinity, ease: 'linear' }}
              />
            )
          })}

          {/* summary badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-2 text-xs text-slate-700 shadow">
            Next 4 days total: <span className="font-semibold">{total} mm</span>
          </div>
        </div>
      </div>
    </div>
  )
}


