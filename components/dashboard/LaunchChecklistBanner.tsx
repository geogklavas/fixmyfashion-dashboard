import type { LaunchChecklist } from '@/lib/launch-checklist'

const ITEMS: { key: keyof LaunchChecklist; label: string }[] = [
  { key: 'footerDone', label: 'Footer link added to brand website' },
  { key: 'emailDone', label: 'Post-purchase email live' },
  { key: 'packagingDone', label: 'Packaging insert ordered' },
]

export function LaunchChecklistBanner({ checklist }: { checklist: LaunchChecklist }) {
  return (
    <section className="bg-[#FAEEDA] border border-[#E8C98D] rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#7A4E0F]">Activate all 3 promotion touchpoints to reach 45+ repairs/month</h2>
          <p className="text-xs text-[#8B6A3A] mt-0.5">
            FixMyFashion completes these on your behalf and marks them here as they go live.
          </p>
        </div>
        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const done = !!checklist[item.key]
            return (
              <li
                key={item.key}
                className={`flex items-center gap-2 text-xs ${done ? 'text-[#0F6E56]' : 'text-[#7A4E0F]'}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    done ? 'bg-[#0F6E56] text-white' : 'bg-[#E8C98D] text-[#7A4E0F]'
                  }`}
                >
                  {done ? '✓' : '·'}
                </span>
                <span>{item.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
