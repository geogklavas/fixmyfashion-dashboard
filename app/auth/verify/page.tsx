import Link from 'next/link'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (!error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
        <div className="text-sm text-gray-500">Signing you in…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-xl p-8 shadow-sm text-center">
        <div className="text-[#0F6E56] font-semibold text-lg mb-2">FixMyFashion</div>
        <p className="text-sm text-gray-700 mb-4">
          This link has expired or already been used.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-[#0F6E56] text-white px-4 py-2 text-sm font-medium hover:bg-[#0c5c48]"
        >
          Request a new one
        </Link>
      </div>
    </main>
  )
}
