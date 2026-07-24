/**
 * PaperworkVisual — the shared marketing snapshot of the compliance window,
 * a 1:1 code mock of the live product (crisp, theme-aware, no raster).
 * Used on the AISolar landing AND the AIOS homescreen — the best part of
 * the SaaS, per Cal.
 */
export default function PaperworkVisual() {
  const rows = [
    { name: 'Sarah McDonald', form: 'NC6', dots: ['moving', 'moving', 'idle'], next: 'SEAI grant application — prepared, ready to send', grant: '\u20ac1,800' },
    { name: 'Siobh\u00e1n Murphy', form: 'NC6', dots: ['done', 'moving', 'idle'], next: 'Single line diagram — generated, engineer stamps', grant: '\u20ac1,800' },
    { name: 'Byrne Agri Ltd', form: 'NC7', dots: ['done', 'done', 'waiting'], next: 'RECI cert — waiting on the electrical contractor', grant: '\u20ac13,200', commercial: true },
  ];
  const dotCls: Record<string, string> = { done: 'bg-doc-deposit', moving: 'bg-tech', waiting: 'bg-doc-proposal', idle: 'bg-muted-foreground/25' };
  return (
    <div className="rounded-[16px] bg-card shadow-card overflow-hidden text-left">
      <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-x-6 gap-y-1">
        <div>
          <div className="text-2xs text-muted-foreground uppercase tracking-wide">Grants in play</div>
          <div className="text-lg font-bold tabular-nums text-doc-deposit">\u20ac16,800</div>
        </div>
        <div>
          <div className="text-2xs text-muted-foreground uppercase tracking-wide">Ready to release</div>
          <div className="text-lg font-bold tabular-nums">1</div>
        </div>
        <span className="ml-auto text-2xs text-muted-foreground">agents prepare \u00b7 track \u00b7 chase</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map(r => (
          <div key={r.name} className="px-4 py-2.5 flex items-center gap-3">
            <span className="flex items-center gap-1 shrink-0">
              {r.dots.map((d, k) => <span key={k} className={`size-2 rounded-full ${dotCls[d]}`} />)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{r.name}</span>
                <span className="text-2xs rounded-full bg-tech-subtle text-tech px-1.5 py-0.5 font-medium">{r.form}</span>
                {r.commercial && <span className="text-2xs rounded-full bg-doc-contract-subtle text-doc-contract px-1.5 py-0.5 font-medium">Commercial</span>}
              </div>
              <div className="text-2xs text-muted-foreground truncate">Next: {r.next}</div>
            </div>
            <span className="text-xs font-semibold tabular-nums text-doc-deposit shrink-0">{r.grant}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-border text-2xs text-muted-foreground">
        The form picks itself from the inverter \u00b7 the SLD is generated \u2014 ESB won\u2019t take hand-drawn \u00b7 grant amounts indicative
      </div>
    </div>
  );
}

