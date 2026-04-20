'use client'

const WIDTH = 600
const HEIGHT = 240

function svgMarkup(brandName: string, garments: number, co2Kg: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0F6E56" rx="16"/>
  <text x="32" y="48" fill="#E1F5EE" font-family="system-ui, -apple-system, sans-serif" font-size="12" letter-spacing="2">REPAIRS BY FIXMYFASHION</text>
  <text x="32" y="92" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600">${brandName}</text>
  <text x="32" y="152" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">${garments.toLocaleString()}</text>
  <text x="32" y="178" fill="#E1F5EE" font-family="system-ui, -apple-system, sans-serif" font-size="13">garments repaired</text>
  <text x="320" y="152" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">${co2Kg.toLocaleString()} kg</text>
  <text x="320" y="178" fill="#E1F5EE" font-family="system-ui, -apple-system, sans-serif" font-size="13">CO₂ saved vs replacement</text>
  <text x="32" y="216" fill="#5DCAA5" font-family="system-ui, -apple-system, sans-serif" font-size="11">fixmyfashion.gr</text>
</svg>`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function SustainabilityBadge({
  brandName,
  garments,
  co2Kg,
}: {
  brandName: string
  garments: number
  co2Kg: number
}) {
  const svg = svgMarkup(brandName, garments, co2Kg)

  function downloadSVG() {
    triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `fmf-badge-${brandName}.svg`)
  }

  function downloadPNG() {
    const img = new Image()
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = WIDTH * 2
      canvas.height = HEIGHT * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, `fmf-badge-${brandName}.png`)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  return (
    <div className="bg-white border border-black/10 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Sustainability badge</h3>
      <div
        className="rounded-lg overflow-hidden mb-4"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={downloadPNG}
          className="px-3 py-1.5 rounded-lg bg-[#0F6E56] text-white text-xs font-medium hover:bg-[#0c5c48]"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSVG}
          className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium hover:bg-gray-50"
        >
          Download SVG
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Use this badge on your website, sustainability report, or social posts.
      </p>
    </div>
  )
}
