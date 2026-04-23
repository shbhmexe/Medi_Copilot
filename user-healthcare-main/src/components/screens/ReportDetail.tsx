import { ArrowLeft, Sparkles, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, Badge, Button } from '@/src/components/ui/Base';
import { Biomarker } from '@/src/types';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

const MOCK_BIOMARKERS: Biomarker[] = [
  { name: 'Total Cholesterol', value: 210, unit: 'mg/dL', min: 125, max: 200, status: 'High' },
  { name: 'HDL Cholesterol', value: 45, unit: 'mg/dL', min: 40, max: 60, status: 'Normal' },
  { name: 'LDL Cholesterol', value: 135, unit: 'mg/dL', min: 0, max: 100, status: 'High' },
  { name: 'Triglycerides', value: 145, unit: 'mg/dL', min: 0, max: 150, status: 'Normal' },
];

export const ReportDetail = ({ id, onBack }: { id: string, onBack: () => void }) => {
  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-headline font-extrabold">Lipid Profile Analysis</h1>
          <p className="text-sm text-on-surface-variant">Oct 12, 2025 • Dr. Aris Thorne • Lab ID: #LP-90210</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - AI Summary & Actions */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-primary/5 border border-primary/10 p-6 space-y-4 rounded-[2rem] shadow-xl shadow-primary/5">
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-bold">AI Summary</h3>
              </div>
              <p className="text-sm text-on-surface leading-relaxed font-medium">
                Your total cholesterol is slightly elevated (210 mg/dL). While your HDL is within a healthy range, your LDL is high. This suggests a need for dietary adjustments, specifically reducing saturated fats.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge status="Attention" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Dietary Change Recommended</Badge>
                <Badge status="Normal" className="bg-tertiary/10 text-tertiary border-tertiary/20">HDL is Healthy</Badge>
              </div>
            </Card>
          </motion.div>

          <Card className="p-6 bg-surface-low/30 border border-outline-variant/20 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Doctor's Note
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              "Please schedule a follow-up in 3 months after implementing the suggested dietary changes. We will re-test then."
            </p>
          </Card>

          <div className="space-y-3">
            <Button className="w-full h-14 rounded-2xl shadow-lg shadow-primary/10">
              Download PDF Report
            </Button>
            <Button variant="secondary" className="w-full h-14 rounded-2xl">
              Share with Doctor
            </Button>
          </div>
        </div>

        {/* Right Column - Biomarkers List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">Detailed Biomarkers</h2>
            <Badge status="Info" className="bg-surface-low text-on-surface-variant border-transparent">4 Metrics Analyzed</Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {MOCK_BIOMARKERS.map((bio, i) => (
              <Card key={i} className="p-6 space-y-6 border border-outline-variant/10 hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold">{bio.name}</h4>
                    <p className="text-xs text-on-surface-variant/60 font-medium">Ref: {bio.min}-{bio.max} {bio.unit}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={cn(
                      "text-2xl font-extrabold",
                      bio.status === 'High' ? "text-error" : bio.status === 'Low' ? "text-orange-500" : "text-tertiary"
                    )}>
                      {bio.value} <span className="text-xs font-bold text-on-surface-variant/40 uppercase">{bio.unit}</span>
                    </p>
                    <Badge status={bio.status === 'Normal' ? 'Normal' : bio.status === 'High' ? 'Urgent' : 'Attention'} className="px-3 py-1">
                      {bio.status}
                    </Badge>
                  </div>
                </div>

                {/* Visual Range Bar - Enhanced */}
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                    <span>Low</span>
                    <span>Normal Range</span>
                    <span>High</span>
                  </div>
                  <div className="h-4 w-full bg-surface-low rounded-full overflow-hidden flex relative border border-outline-variant/10 shadow-inner">
                    <div className="h-full bg-orange-400/20 w-[25%] border-r border-white/20" />
                    <div className="h-full bg-tertiary/10 w-[50%] border-r border-white/20" />
                    <div className="h-full bg-error/10 w-[25%]" />
                    
                    {/* Marker */}
                    <motion.div 
                      initial={{ left: 0 }}
                      animate={{ left: `${Math.min(98, Math.max(2, (bio.value / (bio.max * 1.3)) * 100))}%` }}
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-on-surface rounded-full shadow-xl z-10 border-2 border-white"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-orange-600/60">{bio.min}</span>
                    <span className="text-tertiary/60">Reference Range</span>
                    <span className="text-error/60">{bio.max}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
