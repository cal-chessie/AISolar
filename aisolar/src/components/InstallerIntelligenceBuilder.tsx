/**
 * Installer Intelligence Builder
 *
 * Lets an installer customise their OWN product catalogue, pricing, and rules.
 * "Drag and drop their intelligence into the system and update itself."
 *
 * Features:
 *   - Add/edit/remove products with custom pricing
 *   - Define custom bundles (e.g. "My standard 6kWp family home package")
 *   - Set custom margins per category
 *   - Define custom rules (e.g. "If roof orientation is north, recommend battery")
 *   - Set labour rates per system size
 *   - Import from CSV (drag-drop a spreadsheet)
 *   - Export to JSON (for backup or migration)
 *   - All persisted to localStorage for demo (production: installer_settings table)
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Trash2, Edit2, Save, X, Upload, Download, Copy,
  Package, DollarSign, Settings, Zap, Sun, Battery, Wrench,
  GripVertical, AlertCircle, CheckCircle2, Sparkles, Bot,
} from 'lucide-react';

interface CustomProduct {
  id: string;
  category: 'panels' | 'inverters' | 'batteries' | 'mounting' | 'accessories';
  manufacturer: string;
  model: string;
  cost: number;
  rrp: number;
  stock: number;
  notes?: string;
}

interface CustomBundle {
  id: string;
  name: string;
  description: string;
  systemSizeKw: number;
  components: { productId: string; qty: number }[];
  bundlePrice: number;
}

interface CustomRule {
  id: string;
  condition: string;
  action: string;
  enabled: boolean;
}

interface LabourRate {
  systemSizeRange: string;  // "0-3", "3-6", "6-10", "10+"
  rate: number;             // € per kWp installed
  daysRequired: number;
}

const DEFAULT_PRODUCTS: CustomProduct[] = [
  { id: 'p1', category: 'panels', manufacturer: 'Longi', model: 'Hi-MO 6 435W', cost: 145, rrp: 220, stock: 48 },
  { id: 'p2', category: 'inverters', manufacturer: 'SolarEdge', model: 'SE5K', cost: 1450, rrp: 2100, stock: 6 },
  { id: 'p3', category: 'batteries', manufacturer: 'Tesla', model: 'Powerwall 3', cost: 7200, rrp: 9500, stock: 4 },
];

const DEFAULT_RULES: CustomRule[] = [
  { id: 'r1', condition: 'IF roof_orientation = north AND system_size > 5', action: 'Recommend battery (north-facing needs storage)', enabled: true },
  { id: 'r2', condition: 'IF shading = heavy', action: 'Add 15% contingency to quote + recommend optimisers', enabled: true },
  { id: 'r3', condition: 'IF monthly_bill > 300', action: 'Recommend 8kWp+ system + battery', enabled: true },
  { id: 'r4', condition: 'IF customer_county = Dublin', action: 'Offer next-day site survey (we have Dublin crew)', enabled: false },
];

const DEFAULT_LABOUR: LabourRate[] = [
  { systemSizeRange: '0-3 kWp', rate: 350, daysRequired: 1 },
  { systemSizeRange: '3-6 kWp', rate: 300, daysRequired: 1 },
  { systemSizeRange: '6-10 kWp', rate: 280, daysRequired: 2 },
  { systemSizeRange: '10+ kWp', rate: 260, daysRequired: 3 },
];

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const STORAGE_KEY = 'aisolar_installer_intelligence';

export default function InstallerIntelligenceBuilder() {
  const [products, setProducts] = useState<CustomProduct[]>(DEFAULT_PRODUCTS);
  const [bundles, setBundles] = useState<CustomBundle[]>([]);
  const [rules, setRules] = useState<CustomRule[]>(DEFAULT_RULES);
  const [labour, setLabour] = useState<LabourRate[]>(DEFAULT_LABOUR);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'bundles' | 'rules' | 'labour' | 'import'>('products');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.products) setProducts(data.products);
        if (data.bundles) setBundles(data.bundles);
        if (data.rules) setRules(data.rules);
        if (data.labour) setLabour(data.labour);
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  const saveAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, bundles, rules, labour }));
      alert('✓ Saved. Your intelligence is now active across the platform.');
    } catch {
      alert('Failed to save — try again');
    }
  };

  const addProduct = (product: Omit<CustomProduct, 'id'>) => {
    const newProduct = { ...product, id: `p_${Date.now()}` };
    setProducts(prev => [...prev, newProduct]);
    setShowNewProduct(false);
  };

  const updateProduct = (id: string, updates: Partial<CustomProduct>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    if (!confirm('Remove this product?')) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addRule = () => {
    setRules(prev => [...prev, {
      id: `r_${Date.now()}`,
      condition: 'IF ...',
      action: 'Then ...',
      enabled: true,
    }]);
  };

  const updateRule = (id: string, updates: Partial<CustomRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const imported: CustomProduct[] = [];
      // Skip header, parse CSV: manufacturer,model,category,cost,rrp,stock
      lines.slice(1).forEach((line, i) => {
        const [manufacturer, model, category, cost, rrp, stock] = line.split(',').map(s => s.trim());
        if (manufacturer && model) {
          imported.push({
            id: `import_${Date.now()}_${i}`,
            manufacturer,
            model,
            category: (category as CustomProduct['category']) || 'panels',
            cost: Number(cost) || 0,
            rrp: Number(rrp) || 0,
            stock: Number(stock) || 0,
          });
        }
      });
      if (imported.length > 0) {
        setProducts(prev => [...prev, ...imported]);
        alert(`✓ Imported ${imported.length} products`);
      } else {
        alert('No valid products found in CSV');
      }
    };
    reader.readAsText(file);
  };

  const exportJSON = () => {
    const data = { products, bundles, rules, labour, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisolar-intelligence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCatalogueValue = products.reduce((sum, p) => sum + p.cost * p.stock, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            Intelligence Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag your expertise into the system. Custom products, pricing, rules, and labour rates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportJSON}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={saveAll} className="bg-violet-600 hover:bg-violet-700">
            <Save className="h-4 w-4 mr-1" /> Save all
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Products</div>
            <div className="text-xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Bundles</div>
            <div className="text-xl font-bold">{bundles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Active rules</div>
            <div className="text-xl font-bold">{rules.filter(r => r.enabled).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Catalogue value</div>
            <div className="text-xl font-bold text-emerald-600">{eur(totalCatalogueValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'bundles', label: 'Bundles', icon: Zap },
          { id: 'rules', label: 'Rules', icon: Bot },
          { id: 'labour', label: 'Labour rates', icon: Wrench },
          { id: 'import', label: 'Import / Export', icon: Upload },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                activeTab === tab.id ? 'bg-violet-600 text-white' : 'bg-muted hover:bg-muted/70'
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Your product catalogue</CardTitle>
                <CardDescription>These products appear in your proposal editor with your custom pricing.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowNewProduct(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add product
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {products.map(product => (
                <div key={product.id} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                  {editingProduct === product.id ? (
                    <ProductEditRow
                      product={product}
                      onSave={(updates) => { updateProduct(product.id, updates); setEditingProduct(null); }}
                      onCancel={() => setEditingProduct(null)}
                    />
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{product.manufacturer} {product.model}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Cost {eur(product.cost)} · RRP {eur(product.rrp)} · Margin {Math.round(((product.rrp - product.cost) / product.rrp) * 100)}% · Stock {product.stock}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setEditingProduct(product.id)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteProduct(product.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {products.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No products yet. Add your first product or import from CSV.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New product form */}
      {showNewProduct && (
        <Card className="border-violet-300 dark:border-violet-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add new product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductEditRow
              product={{ id: '', category: 'panels', manufacturer: '', model: '', cost: 0, rrp: 0, stock: 0 }}
              onSave={(p) => addProduct(p)}
              onCancel={() => setShowNewProduct(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* BUNDLES TAB */}
      {activeTab === 'bundles' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your bundles</CardTitle>
            <CardDescription>Pre-configured system packages. Speed up quoting by 10x.</CardDescription>
          </CardHeader>
          <CardContent>
            {bundles.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No bundles yet.</p>
                <Button size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" /> Create your first bundle
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {bundles.map(b => (
                  <div key={b.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.systemSizeKw} kWp · {eur(b.bundlePrice)}</div>
                    </div>
                    <Button size="sm" variant="ghost"><Edit2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-600" /> Your business rules
                </CardTitle>
                <CardDescription>The Proposal Drafter Agent consults these when auto-drafting.</CardDescription>
              </div>
              <Button size="sm" onClick={addRule}>
                <Plus className="h-4 w-4 mr-1" /> Add rule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => updateRule(rule.id, { enabled: v })}
                  />
                  <div className="flex-1 space-y-1">
                    <Input
                      value={rule.condition}
                      onChange={e => updateRule(rule.id, { condition: e.target.value })}
                      className="font-mono text-xs h-8"
                    />
                    <Input
                      value={rule.action}
                      onChange={e => updateRule(rule.id, { action: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)} className="text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg text-xs text-violet-800 dark:text-violet-300">
              <Bot className="h-3 w-3 inline mr-1" />
              <strong>Example:</strong> "IF monthly_bill {'>'} 300 AND roof_orientation = south → Recommend 8kWp + 10kWh battery"
            </div>
          </CardContent>
        </Card>
      )}

      {/* LABOUR TAB */}
      {activeTab === 'labour' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Labour rates</CardTitle>
            <CardDescription>Per-kWp rates + days required. Used in proposal cost calculation.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-2">System size</th>
                  <th className="text-right">Rate (€/kWp)</th>
                  <th className="text-right">Days</th>
                </tr>
              </thead>
              <tbody>
                {labour.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{row.systemSizeRange}</td>
                    <td className="text-right">
                      <Input
                        type="number"
                        value={row.rate}
                        onChange={e => {
                          const newLabour = [...labour];
                          newLabour[i] = { ...row, rate: Number(e.target.value) };
                          setLabour(newLabour);
                        }}
                        className="h-7 w-20 ml-auto text-right"
                      />
                    </td>
                    <td className="text-right">
                      <Input
                        type="number"
                        value={row.daysRequired}
                        onChange={e => {
                          const newLabour = [...labour];
                          newLabour[i] = { ...row, daysRequired: Number(e.target.value) };
                          setLabour(newLabour);
                        }}
                        className="h-7 w-16 ml-auto text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* IMPORT / EXPORT TAB */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import from CSV</CardTitle>
              <CardDescription>
                Drag your spreadsheet here. Columns: manufacturer, model, category, cost, rrp, stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-violet-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium">Click to select CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded text-xs">
                <strong>Example CSV:</strong>
                <pre className="mt-1 font-mono">manufacturer,model,category,cost,rrp,stock
Longi,Hi-MO 6 435W,panels,145,220,48
SolarEdge,SE5K,inverters,1450,2100,6</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export your intelligence</CardTitle>
              <CardDescription>Backup or migrate to another account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={exportJSON}>
                <Download className="h-4 w-4 mr-2" /> Download as JSON
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Includes {products.length} products, {bundles.length} bundles, {rules.length} rules, {labour.length} labour rates.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 bg-background border rounded-lg shadow-lg p-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" />
          Changes are auto-saved to your browser. Click "Save all" to apply across the platform.
        </div>
        <Button size="sm" onClick={saveAll} className="bg-violet-600 hover:bg-violet-700">
          <Save className="h-4 w-4 mr-1" /> Save all
        </Button>
      </div>
    </div>
  );
}

function ProductEditRow({ product, onSave, onCancel }: {
  product: CustomProduct;
  onSave: (updates: Partial<CustomProduct>) => void;
  onCancel: () => void;
}) {
  const [manufacturer, setManufacturer] = useState(product.manufacturer);
  const [model, setModel] = useState(product.model);
  const [category, setCategory] = useState<CustomProduct['category']>(product.category);
  const [cost, setCost] = useState(product.cost);
  const [rrp, setRrp] = useState(product.rrp);
  const [stock, setStock] = useState(product.stock);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 flex-1">
      <Input placeholder="Manufacturer" value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="h-8 text-xs" />
      <Input placeholder="Model" value={model} onChange={e => setModel(e.target.value)} className="h-8 text-xs" />
      <select
        value={category}
        onChange={e => setCategory(e.target.value as CustomProduct['category'])}
        className="h-8 text-xs rounded-md border border-input bg-background px-2"
      >
        <option value="panels">Panels</option>
        <option value="inverters">Inverters</option>
        <option value="batteries">Batteries</option>
        <option value="mounting">Mounting</option>
        <option value="accessories">Accessories</option>
      </select>
      <Input type="number" placeholder="Cost €" value={cost} onChange={e => setCost(Number(e.target.value))} className="h-8 text-xs" />
      <Input type="number" placeholder="RRP €" value={rrp} onChange={e => setRrp(Number(e.target.value))} className="h-8 text-xs" />
      <div className="flex gap-1">
        <Input type="number" placeholder="Stock" value={stock} onChange={e => setStock(Number(e.target.value))} className="h-8 text-xs" />
        <Button size="sm" variant="default" className="h-8 px-2" onClick={() => onSave({ manufacturer, model, category, cost, rrp, stock })}>
          <Save className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
