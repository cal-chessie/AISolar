import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PremiumBillUpload from '@/components/PremiumBillUpload';
import PremiumDashboard from '@/components/PremiumDashboard';

const Index = () => {
  const [view, setView] = useState<'client' | 'consultant'>('client');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {view === 'client' ? (
        <div className="container mx-auto py-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Solar Automation Platform</h1>
            <Tabs value={view} onValueChange={(v) => setView(v as 'client' | 'consultant')} className="w-[400px] mx-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client">Client Portal</TabsTrigger>
                <TabsTrigger value="consultant">Consultant Portal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="max-w-4xl mx-auto">
            <PremiumBillUpload 
              onUploadComplete={(data) => {
                console.log('Upload complete:', data);
              }}
            />
          </div>
        </div>
      ) : (
        <PremiumDashboard onBackToClient={() => setView('client')} />
      )}
    </div>
  );
};

export default Index;
