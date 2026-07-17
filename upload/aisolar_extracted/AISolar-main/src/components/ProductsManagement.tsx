import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProductsManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    product_type: 'panel',
    active: true,
    currency: 'EUR',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('solar_products')
        .select('*')
        .order('product_type')
        .order('manufacturer');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('solar_products')
          .update(formData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('solar_products')
          .insert(formData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Product ${editingProduct ? 'updated' : 'created'} successfully.`,
      });

      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({ product_type: 'panel', active: true, currency: 'EUR' });
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData(product);
    setDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('solar_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getProductTypeColor = (type: string) => {
    switch (type) {
      case 'panel': return 'bg-blue-100 text-blue-800';
      case 'inverter': return 'bg-purple-100 text-purple-800';
      case 'battery': return 'bg-green-100 text-green-800';
      case 'mounting': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solar Products</h2>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingProduct(null);
              setFormData({ product_type: 'panel', active: true, currency: 'EUR' });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Product Type</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="panel">Solar Panel</SelectItem>
                      <SelectItem value="inverter">Inverter</SelectItem>
                      <SelectItem value="battery">Battery</SelectItem>
                      <SelectItem value="mounting">Mounting System</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <Input
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Model</Label>
                  <Input
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cost (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Power Rating (W/kW)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.power_rating || ''}
                    onChange={(e) => setFormData({ ...formData, power_rating: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Efficiency (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.efficiency_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, efficiency_percentage: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Warranty (years)</Label>
                  <Input
                    type="number"
                    value={formData.warranty_years || ''}
                    onChange={(e) => setFormData({ ...formData, warranty_years: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={formData.lead_time_days || ''}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.in_stock || false}
                      onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">In Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active || false}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className={!product.active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge className={`mb-2 ${getProductTypeColor(product.product_type)}`}>
                    {product.product_type}
                  </Badge>
                  <CardTitle className="text-lg">{product.manufacturer}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.model}</p>
                </div>
                <Package className="text-muted-foreground" size={24} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-bold text-lg">€{product.cost.toLocaleString()}</span>
              </div>

              {product.power_rating && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Power</span>
                  <span>{product.power_rating} W</span>
                </div>
              )}

              {product.efficiency_percentage && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Efficiency</span>
                  <span>{product.efficiency_percentage}%</span>
                </div>
              )}

              {product.warranty_years && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Warranty</span>
                  <span>{product.warranty_years} years</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Badge variant={product.in_stock ? 'default' : 'secondary'}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </Badge>
                {!product.active && <Badge variant="outline">Inactive</Badge>}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleEdit(product)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(product.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products yet. Add your first product to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
