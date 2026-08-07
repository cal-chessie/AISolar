/**
 * ProductSnapshot — the gear shown as a real product, not a model code.
 *
 * The consultant's proposal used to list "20 × TSM-440" in a grey box. This
 * shows it the way the homeowner's copy does: the product's photo (or a clean
 * kind-tinted fallback until the owner uploads one — never a broken image), the
 * headline spec, the warranty, and the one plain-English line that makes the
 * homeowner nod. Reads from the SAME getProduct the customer proposal uses, so
 * the consultant is looking at exactly what the customer will.
 */
import { Sun, Zap, Battery, FileText, Plug, Car } from 'lucide-react';
import type { CatalogProduct } from '@/config/productCatalog';

const KIND: Record<CatalogProduct['kind'], { icon: typeof Sun; label: string; tint: string }> = {
  panel:    { icon: Sun,     label: 'Solar panels',   tint: 'text-tech bg-tech-subtle' },
  inverter: { icon: Zap,     label: 'Inverter',       tint: 'text-primary bg-primary/10' },
  battery:  { icon: Battery, label: 'Battery storage', tint: 'text-doc-deposit bg-doc-deposit/10' },
  diverter: { icon: Plug,    label: 'Power diverter', tint: 'text-primary bg-primary/10' },
  charger:  { icon: Car,     label: 'EV charger',     tint: 'text-tech bg-tech-subtle' },
};

export default function ProductSnapshot({ product, qty, dense = false }: {
  product: CatalogProduct;
  qty?: number;
  dense?: boolean;
}) {
  const k = KIND[product.kind];
  const Icon = k.icon;
  return (
    <article className="flex gap-3 rounded-control border border-border bg-card p-3">
      <div className={`${dense ? 'size-16' : 'size-20'} shrink-0 rounded-md border border-border grid place-items-center overflow-hidden ${product.image ? 'bg-muted/40' : k.tint}`}>
        {product.image ? (
          <img src={product.image} alt={product.model} className="size-full object-contain" loading="lazy" />
        ) : (
          <Icon className={`${dense ? 'size-6' : 'size-8'} opacity-80`} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="label-micro">{k.label}</div>
        <h4 className="text-sm font-semibold truncate">{qty ? `${qty} × ` : ''}{product.model}</h4>
        <p className="text-xs text-muted-foreground">{product.spec} · {product.warrantyYears}-yr warranty</p>
        <p className="text-xs text-muted-foreground mt-1 leading-ui">{product.blurb}</p>
        {product.datasheet && (
          <a href={product.datasheet} target="_blank" rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <FileText className="size-3" /> Data sheet
          </a>
        )}
      </div>
    </article>
  );
}
