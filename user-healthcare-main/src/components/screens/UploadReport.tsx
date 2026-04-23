import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui/Base';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';

interface UploadReportProps {
  onBack: () => void;
  onComplete: (summary: string) => void;
  isModal?: boolean;
}

export const UploadReport = ({ onBack, onComplete, isModal = false }: UploadReportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [recordId, setRecordId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processWithAI = async (fileData: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "You are a medical AI assistant. Summarize this medical report in simple terms for a patient. Highlight key findings and any urgent actions needed. Use a reassuring but professional tone." },
              { inlineData: { data: fileData.split(',')[1], mimeType } }
            ]
          }
        ],
      });

      setSummary(response.text || "Could not generate summary.");
    } catch (err) {
      console.error("AI Processing Error:", err);
      setError("Failed to process report with AI. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsUploading(false);
      await processWithAI(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn(
      "space-y-8 w-full",
      !isModal && "pb-24 pt-6 px-5 lg:px-10 max-w-screen-2xl mx-auto"
    )}>
      {!isModal && (
        <header className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Upload Report</h1>
            <p className="text-sm text-on-surface-variant">Securely upload and analyze your medical documents</p>
          </div>
        </header>
      )}

      {!summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <Card 
              className={cn(
                "border-2 border-dashed border-outline-variant/50 p-8 lg:p-12 flex flex-col items-center justify-center text-center space-y-6 transition-all min-h-[300px] rounded-[2.5rem]",
                file ? "bg-primary/5 border-primary/30" : "bg-surface-low/30 hover:bg-surface-low/50"
              )}
            >
              <div className={cn(
                "w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all",
                file ? "bg-primary text-white scale-110" : "bg-white text-on-surface-variant/40"
              )}>
                {file ? <FileText size={32} /> : <Upload size={32} />}
              </div>
              
              <div className="space-y-2">
                <p className="text-base font-bold truncate max-w-[200px]">{file ? file.name : "Drop your report here"}</p>
                <p className="text-xs text-on-surface-variant/60">PDF, JPG or PNG up to 10MB</p>
              </div>

              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              
              {!isUploading && !isProcessing && (
                <label 
                  htmlFor="file-upload" 
                  className="bg-primary text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 cursor-pointer active:scale-95 transition-all hover:bg-primary-container hover:text-primary"
                >
                  {file ? "Change File" : "Browse Files"}
                </label>
              )}
            </Card>

            <div className="space-y-3">
              <label htmlFor="record-id" className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">
                Medical Record ID (Optional)
              </label>
              <input
                type="text"
                id="record-id"
                placeholder="e.g. REC-12345"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                className="w-full h-12 bg-surface-low rounded-2xl px-5 text-sm font-medium border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-error font-bold text-center bg-error-container/20 py-3 rounded-xl">{error}</p>
            )}

            <Button 
              className="w-full h-14 lg:h-16 rounded-2xl text-base font-bold shadow-xl shadow-primary/10" 
              disabled={!file || isUploading || isProcessing}
              onClick={handleUpload}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Uploading...
                </>
              ) : isProcessing ? (
                <>
                  <Sparkles size={20} className="animate-pulse mr-2" />
                  AI Processing...
                </>
              ) : (
                "Analyze Report with AI"
              )}
            </Button>
          </div>

          <div className="flex flex-col justify-center space-y-6 p-6 lg:p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="text-lg font-bold font-headline">Why use AI analysis?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Our advanced medical AI scans your reports to provide a simplified summary, highlighting key metrics and trends. It helps you understand your health better before your doctor's visit.
              </p>
            </div>
            
            <ul className="space-y-3">
              {[
                "Instant simplification of medical jargon",
                "Automatic trend detection",
                "Urgent findings highlighted",
                "Secure and private data"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-medium text-on-surface-variant">
                  <CheckCircle2 size={16} className="text-tertiary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-6 p-8 bg-surface-low/30 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-tertiary/10 text-tertiary rounded-3xl flex items-center justify-center shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-headline">Analysis Ready</h2>
              <p className="text-xs text-on-surface-variant">AI has successfully processed your medical report.</p>
            </div>
            <div className="w-full pt-4 space-y-3">
              <Button className="w-full h-12 rounded-xl" onClick={() => onComplete(summary)}>
                Save to Records
              </Button>
              <Button variant="secondary" className="w-full h-12 rounded-xl" onClick={() => setSummary(null)}>
                Upload Another
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card className="bg-surface-lowest border border-outline-variant/20 p-6 lg:p-8 space-y-6 rounded-[2.5rem] shadow-xl shadow-primary/5">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={20} />
                  <h3 className="text-base font-bold">AI Summary</h3>
                </div>
                <Badge status="Info" className="text-[10px]">Verified AI</Badge>
              </div>
              <div className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
                {summary}
              </div>
              <div className="pt-4 border-t border-outline-variant/30">
                <p className="text-[10px] text-on-surface-variant/40 italic">
                  This AI summary is for informational purposes only and does not replace professional medical advice.
                </p>
              </div>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
};
