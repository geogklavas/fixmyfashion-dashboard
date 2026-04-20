import { getSession } from '@/lib/auth'
import { getConfig } from '@/lib/data'
import { PortalQR } from '@/components/dashboard/PortalQR'
import { CategoryToggles } from '@/components/dashboard/CategoryToggles'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  const config = await getConfig(session!.brandHandle)

  const liveSince = new Date('2026-04-15').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
        <h2 className="text-sm font-medium text-gray-700 mb-1">Allowed repair categories</h2>
        <p className="text-xs text-gray-500 mb-4">
          Toggle categories and request an update. Changes are reviewed by FixMyFashion before going live.
        </p>
        <CategoryToggles initial={config.allowedCategories} />
      </section>

      <section className="bg-white border border-black/10 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-gray-700">Support</h2>
        <Row label="Account manager" hint="Giorgos Gklavas · FixMyFashion">
          <a
            href="mailto:hello@fixmyfashion.gr"
            className="text-[#0F6E56] text-sm font-medium hover:underline"
          >
            Contact
          </a>
        </Row>
        <Row label="Next quarterly review" hint="Scheduled with your account manager">
          <span className="text-sm text-[#1a1a1a]">July 2026</span>
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
