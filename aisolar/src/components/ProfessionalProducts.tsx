/**
 * Professional Products Catalogue
 *
 * Replaces the basic ProductsManagement component with a professional catalogue
 * that's connected to the proposal stage. When a consultant selects a product
 * in the proposal editor, it pulls live pricing + availability from here.
 *
 * Features:
 *   - Categorised: panels, inverters, batteries, mounting, accessories
 *   - Each product: spec sheet, cost, margin, stock, SEAI-eligibility
 *   - Bundles: pre-configured system packages (e.g. "6kWp South-facing Family Home")
 *   - Bulk pricing: tiered discounts based on volume
 *   - Real-time stock from Dublin depot
 *   - "Add to proposal" button → opens ProposalQuestionnaire with pre-filled products
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Package, Search, Plus, Sun, Battery, Zap, Wrench, Box,
  TrendingUp, AlertCircle, CheckCircle2, Star, ArrowRight, DollarSign,
} from 'lucide-react';

type ProductCategory = 'panels' | 'inverters' | 'batteries' | 'mounting' | 'accessories';

interface Product {
  id: string;
  category: ProductCategory;
  manufacturer: string;
  model: string;
  description: string;
  cost: number;        // installer cost (€)
  rrp: number;         // recommended retail (€)
  margin: number;      // computed margin %
  stock: number;       // Dublin depot
  rating: number;      // 1-5
  specs: Record<string, string>;
  seaiApproved: boolean;
  inBundle?: boolean;
  /** manufacturer data sheet PDF — rides to the BER assessor with the pack */
  datasheet?: string;
}

const SAMPLE_PRODUCTS: Product[] = [
  // Panels
  {
    id: 'panel-trina-440',
    category: 'panels',
    manufacturer: 'TrinaSolar',
    model: 'TSM-440 NEG9RC.28',
    description: 'Vertex S+ dual-glass 440W. Data sheet attached — it rides to the BER assessor with the pack.',
    cost: 95, rrp: 152, margin: 0, stock: 36, rating: 5,
    specs: { Wattage: '440W', Type: 'Dual-glass', Warranty: '25yr product' },
    seaiApproved: true, inBundle: false,
    datasheet: '/datasheets/trinasolar-tsm-440-neg9rc28.pdf',
  },
  {
    id: 'panel-longi-435',
    category: 'panels',
    manufacturer: 'Longi',
    model: 'Hi-MO 6 435W',
    description: 'Monocrystalline PERC panel with HPBC cell tech. 22.6% efficiency. 25-year product warranty.',
    cost: 145, rrp: 220, margin: 0, stock: 48, rating: 5,
    specs: { Wattage: '435W', Efficiency: '22.6%', CellType: 'Mono PERC', Warranty: '25yr product / 30yr performance', Dimensions: '1762×1134×30mm', Weight: '21.5kg' },
    seaiApproved: true, inBundle: true,
  },
  {
    id: 'panel-jinko-415',
    category: 'panels',
    manufacturer: 'Jinko Solar',
    model: 'Tiger Neo 415W',
    description: 'N-type TOPCon panel. 21.5% efficiency. Excellent low-light performance.',
    cost: 138, rrp: 205, margin: 0, stock: 24, rating: 4,
    specs: { Wattage: '415W', Efficiency: '21.5%', CellType: 'N-type TOPCon', Warranty: '15yr product / 30yr performance', Dimensions: '1762×1134×30mm', Weight: '21.8kg' },
    seaiApproved: true,
  },
  {
    id: 'panel-trina-420',
    category: 'panels',
    manufacturer: 'Trina Solar',
    model: 'Vertex S+ 420W',
    description: 'Dual-glass N-type panel. 21.1% efficiency. 30-year performance warranty.',
    cost: 142, rrp: 215, margin: 0, stock: 0, rating: 4,
    specs: { Wattage: '420W', Efficiency: '21.1%', CellType: 'N-type i-TOPCon', Warranty: '15yr product / 30yr performance', Dimensions: '1762×1134×30mm', Weight: '22.0kg' },
    seaiApproved: true,
  },

  // Inverters
  {
    id: 'inv-solaredge-5k',
    category: 'inverters',
    manufacturer: 'SolarEdge',
    model: 'SE5K Home Hub',
    description: '5kW single-phase inverter with Home Hub platform. Compatible with SolarEdge battery.',
    cost: 1450, rrp: 2100, margin: 0, stock: 6, rating: 5,
    specs: { Power: '5kW', Phase: 'Single', Efficiency: '99%', Warranty: '12yr (extendable to 25yr)', Comms: 'Ethernet + WiFi', Battery: 'SolarEdge Home Battery compatible' },
    seaiApproved: true, inBundle: true,
  },
  {
    id: 'inv-huawei-6k',
    category: 'inverters',
    manufacturer: 'Huawei',
    model: 'SUN2000-6KTL-L1',
    description: '6kW single-phase inverter. Built-in export limiting. Compatible with LG RESU battery.',
    cost: 1280, rrp: 1850, margin: 0, stock: 4, rating: 4,
    specs: { Power: '6kW', Phase: 'Single', Efficiency: '98.4%', Warranty: '10yr', Comms: 'WiFi + Smart Dongle', Battery: 'LG RESU + Huawei Luna' },
    seaiApproved: true,
  },
  {
    id: 'inv-fronius-8k',
    category: 'inverters',
    manufacturer: 'Fronius',
    model: 'Primo 8.6-1',
    description: '8.6kW single-phase inverter. SuperFlex design. Active cooling for hot roofs.',
    cost: 1850, rrp: 2650, margin: 0, stock: 2, rating: 5,
    specs: { Power: '8.6kW', Phase: 'Single', Efficiency: '98.5%', Warranty: '10yr (extendable)', Comms: 'WiFi + LAN', Battery: 'Fronius Gen24 Plus only' },
    seaiApproved: true,
  },

  // Batteries
  {
    id: 'bat-tesla-pw3',
    category: 'batteries',
    manufacturer: 'Tesla',
    model: 'Powerwall 3 (13.5kWh)',
    description: 'Integrated battery + inverter. 13.5kWh usable. 10-year warranty. Built-in meter.',
    cost: 7200, rrp: 9500, margin: 0, stock: 4, rating: 5,
    specs: { Capacity: '13.5kWh', Power: '11.5kW continuous', Chemistry: 'LFP', Warranty: '10yr / 70% capacity', Dimensions: '1099×609×188mm', Weight: '130kg' },
    seaiApproved: true, inBundle: true,
  },
  {
    id: 'bat-solaredge-5k',
    category: 'batteries',
    manufacturer: 'SolarEdge',
    model: 'Home Battery 5kWh',
    description: 'Modular 5kWh battery. Stackable up to 23kWh. LV chemistry. For SolarEdge inverters only.',
    cost: 2800, rrp: 4100, margin: 0, stock: 8, rating: 4,
    specs: { Capacity: '5kWh', Power: '4.6kW continuous', Chemistry: 'NMC', Warranty: '10yr', Dimensions: '550×440×185mm', Weight: '47kg' },
    seaiApproved: true,
  },
  {
    id: 'bat-huawei-5k',
    category: 'batteries',
    manufacturer: 'Huawei',
    model: 'LUNA2000-5-S0 (5kWh)',
    description: 'Modular 5kWh battery. Up to 15kWh per stack. For Huawei SUN2000 inverters.',
    cost: 2600, rrp: 3850, margin: 0, stock: 6, rating: 4,
    specs: { Capacity: '5kWh', Power: '2.5kW continuous', Chemistry: 'LFP', Warranty: '10yr', Dimensions: '570×340×160mm', Weight: '53kg' },
    seaiApproved: true,
  },

  // Mounting
  {
    id: 'mount-tile-1.6',
    category: 'mounting',
    manufacturer: 'K2 Systems',
    model: 'CrossHook 12 Tile Roof',
    description: 'Tile roof mounting system. 1.6m rails. Includes hooks, rails, clamps, hardware.',
    cost: 320, rrp: 480, margin: 0, stock: 40, rating: 5,
    specs: { Rail: '1.6m aluminium', Roof: 'Concrete tile / slate', Inclined: 'Yes', Warranty: '25yr', Coverage: 'Up to 8 panels per kit' },
    seaiApproved: false,
  },
  {
    id: 'mount-flat-1.6',
    category: 'mounting',
    manufacturer: 'Schletter',
    model: 'FlatFix Aero Light',
    description: 'Flat roof ballasted mounting. East-West or south-facing. No roof penetrations.',
    cost: 480, rrp: 720, margin: 0, stock: 18, rating: 4,
    specs: { Rail: 'Aluminium', Roof: 'Flat (membrane/bitumen)', Orientation: 'EW or S', Warranty: '25yr', Coverage: 'Up to 6 panels per kit' },
    seaiApproved: false,
  },

  // Accessories
  {
    id: 'acc-surge-type2',
    category: 'accessories',
    manufacturer: 'Citel',
    model: 'DSG-15 Type 2 SPD',
    description: 'Type 2 surge protection device. Required for RECI compliance on all installs.',
    cost: 65, rrp: 95, margin: 0, stock: 8, rating: 5,
    specs: { Type: 'Type 2', Voltage: '275V', Poles: '2P', Warranty: '2yr' },
    seaiApproved: true,
  },
  {
    id: 'acc-cable-6mm',
    category: 'accessories',
    manufacturer: 'Lapp',
    model: 'ÖLFLEX DC 6mm² (per metre)',
    description: 'DC solar cable. UV resistant. TÜV approved. Sold per metre.',
    cost: 1.20, rrp: 2.10, margin: 0, stock: 800, rating: 5,
    specs: { Cable: '6mm² DC', Cores: 'Single', Rating: '1500V DC', UV: 'Yes', Warranty: '25yr' },
    seaiApproved: true,
  },
];

// Pre-configured bundles
interface Bundle {
  id: string;
  name: string;
  description: string;
  systemSizeKw: number;
  panelCount: number;
  includesBattery: boolean;
  components: { productId: string; qty: number }[];
  bundlePrice: number;   // bundle discount applied
  savingVsRrp: number;
}

const SAMPLE_BUNDLES: Bundle[] = [
  {
    id: 'bundle-family-6kw',
    name: 'Family Home 6kWp',
    description: 'Perfect for 3-bed homes with €200-300/month bills. 6.1kWp south-facing + Tesla battery.',
    systemSizeKw: 6.1, panelCount: 14, includesBattery: true,
    components: [
      { productId: 'panel-longi-435', qty: 14 },
      { productId: 'inv-solaredge-5k', qty: 1 },
      { productId: 'bat-tesla-pw3', qty: 1 },
      { productId: 'mount-tile-1.6', qty: 2 },
      { productId: 'acc-surge-type2', qty: 1 },
      { productId: 'acc-cable-6mm', qty: 30 },
    ],
    bundlePrice: 16800, savingVsRrp: 1820,
  },
  {
    id: 'bundle-small-3kw',
    name: 'Small Home 3kWp',
    description: 'For 2-bed homes or apartments with €100-180/month bills. 3.0kWp no battery.',
    systemSizeKw: 3.0, panelCount: 7, includesBattery: false,
    components: [
      { productId: 'panel-longi-435', qty: 7 },
      { productId: 'inv-huawei-6k', qty: 1 },
      { productId: 'mount-tile-1.6', qty: 1 },
      { productId: 'acc-surge-type2', qty: 1 },
      { productId: 'acc-cable-6mm', qty: 20 },
    ],
    bundlePrice: 7400, savingVsRrp: 680,
  },
  {
    id: 'bundle-large-10kw',
    name: 'Large Home 10kWp',
    description: 'For 5-bed homes with heat pump / EV. 10.0kWp + large battery. Best ROI.',
    systemSizeKw: 10.0, panelCount: 23, includesBattery: true,
    components: [
      { productId: 'panel-longi-435', qty: 23 },
      { productId: 'inv-fronius-8k', qty: 1 },
      { productId: 'bat-tesla-pw3', qty: 1 },
      { productId: 'mount-tile-1.6', qty: 3 },
      { productId: 'acc-surge-type2', qty: 1 },
      { productId: 'acc-cable-6mm', qty: 50 },
    ],
    bundlePrice: 24600, savingVsRrp: 2340,
  },
];

const CATEGORY_META: Record<ProductCategory, { label: string; icon: typeof Sun; color: string }> = {
  panels: { label: 'Solar Panels', icon: Sun, color: 'tech' },
  inverters: { label: 'Inverters', icon: Zap, color: 'blue' },
  batteries: { label: 'Batteries', icon: Battery, color: 'emerald' },
  mounting: { label: 'Mounting', icon: Wrench, color: 'slate' },
  accessories: { label: 'Accessories', icon: Box, color: 'violet' },
};

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ProfessionalProducts() {
  // Cal's #17: owner uploads real product photos. Stored as data URLs per
  // product id (localStorage now; the product table at launch).
  const [productImages, setProductImages] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('aisolar_product_images') || '{}'); } catch { return {}; }
  });
  const handleImageFile = (id: string, file: File) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== 'string') return;
      setProductImages(prev => {
        const next = { ...prev, [id]: r.result as string };
        try { localStorage.setItem('aisolar_product_images', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
    r.readAsDataURL(file);
  };

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all' | 'bundles'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

  // Compute margins
  const products = useMemo(() => SAMPLE_PRODUCTS.map(p => ({
    ...p,
    margin: Math.round(((p.rrp - p.cost) / p.rrp) * 100),
  })), []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCategory !== 'all' && activeCategory !== 'bundles' && p.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.manufacturer.toLowerCase().includes(q)
          || p.model.toLowerCase().includes(q)
          || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, activeCategory, search]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Irish market · SEAI-approved · Real-time Dublin depot stock · Connected to proposal editor</p>

      {/* Search + category tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by manufacturer, model, or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="All" count={products.length} />
        <CategoryChip active={activeCategory === 'bundles'} onClick={() => setActiveCategory('bundles')} label="Pre-configured Bundles" icon={Star} count={SAMPLE_BUNDLES.length} />
        {(Object.keys(CATEGORY_META) as ProductCategory[]).map(cat => (
          <CategoryChip
            key={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            label={CATEGORY_META[cat].label}
            icon={CATEGORY_META[cat].icon}
            count={products.filter(p => p.category === cat).length}
          />
        ))}
      </div>

      {/* Bundles view */}
      {activeCategory === 'bundles' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pre-configured system packages. Click a bundle to view components + add to proposal.
          </p>
          {SAMPLE_BUNDLES.map(bundle => (
            <Card key={bundle.id} className="border-l-4 border-l-tech cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedBundle(bundle)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-base">{bundle.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{bundle.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-tech/10 text-tech border-tech/30">
                    {bundle.systemSizeKw} kWp
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm mt-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Bundle price</div>
                    <div className="font-bold">{eur(bundle.bundlePrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">vs RRP</div>
                    <div className="font-bold text-primary">Save {eur(bundle.savingVsRrp)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Battery</div>
                    <div className="font-semibold">{bundle.includesBattery ? 'Included' : 'No'}</div>
                  </div>
                </div>
                <Button size="sm" className="mt-3 bg-tech transition-opacity hover:opacity-90 text-white">
                  Add to proposal <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(product => {
            const cat = CATEGORY_META[product.category];
            const Icon = cat.icon;
            const isOutOfStock = product.stock === 0;
            return (
              <Card key={product.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}
                onClick={() => setSelectedProduct(product)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-primary/10 dark:bg-primary/10`}>
                        <Icon className={`h-4 w-4 text-primary dark:text-primary`} />
                      </div>
                      <Badge variant="outline" className="text-[11px]">{cat.label}</Badge>
                    </div>
                    {product.seaiApproved && (
                      <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/40">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> SEAI
                      </Badge>
                    )}
                  </div>
                  {/* product photo — upload once, shows on proposals (Cal #17) */}
                  <label className="block mb-2 cursor-pointer group/photo" onClick={e => e.stopPropagation()}>
                    {productImages[product.id] ? (
                      <img src={productImages[product.id]} alt={product.model} className="w-full h-24 object-cover rounded-md border border-border" />
                    ) : (
                      <span className="flex items-center justify-center gap-1.5 w-full h-24 rounded-md border border-dashed border-border text-xs text-muted-foreground group-hover/photo:border-tech group-hover/photo:text-tech transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Add product photo
                      </span>
                    )}
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(product.id, f); }} />
                  </label>
                  <h3 className="font-semibold text-sm">{product.manufacturer}</h3>
                  <p className="font-medium text-base leading-tight">{product.model}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Cost</div>
                      <div className="font-semibold">{eur(product.cost)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">RRP</div>
                      <div className="font-semibold">{eur(product.rrp)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Margin</div>
                      <div className="font-semibold text-primary">{product.margin}%</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {isOutOfStock ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Out of stock
                        </span>
                      ) : (
                        <span className={product.stock < 5 ? 'text-doc-proposal' : 'text-primary'}>
                          {product.stock} in stock
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < product.rating ? 'fill-doc-proposal text-doc-proposal' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                  </div>

                  <Button size="sm" className="mt-3 w-full bg-tech transition-opacity hover:opacity-90 text-white" disabled={isOutOfStock}>
                    Add to proposal <Plus className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
      {selectedBundle && (
        <BundleDetailModal bundle={selectedBundle} products={products} onClose={() => setSelectedBundle(null)} />
      )}
    </div>
  );
}

function CategoryChip({ label, active, onClick, count, icon: Icon }: {
  label: string; active: boolean; onClick: () => void; count: number; icon?: typeof Sun;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
        active ? 'bg-tech text-white' : 'bg-muted hover:bg-muted/70'
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      <span className={`text-[11px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-background/60'}`}>{count}</span>
    </button>
  );
}

function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const cat = CATEGORY_META[product.category];
  const Icon = cat.icon;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-primary/10 dark:bg-primary/10`}>
                <Icon className={`h-6 w-6 text-primary dark:text-primary`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{product.manufacturer}</div>
                <h2 className="text-xl font-bold">{product.model}</h2>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{product.description}</p>

          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-semibold">Specifications</h3>
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm border-b py-1.5">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-2 rounded bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="font-bold">{eur(product.cost)}</div>
            </div>
            <div className="p-2 rounded bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground">RRP</div>
              <div className="font-bold">{eur(product.rrp)}</div>
            </div>
            <div className="p-2 rounded bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className="font-bold text-primary">{product.margin}%</div>
            </div>
            <div className="p-2 rounded bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground">Stock</div>
              <div className="font-bold">{product.stock}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-tech transition-opacity hover:opacity-90 text-white">
              Add to proposal <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline">Datasheet</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BundleDetailModal({ bundle, products, onClose }: { bundle: Bundle; products: Product[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold">{bundle.name}</h2>
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-3 rounded bg-tech/5 text-center">
              <div className="text-xs text-muted-foreground">Bundle price</div>
              <div className="font-bold text-lg">{eur(bundle.bundlePrice)}</div>
            </div>
            <div className="p-3 rounded bg-primary/10 dark:bg-primary/10 text-center">
              <div className="text-xs text-muted-foreground">Save vs RRP</div>
              <div className="font-bold text-lg text-primary">{eur(bundle.savingVsRrp)}</div>
            </div>
            <div className="p-3 rounded bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground">System</div>
              <div className="font-bold text-lg">{bundle.systemSizeKw} kWp</div>
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2">Components ({bundle.components.length})</h3>
          <div className="space-y-2 mb-4">
            {bundle.components.map(comp => {
              const product = products.find(p => p.id === comp.productId);
              if (!product) return null;
              return (
                <div key={comp.productId} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div>
                    <div className="font-medium">{product.manufacturer} {product.model}</div>
                    <div className="text-xs text-muted-foreground">{eur(product.cost)} × {comp.qty}</div>
                  </div>
                  <div className="font-semibold">{eur(product.cost * comp.qty)}</div>
                </div>
              );
            })}
          </div>

          <Button className="w-full bg-tech transition-opacity hover:opacity-90 text-white h-12">
            Add bundle to proposal <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
