import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Camera, CheckCircle, Sparkles, Shield, Zap, Target, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'complete';

interface PremiumBillUploadProps {
  onUploadComplete?: (data: { success: boolean; file?: File; manual_entry?: boolean }) => void;
}

export default function PremiumBillUpload({ onUploadComplete }: PremiumBillUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [processingStep, setProcessingStep] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setUploadState('uploading');
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('processing');
          
          // Simulate processing steps
          let step = 0;
          const processInterval = setInterval(() => {
            step++;
            setProcessingStep(step);
            if (step >= 3) {
              clearInterval(processInterval);
              setTimeout(() => {
                setUploadState('complete');
                onUploadComplete?.({ success: true, file });
              }, 500);
            }
          }, 600);
          
          return 100;
        }
        return prev + 12;
      });
    }, 150);
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Glassmorphism Card */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        {/* Floating Orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        
        <div className="relative p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Analysis
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Get Your Instant Solar Proposal
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Upload your electricity bill and discover your potential savings in seconds
            </p>
          </div>

          <AnimatePresence mode="wait">
            {uploadState === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* Upload Zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative group cursor-pointer transition-all duration-500",
                    "rounded-2xl border-2 border-dashed",
                    "bg-card/50 backdrop-blur-sm",
                    isDragActive 
                      ? "border-primary bg-primary/5 scale-[1.02]" 
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <input {...getInputProps()} />
                  
                  <div className="p-12 md:p-16 text-center">
                    {/* Icon */}
                    <motion.div 
                      className="relative mx-auto mb-6"
                      animate={{ y: isDragActive ? -10 : 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-150 group-hover:scale-175 transition-transform" />
                      <div className="relative p-5 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl shadow-2xl">
                        <Upload size={40} className="text-primary-foreground" />
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-semibold text-foreground mb-2">
                      {isDragActive ? 'Drop your bill here!' : 'Upload your electricity bill'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Drag & drop or click to browse
                    </p>

                    {/* File Types */}
                    <div className="flex gap-2 justify-center flex-wrap">
                      {['PDF', 'JPG', 'PNG', 'HEIC'].map((format, idx) => (
                        <motion.span 
                          key={format}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="px-3 py-1.5 bg-muted rounded-lg text-xs font-medium text-muted-foreground"
                        >
                          {format}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alternative Options */}
                <div className="mt-8">
                  <div className="relative flex items-center justify-center gap-4 py-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <motion.button 
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-3 px-8 py-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all font-medium"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.capture = 'environment';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) onDrop([file]);
                        };
                        input.click();
                      }}
                    >
                      <Camera size={22} className="text-primary" />
                      <span>Take Photo</span>
                    </motion.button>
                    
                    <motion.button 
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-3 px-8 py-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all font-medium"
                      onClick={() => onUploadComplete?.({ success: true, manual_entry: true })}
                    >
                      <FileText size={22} className="text-primary" />
                      <span>Enter Manually</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {uploadState === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12"
              >
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted"
                    />
                    <motion.circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      className="text-primary"
                      strokeDasharray={251}
                      strokeDashoffset={251 - (251 * uploadProgress) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{uploadProgress}%</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Uploading your bill</h3>
                <p className="text-muted-foreground text-sm truncate max-w-xs mx-auto">{fileName}</p>
              </motion.div>
            )}

            {uploadState === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12"
              >
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-6">AI Analysis in Progress</h3>
                
                <div className="max-w-sm mx-auto space-y-3">
                  {[
                    { label: 'Extracting bill data', icon: FileText },
                    { label: 'Analyzing usage patterns', icon: Zap },
                    { label: 'Calculating savings', icon: Target },
                  ].map((step, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all",
                        processingStep > idx 
                          ? "bg-primary/10 text-primary" 
                          : processingStep === idx 
                            ? "bg-muted text-foreground" 
                            : "text-muted-foreground"
                      )}
                    >
                      {processingStep > idx ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <step.icon className={cn(
                          "h-5 w-5",
                          processingStep === idx && "animate-pulse"
                        )} />
                      )}
                      <span className="text-sm font-medium">{step.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {uploadState === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative w-24 h-24 mx-auto mb-6"
                >
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-primary to-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={48} className="text-primary-foreground" />
                  </div>
                </motion.div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2">Analysis Complete!</h3>
                <p className="text-muted-foreground mb-8">
                  Your personalized solar proposal is ready
                </p>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground rounded-xl font-semibold text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
                  onClick={() => console.log('Viewing proposal...')}
                >
                  View Your Proposal
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Trust Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-10"
      >
        {[
          { icon: Shield, label: 'Secure & Private' },
          { icon: Zap, label: '30-Second Analysis' },
          { icon: Target, label: 'No Obligation' },
          { icon: Star, label: 'SEAI Approved' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-muted-foreground">
            <item.icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
