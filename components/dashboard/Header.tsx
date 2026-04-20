'use client'

export function Header({
  brandName,
  primaryColor,
}: {
  brandName: string
  primaryColor: string
}) {
  const initials = brandName
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <header className="px-6 py-5 flex items-center justify-between border-b border-black/10 bg-white">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ background: primaryColor }}
        >
          {initials || 'FM'}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Repairs by FixMyFashion</div>
          <div className="text-base font-semibold text-[#1a1a1a]">{brandName}</div>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="text-xs text-gray-500 hover:text-gray-800 transition"
      >
        Log out
      </button>
    </header>
  )
}
