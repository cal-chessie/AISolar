import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Zap, Euro, Sparkles } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BillInputStepProps {
  onAnalyse: (monthlyBill: number) => void;
}

export function BillInputStep({ onAnalyse }: BillInputStepProps) {
  const [manualBill, setManualBill] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      // Simulate bill extraction - in production, use AI/OCR
      setIsAnalysing(true);
      setTimeout(() => {
        setIsAnalysing(false);
        // Simulate extracted amount
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

  return (
    <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          AI Solar Bill Analysis
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get instant savings estimates based on your electricity usage
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {isAnalysing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-8 h-8 text-primary" />
              </motion.div>
            </div>
            <p className="text-lg font-medium text-foreground">Analysing your bill...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Using Irish sunlight data & SEAI grants
            </p>
          </motion.div>
        ) : (
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Bill
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Euro className="w-4 h-4" />
                Enter Amount
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                {isDragActive ? (
                  <p className="text-primary font-medium">Drop your bill here...</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground mb-1">
                      Drag & drop your electricity bill
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse (PDF, JPG, PNG)
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                🔒 Your bill is analysed securely and never stored
              </p>
            </TabsContent>

            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyBill">Your last electricity bill (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="monthlyBill"
                      type="number"
                      placeholder="e.g. 150"
                      value={manualBill}
                      onChange={(e) => setManualBill(e.target.value)}
                      className="pl-10 text-lg h-12"
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
                  className="w-full h-12 text-base font-semibold"
                  disabled={!manualBill || parseFloat(manualBill) <= 0}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Analyse My Bill (Free)
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                ✨ No obligation – instant results
              </p>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
