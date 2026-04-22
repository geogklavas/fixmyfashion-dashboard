// Per SPEC §Error Handling: empty state (0 repairs) shows a friendly message
// + the brand portal URL so the brand can promote it to customers.

export function NoRepairsYet({ portalUrl }: { portalUrl: string }) {
  return (
    <div className="bg-white border border-dashed border-black/15 rounded-xl p-8 text-center">
      <div className="text-2xl mb-2">🪡</div>
      <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">No repairs yet — your portal is live and ready.</h3>
      <p className="text-sm text-gray-500 mb-4">
        Promote your branded portal to start receiving repair requests. Once orders flow in, this dashboard fills with
        live data automatically.
      </p>
      <a
        href={`https://${portalUrl}`}
        target="_blank"
        rel="noreferrer"
        className="inline-block px-4 py-2 rounded-lg bg-[#0F6E56] text-white text-sm font-medium hover:bg-[#0c5c48]"
      >
        Open {portalUrl} →
      </a>
    </div>
  )
}
