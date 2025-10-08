import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ValueUpsell() {
  const navigate = useNavigate();

  const premiumFeatures = [
    {
      icon: Zap,
      title: 'Priority Installation',
      description: 'Jump the queue with expedited installation scheduling',
      price: '€499'
    },
    {
      icon: Shield,
      title: 'Extended Warranty',
      description: '25-year comprehensive coverage on all components',
      price: '€799'
    },
    {
      icon: TrendingUp,
      title: 'Smart Monitoring System',
      description: 'Real-time energy production tracking and optimization',
      price: '€299'
    }
  ];

  const standardIncludes = [
    'Professional installation',
    'Standard 10-year warranty',
    'Grid connection assistance',
    'Basic monitoring system',
    'SEAI grant application support'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Consultation Confirmed! 🎉
          </h1>
          <p className="text-lg text-slate-600">
            Maximize your solar investment with our premium add-ons
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {premiumFeatures.map((feature) => (
            <Card key={feature.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold">
                {feature.price}
              </div>
              <CardHeader>
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Add to Package
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">What's Included in Your Standard Package</CardTitle>
            <CardDescription>Everything you need to get started with solar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {standardIncludes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="gradient-primary text-white px-8"
          >
            Continue with Standard Package
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/')}
          >
            I'll Decide Later
          </Button>
        </div>
      </div>
    </div>
  );
}
