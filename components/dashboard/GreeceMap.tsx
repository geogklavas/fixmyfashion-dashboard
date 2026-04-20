'use client'

import { useState } from 'react'

// Approximate lat/lon for major Greek cities, normalised to an SVG viewbox
// viewBox is 0..500 wide, 0..520 tall
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  Thessaloniki: { x: 252, y: 100 },
  Kavala: { x: 320, y: 95 },
  Ioannina: { x: 140, y: 175 },
  Larissa: { x: 245, y: 195 },
  Volos: { x: 265, y: 225 },
  Patras: { x: 175, y: 295 },
  Athens: { x: 275, y: 325 },
  Piraeus: { x: 269, y: 332 },
  Kalamata: { x: 210, y: 380 },
  Chania: { x: 255, y: 470 },
  Heraklion: { x: 310, y: 470 },
  Rhodes: { x: 430, y: 410 },
}

const TOTAL_LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  Athens: { dx: 12, dy: 4 },
  Piraeus: { dx: 12, dy: 14 },
  Thessaloniki: { dx: 12, dy: 4 },
  Kavala: { dx: 10, dy: 4 },
  Ioannina: { dx: -10, dy: 4 },
  Larissa: { dx: 10, dy: -4 },
  Volos: { dx: 10, dy: 4 },
  Patras: { dx: -10, dy: 4 },
  Kalamata: { dx: -10, dy: 4 },
  Chania: { dx: -10, dy: 4 },
  Heraklion: { dx: 10, dy: 4 },
  Rhodes: { dx: 10, dy: 4 },
}

export function GreeceMap({
  pins,
  total,
}: {
  pins: { city: string; count: number }[]
  total: number
}) {
  const [hover, setHover] = useState<{ city: string; count: number } | null>(null)

  const visible = pins.filter((p) => CITY_COORDS[p.city])
  const maxCount = Math.max(...visible.map((p) => p.count), 1)

  return (
    <div className="relative">
      <svg viewBox="0 0 500 520" className="w-full h-auto">
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#d1d5db" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="500" height="520" fill="url(#dotgrid)" opacity="0.5" />

        {/* Aegean label */}
        <text x="380" y="250" fill="#9ca3af" fontSize="10" fontStyle="italic" textAnchor="middle">
          Aegean
        </text>
        {/* Ionian label */}
        <text x="90" y="300" fill="#9ca3af" fontSize="10" fontStyle="italic" textAnchor="middle">
          Ionian
        </text>
        {/* Crete label */}
        <text x="285" y="495" fill="#9ca3af" fontSize="10" fontStyle="italic" textAnchor="middle">
          Crete
        </text>

        {visible.map((pin) => {
          const coord = CITY_COORDS[pin.city]
          const ratio = pin.count / maxCount
          const r = 8 + ratio * 22
          const labelOffset = TOTAL_LABEL_OFFSET[pin.city] ?? { dx: 12, dy: 4 }
          const anchor = labelOffset.dx < 0 ? 'end' : 'start'
          return (
            <g
              key={pin.city}
              onMouseEnter={() => setHover(pin)}
              onMouseLeave={() => setHover(null)}
            >
              <circle cx={coord.x} cy={coord.y} r={r + 4} fill="#0F6E56" opacity={0.1} />
              <circle cx={coord.x} cy={coord.y} r={r} fill="#0F6E56" opacity={0.3 + ratio * 0.6} />
              <circle cx={coord.x} cy={coord.y} r={Math.max(3, r / 3)} fill="#ffffff" />
              <text
                x={coord.x + labelOffset.dx}
                y={coord.y + labelOffset.dy}
                fill="#1a1a1a"
                fontSize="11"
                fontWeight={pin.count >= maxCount * 0.3 ? 600 : 400}
                textAnchor={anchor}
              >
                {pin.city}
              </text>
              <text
                x={coord.x + labelOffset.dx}
                y={coord.y + labelOffset.dy + 12}
                fill="#6b7280"
                fontSize="10"
                textAnchor={anchor}
              >
                {pin.count}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="absolute top-2 right-2 bg-white border border-black/10 rounded-lg px-3 py-2 text-xs shadow-sm">
          <div className="font-medium text-[#1a1a1a]">{hover.city}</div>
          <div className="text-gray-500">{hover.count} repairs</div>
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">
        Anonymised pickup points. Based on {total.toLocaleString()} total repairs.
      </div>
    </div>
  )
}
