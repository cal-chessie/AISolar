import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Camera, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'complete';

interface PremiumBillUploadProps {
  onUploadComplete?: (data: { success: boolean; file?: File; manual_entry?: boolean }) => void;
}

export default function PremiumBillUpload({ onUploadComplete }: PremiumBillUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');

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
          setTimeout(() => {
            setUploadState('complete');
            onUploadComplete?.({ success: true, file });
          }, 1500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
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
    <div className="w-full max-w-2xl mx-auto p-8 gradient-background rounded-3xl shadow-premium">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Get Your Instant Solar Proposal</h2>
        <p className="text-slate-600">
          Upload your electricity bill for AI-powered savings analysis
        </p>
      </div>

      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-card rounded-2xl p-8 border border-border shadow-lg"
          >
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
                "bg-slate-50 hover:bg-primary-50 hover:border-primary",
                isDragActive && "border-primary bg-primary-50 scale-[1.02]"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <Upload size={48} className="text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {isDragActive ? 'Drop your bill here' : 'Upload your electricity bill'}
                  </h3>
                  <p className="text-slate-600">
                    Drag & drop or click to browse files
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex gap-2 justify-center mb-2">
                    {['PDF', 'JPG', 'PNG', 'HEIC'].map(format => (
                      <span key={format} className="px-3 py-1 bg-slate-200 rounded-full text-xs font-medium text-slate-700">
                        {format}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Max file size: 10MB</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-slate-500">or</span>
                </div>
              </div>
              
              <div className="mt-6 flex gap-4 justify-center">
                <button 
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
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
                  <Camera size={20} />
                  Take Photo
                </button>
                <button 
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  onClick={() => onUploadComplete?.({ success: true, manual_entry: true })}
                >
                  <FileText size={20} />
                  Enter Manually
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'uploading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-12 border border-border shadow-lg text-center"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Uploading your bill</h3>
                <p className="text-slate-600 mb-1">This will only take a moment</p>
                <p className="text-sm text-slate-500">{fileName}</p>
              </div>
              
              <div className="w-full max-w-md">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-600 mt-2 block">{uploadProgress}%</span>
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'processing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-12 border border-border shadow-lg text-center"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Analysis in Progress</h3>
                <p className="text-slate-600">
                  Our AI is analyzing your energy usage and calculating potential savings
                </p>
              </div>
              <div className="w-full max-w-md space-y-3 mt-4">
                {[
                  { label: 'Extracting bill data', active: true },
                  { label: 'Analyzing usage patterns', active: false },
                  { label: 'Calculating savings', active: false }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      step.active ? "bg-primary shadow-lg shadow-primary/50" : "bg-slate-300"
                    )} />
                    <span className={cn(
                      "text-sm",
                      step.active ? "text-slate-900 font-medium" : "text-slate-500"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-12 border border-border shadow-lg text-center"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle size={80} className="text-primary" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">Analysis Complete!</h3>
                <p className="text-slate-600">
                  Your personalized solar proposal is ready
                </p>
              </div>
              <button className="gradient-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all">
                View Your Proposal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="text-lg">🔒</div>
          <span>Secure & confidential</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-lg">⚡</div>
          <span>30-second analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-lg">🎯</div>
          <span>No obligation</span>
        </div>
      </div>
    </div>
  );
}
