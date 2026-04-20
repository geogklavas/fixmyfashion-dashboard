'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export function PortalQR({ portalUrl, brandHandle }: { portalUrl: string; brandHandle: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(
      canvasRef.current,
      `https://${portalUrl}`,
      { width: 160, margin: 1, color: { dark: '#0F6E56', light: '#ffffff' } },
      (err) => {
        if (!err) setReady(true)
      },
    )
  }, [portalUrl])

  function downloadPNG() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fmf-portal-qr-${brandHandle}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="flex items-center gap-4">
      <canvas ref={canvasRef} className="border border-black/10 rounded-lg bg-white" />
      <button
        onClick={downloadPNG}
        disabled={!ready}
        className="px-3 py-1.5 rounded-lg bg-[#0F6E56] text-white text-xs font-medium hover:bg-[#0c5c48] disabled:opacity-50"
      >
        Download PNG
      </button>
    </div>
  )
}
