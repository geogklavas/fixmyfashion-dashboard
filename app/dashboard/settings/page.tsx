import { getSession } from '@/lib/auth'
import { getConfig } from '@/lib/data'
import { getLaunchChecklist } from '@/lib/launch-checklist'
import { PortalQR } from '@/components/dashboard/PortalQR'

export const dynamic = 'force-dynamic'

const CHECKLIST_ITEMS: { key: 'footerDone' | 'emailDone' | 'packagingDone'; label: string }[] = [
  { key: 'footerDone', label: 'Footer link added to brand website' },
  { key: 'emailDone', label: 'Post-purchase email live' },
  { key: 'packagingDone', label: 'Packaging insert ordered' },
]

export default async function SettingsPage() {
  const session = await getSession()
  const [config, checklist] = await Promise.all([
    getConfig(session!.brandHandle),
    getLaunchChecklist(session!.brandHandle),
  ])

  const liveSince = new Date('2026-04-15').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const nextReview = checklist.nextReviewDate
    ? new Date(checklist.nextReviewDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not scheduled yet'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">Settings</h1>
        <p className="text-sm text-gray-500">Your repair portal, allowed categories, and support.</p>
      </div>

      <section className="bg-white border border-black/10 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-gray-700">Your repair portal</h2>
        <Row label="Portal URL" hint="Your branded repair portal">
          <a
            href={`https://${config.portalUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#0F6E56] text-sm font-medium hover:underline"
          >
            {config.portalUrl}
          </a>
        </Row>
        <Row label="QR code" hint="For packaging inserts and in-store use">
          <PortalQR portalUrl={config.portalUrl} brandHandle={config.brandHandle} />
        </Row>
        <Row label="Portal status" hint={`Live since ${liveSince}`}>
          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E1F5EE] text-[#0F6E56]">
            Active
          </span>
        </Row>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Brand launch checklist</h2>
        <p className="text-xs text-gray-500 mb-4">
          FixMyFashion completes these on your behalf and marks them here as they go live.
        </p>
        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = checklist[item.key]
            return (
              <li key={item.key} className="flex items-center gap-3 text-sm">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                    done ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? '✓' : '·'}
                </span>
                <span className={done ? 'text-[#1a1a1a]' : 'text-gray-500'}>{item.label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Allowed repair categories</h2>
        <p className="text-xs text-gray-500 mb-4">
          Services covered by your repair programme.
        </p>
        {config.allowedCategories.length === 0 ? (
          <div className="text-xs text-gray-400">No categories configured yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {config.allowedCategories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#0F6E56] border border-[#5DCAA5]/30"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Need to change? Contact{' '}
          <a href="mailto:support@fixmyfashion.gr" className="text-[#0F6E56] font-medium hover:underline">
            support@fixmyfashion.gr
          </a>
          .
        </p>
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-gray-700">Support</h2>
        <Row label="Account manager" hint="Giorgos Gklavas · FixMyFashion">
          <div className="flex gap-3 items-center">
            <a
              href="mailto:support@fixmyfashion.gr"
              className="text-[#0F6E56] text-sm font-medium hover:underline"
            >
              Contact
            </a>
            <a
              href="https://calendly.com/fixmyfashion/quarterly-review"
              target="_blank"
              rel="noreferrer"
              className="text-[#0F6E56] text-sm font-medium hover:underline"
            >
              Book a call
            </a>
          </div>
        </Row>
        <Row label="Next quarterly review" hint="Scheduled with your account manager">
          <span className="text-sm text-[#1a1a1a]">{nextReview}</span>
        </Row>
      </section>
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-t border-black/5 first:border-t-0">
      <div>
        <div className="text-sm font-medium text-[#1a1a1a]">{label}</div>
        <div className="text-xs text-gray-500">{hint}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}
