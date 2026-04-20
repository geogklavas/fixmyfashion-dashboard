'use client'

import { useState } from 'react'

// Projection: lon 19..28 → x 0..500, lat 42..34 → y 0..520
function proj(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - 19) / 9) * 500
  const y = ((42 - lat) / 8) * 520
  return { x: +x.toFixed(1), y: +y.toFixed(1) }
}

function poly(coords: [number, number][]): string {
  return coords
    .map(([lon, lat], i) => {
      const { x, y } = proj(lon, lat)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ') + ' Z'
}

// Simplified Greece mainland + Peloponnese — traced from real coastline landmarks
// (counterclockwise starting from NW Epirus)
const MAINLAND = poly([
  [19.4, 39.8], // Albanian border/Corfu coast
  [20.0, 40.1],
  [20.3, 40.6],
  [20.8, 40.9],
  [21.3, 40.9],
  [21.8, 41.1],
  [22.4, 41.2],
  [22.9, 41.3],
  [23.5, 41.4],
  [24.1, 41.5],
  [24.8, 41.5],
  [25.4, 41.3],
  [26.0, 41.3],
  [26.4, 41.0],
  [26.3, 40.9], // Turkish border (Evros)
  [26.1, 40.8],
  [25.8, 40.9],
  [25.3, 40.7],
  [24.8, 40.6],
  [24.3, 40.6], // Thracian coast
  [23.9, 40.3],
  [24.4, 40.1], // Kavala peninsula
  [24.0, 39.9],
  [23.8, 40.1],
  [23.4, 40.2], // Chalcidice gulf
  [23.9, 40.0],
  [24.0, 39.7], // Athos tip
  [23.7, 40.0],
  [23.3, 39.9], // Sithonia
  [23.2, 40.3],
  [22.9, 40.5], // Thessaloniki
  [22.6, 40.5],
  [22.9, 40.3],
  [22.8, 39.9], // Pelion area
  [23.2, 39.4], // Euboea north
  [23.5, 39.1],
  [24.0, 38.6], // Euboea (stylised — actually an island, kept attached for simplicity)
  [23.8, 38.2],
  [24.0, 37.7], // Cape Sounion
  [23.6, 37.7], // Athens/Attica
  [23.0, 37.7],
  [22.7, 37.7], // Corinth canal
  [22.9, 37.4],
  [23.2, 37.1], // E Peloponnese
  [23.0, 36.9],
  [22.7, 36.8], // Cape Malea
  [22.5, 36.5],
  [22.3, 36.7],
  [22.3, 36.9],
  [22.0, 36.8], // Mani
  [21.7, 36.8],
  [21.5, 37.0], // Messenia
  [21.4, 37.3],
  [21.4, 37.7], // W Peloponnese
  [21.3, 38.0],
  [21.7, 38.3], // Patras gulf
  [21.3, 38.4],
  [20.9, 38.5], // Aetolia
  [20.6, 38.8],
  [20.5, 39.1], // Ambracian gulf
  [20.2, 39.3],
  [20.1, 39.6], // Epirus coast
  [19.7, 39.7],
])

const CRETE = poly([
  [23.5, 35.6],
  [24.1, 35.7],
  [24.6, 35.5],
  [25.2, 35.4],
  [25.7, 35.3],
  [26.2, 35.3],
  [26.3, 35.2],
  [26.0, 35.0],
  [25.5, 35.0],
  [25.0, 35.0],
  [24.4, 35.1],
  [23.9, 35.2],
  [23.5, 35.3],
])

const RHODES = poly([
  [27.9, 36.4],
  [28.2, 36.4],
  [28.3, 36.2],
  [28.2, 35.9],
  [27.9, 36.0],
  [27.8, 36.2],
])

const CORFU = poly([
  [19.6, 39.8],
  [19.9, 39.8],
  [20.0, 39.6],
  [19.8, 39.4],
  [19.6, 39.6],
])

const CITY_COORDS: Record<string, { x: number; y: number }> = {
  Thessaloniki: proj(22.96, 40.65),
  Kavala: proj(24.4, 40.94),
  Ioannina: proj(20.85, 39.67),
  Larissa: proj(22.42, 39.64),
  Volos: proj(22.94, 39.37),
  Patras: proj(21.73, 38.25),
  Athens: proj(23.73, 37.98),
  Piraeus: proj(23.64, 37.94),
  Kalamata: proj(22.11, 37.04),
  Chania: proj(24.02, 35.51),
  Heraklion: proj(25.13, 35.34),
  Rhodes: proj(28.22, 36.44),
}

const LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  Athens: { dx: 14, dy: 4 },
  Piraeus: { dx: 14, dy: 16 },
  Thessaloniki: { dx: 14, dy: 4 },
  Kavala: { dx: 14, dy: 4 },
  Ioannina: { dx: -10, dy: 4 },
  Larissa: { dx: 12, dy: -6 },
  Volos: { dx: 14, dy: 4 },
  Patras: { dx: -10, dy: 4 },
  Kalamata: { dx: -10, dy: 4 },
  Chania: { dx: -10, dy: -6 },
  Heraklion: { dx: 14, dy: -4 },
  Rhodes: { dx: 14, dy: 4 },
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
        {/* Sea background */}
        <rect x="0" y="0" width="500" height="520" fill="#f0f7f5" />

        {/* Land masses */}
        <g fill="#e1ebe6" stroke="#b5c7be" strokeWidth="0.8" strokeLinejoin="round">
          <path d={MAINLAND} />
          <path d={CRETE} />
          <path d={RHODES} />
          <path d={CORFU} />
        </g>

        {/* Sea labels */}
        <text x="400" y="240" fill="#9ca3af" fontSize="11" fontStyle="italic" textAnchor="middle">
          Aegean Sea
        </text>
        <text x="70" y="280" fill="#9ca3af" fontSize="11" fontStyle="italic" textAnchor="middle">
          Ionian Sea
        </text>

        {/* Pins */}
        {visible.map((pin) => {
          const coord = CITY_COORDS[pin.city]
          const ratio = pin.count / maxCount
          const r = 6 + ratio * 20
          const off = LABEL_OFFSET[pin.city] ?? { dx: 12, dy: 4 }
          const anchor = off.dx < 0 ? 'end' : 'start'
          return (
            <g key={pin.city} onMouseEnter={() => setHover(pin)} onMouseLeave={() => setHover(null)}>
              <circle cx={coord.x} cy={coord.y} r={r + 4} fill="#0F6E56" opacity={0.12} />
              <circle cx={coord.x} cy={coord.y} r={r} fill="#0F6E56" opacity={0.35 + ratio * 0.6} />
              <circle cx={coord.x} cy={coord.y} r={Math.max(3, r / 3)} fill="#ffffff" />
              <text
                x={coord.x + off.dx}
                y={coord.y + off.dy}
                fill="#1a1a1a"
                fontSize="11"
                fontWeight={pin.count >= maxCount * 0.3 ? 600 : 400}
                textAnchor={anchor}
              >
                {pin.city}
              </text>
              <text
                x={coord.x + off.dx}
                y={coord.y + off.dy + 12}
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
