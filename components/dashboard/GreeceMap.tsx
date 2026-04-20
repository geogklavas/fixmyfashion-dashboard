'use client'

import { useState } from 'react'

// Approximate viewbox-relative coordinates for major Greek cities
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  Athens: { x: 270, y: 340 },
  Piraeus: { x: 262, y: 346 },
  Thessaloniki: { x: 230, y: 140 },
  Patras: { x: 180, y: 320 },
  Larissa: { x: 230, y: 220 },
  Heraklion: { x: 320, y: 470 },
  Volos: { x: 240, y: 245 },
  Ioannina: { x: 145, y: 200 },
  Kavala: { x: 290, y: 130 },
  Kalamata: { x: 205, y: 380 },
  Rhodes: { x: 420, y: 430 },
  Chania: { x: 275, y: 468 },
}

// Simplified Greece silhouette (stylised — not cartographically accurate, just a recognisable shape)
const GREECE_PATH = `
M120,180 L140,130 L180,100 L230,95 L280,105 L320,125 L330,155 L305,175 L280,165 L255,185 L265,215 L240,230
L225,260 L240,290 L215,310 L190,305 L160,320 L140,300 L125,270 L105,245 L115,215 Z
M160,325 L200,330 L235,345 L260,365 L250,395 L225,405 L195,395 L175,375 L160,350 Z
M240,340 L275,335 L290,360 L280,380 L250,390 Z
M280,450 L320,445 L360,455 L335,475 L305,475 Z
`.trim()

export function GreeceMap({
  pins,
  total,
}: {
  pins: { city: string; count: number }[]
  total: number
}) {
  const [hover, setHover] = useState<{ city: string; count: number } | null>(null)

  const maxCount = Math.max(...pins.map((p) => p.count), 1)

  return (
    <div className="relative">
      <svg viewBox="0 0 500 520" className="w-full h-auto">
        <path d={GREECE_PATH} fill="#f1f5f3" stroke="#cbd5d0" strokeWidth="1" />
        {pins.map((pin) => {
          const coord = CITY_COORDS[pin.city]
          if (!coord) return null
          const ratio = pin.count / maxCount
          const r = 6 + ratio * 18
          const opacity = 0.4 + ratio * 0.6
          return (
            <g
              key={pin.city}
              onMouseEnter={() => setHover(pin)}
              onMouseLeave={() => setHover(null)}
              className="cursor-default"
            >
              <circle cx={coord.x} cy={coord.y} r={r} fill="#0F6E56" opacity={opacity} />
              <circle cx={coord.x} cy={coord.y} r={Math.max(2, r / 4)} fill="#ffffff" />
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
