import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Check, Zap, Battery, Box, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  product_type: string;
  manufacturer: string;
  model: string;
  cost: number;
  power_rating: number | null;
  efficiency_percentage: number | null;
  warranty_years: number | null;
  description: string | null;
  in_stock: boolean;
}

interface EquipmentLibraryProps {
  selectedPanel?: string;
  selectedInverter?: string;
  selectedBattery?: string;
  onSelectPanel?: (product: Product) => void;
  onSelectInverter?: (product: Product) => void;
  onSelectBattery?: (product: Product) => void;
  systemSizeKw?: number;
}

export default function EquipmentLibrary({
  selectedPanel,
  selectedInverter,
  selectedBattery,
  onSelectPanel,
  onSelectInverter,
  onSelectBattery,
  systemSizeKw = 5,
}: EquipmentLibraryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('panel');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('solar_products')
        .select('*')
        .eq('active', true)
        .order('cost', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading products',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const panels = products.filter(p => p.product_type === 'panel');
  const inverters = products.filter(p => p.product_type === 'inverter');
  const batteries = products.filter(p => p.product_type === 'battery');

  // Categorize by tier based on cost and specs
  const categorizeTier = (product: Product) => {
    if (product.product_type === 'panel') {
      if (product.efficiency_percentage && product.efficiency_percentage >= 21) return 'Premium';
      if (product.efficiency_percentage && product.efficiency_percentage >= 19) return 'Standard';
      return 'Budget';
    }
    if (product.cost > 2000) return 'Premium';
    if (product.cost > 1000) return 'Standard';
    return 'Budget';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Standard': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Budget': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const ProductCard = ({ 
    product, 
    isSelected, 
    onSelect 
  }: { 
    product: Product; 
    isSelected: boolean;
    onSelect?: (product: Product) => void;
  }) => {
    const tier = categorizeTier(product);
    const panelsNeeded = product.power_rating ? Math.ceil((systemSizeKw * 1000) / product.power_rating) : 0;
    
    return (
      <Card 
        className={cn(
          "relative cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={() => onSelect?.(product)}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="text-white" size={14} />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge className={cn("mb-2", getTierColor(tier))}>{tier}</Badge>
              <CardTitle className="text-base">{product.manufacturer}</CardTitle>
              <p className="text-sm text-muted-foreground">{product.model}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-primary">
            €{product.cost.toLocaleString()}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {product.power_rating && (
              <div>
                <span className="text-muted-foreground">Power:</span>
                <span className="ml-1 font-medium">{product.power_rating}W</span>
              </div>
            )}
            {product.efficiency_percentage && (
              <div>
                <span className="text-muted-foreground">Efficiency:</span>
                <span className="ml-1 font-medium">{product.efficiency_percentage}%</span>
              </div>
            )}
            {product.warranty_years && (
              <div>
                <span className="text-muted-foreground">Warranty:</span>
                <span className="ml-1 font-medium">{product.warranty_years}yr</span>
              </div>
            )}
            {product.product_type === 'panel' && panelsNeeded > 0 && (
              <div>
                <span className="text-muted-foreground">Qty needed:</span>
                <span className="ml-1 font-medium">{panelsNeeded}</span>
              </div>
            )}
          </div>

          {!product.in_stock && (
            <Badge variant="secondary" className="mt-2">Out of Stock</Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Equipment</h3>
        <span className="text-sm text-muted-foreground">
          System size: {systemSizeKw} kW
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="panel" className="gap-2">
            <Zap size={16} />
            <span className="hidden sm:inline">Panels</span>
            {selectedPanel && <Check size={14} className="text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="inverter" className="gap-2">
            <Box size={16} />
            <span className="hidden sm:inline">Inverters</span>
            {selectedInverter && <Check size={14} className="text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="battery" className="gap-2">
            <Battery size={16} />
            <span className="hidden sm:inline">Batteries</span>
            {selectedBattery && <Check size={14} className="text-green-600" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="panel" className="mt-4">
          {panels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No panels available</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {panels.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedPanel === product.id}
                  onSelect={onSelectPanel}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inverter" className="mt-4">
          {inverters.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No inverters available</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {inverters.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedInverter === product.id}
                  onSelect={onSelectInverter}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="battery" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Battery storage is optional but recommended for maximizing self-consumption.
          </p>
          {batteries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No batteries available</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  !selectedBattery && "ring-2 ring-primary"
                )}
                onClick={() => onSelectBattery?.(null as any)}
              >
                <CardContent className="p-6 text-center">
                  <p className="font-medium">No Battery</p>
                  <p className="text-sm text-muted-foreground mt-1">Skip battery storage</p>
                </CardContent>
              </Card>
              {batteries.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedBattery === product.id}
                  onSelect={onSelectBattery}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
