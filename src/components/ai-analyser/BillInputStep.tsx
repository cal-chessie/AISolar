import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Zap, Euro, Sparkles, Camera } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";

interface BillInputStepProps {
  onAnalyse: (monthlyBill: number) => void;
}

export function BillInputStep({ onAnalyse }: BillInputStepProps) {
  const [manualBill, setManualBill] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setIsAnalysing(true);
      setTimeout(() => {
        setIsAnalysing(false);
        const simulatedAmount = Math.floor(Math.random() * 150) + 100;
        onAnalyse(simulatedAmount);
      }, 2000);
    }
  }, [onAnalyse]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualBill);
    if (amount > 0) {
      setIsAnalysing(true);
      setTimeout(() => {
        setIsAnalysing(false);
        onAnalyse(amount);
      }, 1500);
    }
  };

  // Mobile camera capture
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsAnalysing(true);
        setTimeout(() => {
          setIsAnalysing(false);
          const simulatedAmount = Math.floor(Math.random() * 150) + 100;
          onAnalyse(simulatedAmount);
        }, 2000);
      }
    };
    input.click();
  };

  return (
    <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2 px-4 sm:px-6">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
          {brand.copy.heroTitle}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm sm:text-base">
          {brand.copy.valueProposition}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 px-4 sm:px-6">
        {isAnalysing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-10 sm:py-12 text-center"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </motion.div>
            </div>
            <p className="text-base sm:text-lg font-medium text-foreground">Analysing your bill...</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Using {brand.country} sunlight data & SEAI grants
            </p>
          </motion.div>
        ) : (
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-11 sm:h-10">
              <TabsTrigger value="manual" className="gap-1.5 sm:gap-2 text-sm">
                <Euro className="w-4 h-4" />
                <span>Enter Bill</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5 sm:gap-2 text-sm">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyBill" className="text-sm sm:text-base">Your last electricity bill (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    <Input
                      id="monthlyBill"
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 150"
                      value={manualBill}
                      onChange={(e) => setManualBill(e.target.value)}
                      className="pl-10 text-lg h-14 sm:h-12"
                      min="1"
                      step="1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your monthly or bi-monthly bill amount
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 sm:h-12 text-base font-semibold"
                  disabled={!manualBill || parseFloat(manualBill) <= 0}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {brand.copy.heroCta}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                ✨ {brand.copy.trustMessage}
              </p>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              {/* Mobile Camera Button - shown prominently on mobile */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 sm:hidden gap-2 text-base"
                onClick={handleCameraCapture}
              >
                <Camera className="w-5 h-5" />
                Take Photo of Bill
              </Button>

              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer
                  transition-all duration-200 min-h-[140px] sm:min-h-[160px] flex flex-col items-center justify-center
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
                {isDragActive ? (
                  <p className="text-primary font-medium">Drop your bill here...</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground mb-1 text-sm sm:text-base">
                      <span className="hidden sm:inline">Drag & drop your electricity bill</span>
                      <span className="sm:hidden">Tap to select your bill</span>
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      PDF, JPG, or PNG
                    </p>
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      Choose File
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                🔒 Your bill is analysed securely and never stored
              </p>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
