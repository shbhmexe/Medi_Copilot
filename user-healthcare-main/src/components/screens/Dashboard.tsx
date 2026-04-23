import { Bell, Plus, Calendar, ArrowRight, Activity, Droplets, Weight, Sparkles, MessageSquare, AlertCircle, TrendingUp, TrendingDown, Minus, FileText, ChevronRight } from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui/Base';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

const BP_DATA = [
  { day: 'Mon', value: 118 },
  { day: 'Tue', value: 122 },
  { day: 'Wed', value: 120 },
  { day: 'Thu', value: 125 },
  { day: 'Fri', value: 121 },
  { day: 'Sat', value: 124 },
  { day: 'Sun', value: 120 },
];

export const Dashboard = ({ onNavigate, onOpenChat }: { onNavigate: (s: any) => void, onOpenChat: () => void }) => {
  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      {/* Header - Hidden on Desktop as Sidebar has it */}
      <header className="flex justify-between items-center lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/5">
            <img src="https://i.pravatar.cc/150?u=aakash" alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest opacity-60">Patient Panel</p>
            <h1 className="text-xl font-headline font-extrabold text-on-surface">Aakash Rana</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('notifications')}
            className="relative p-2.5 bg-surface-lowest whisper-shadow rounded-2xl active:scale-90 transition-transform border border-outline-variant/30"
          >
            <Bell size={20} className="text-on-surface-variant" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-lowest" />
          </button>
        </div>
      </header>

      {/* Emergency Button */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative lg:hidden"
      >
        <button className="w-full bg-error text-white h-14 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-error/20 active:scale-[0.98] transition-transform sos-pulse">
          <AlertCircle size={24} />
          EMERGENCY HELP (SOS)
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Appointment Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-linear-to-br from-primary to-primary-container text-white p-6 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Next Appointment</p>
                    <h3 className="text-2xl font-bold mt-1">Dr. Aris Thorne</h3>
                    <p className="text-white/70 text-sm">Cardiologist • City Hospital</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                    <Calendar size={24} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-bold">
                      Tomorrow, 10:30 AM
                    </div>
                    <div className="hidden sm:block bg-white/10 px-4 py-2 rounded-xl text-xs font-bold">
                      Room 402, Block B
                    </div>
                  </div>
                  <Button variant="secondary" size="md" className="bg-white text-primary rounded-xl px-6 py-2 text-sm font-extrabold">
                    Check-in
                  </Button>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button 
              variant="secondary" 
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1"
              onClick={() => onNavigate('upload')}
            >
              <Plus size={24} className="text-primary" />
              <span className="text-xs font-bold">Upload Report</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1"
              onClick={() => onNavigate('booking')}
            >
              <Calendar size={24} className="text-primary" />
              <span className="text-xs font-bold">Book Visit</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1 hidden sm:flex"
              onClick={() => onNavigate('records')}
            >
              <FileText size={24} className="text-primary" />
              <span className="text-xs font-bold">Records</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1 hidden sm:flex"
              onClick={() => onNavigate('profile')}
            >
              <Activity size={24} className="text-primary" />
              <span className="text-xs font-bold">Vitals</span>
            </Button>
          </div>

          {/* Bento Grid Health Summary - Moved inside left column */}
          <section className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-headline font-bold">Health Overview</h2>
              <button className="text-primary text-xs font-bold flex items-center gap-1">
                Analytics <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[320px]">
              {/* Main Metric - Blood Pressure (Large) */}
              <Card className="col-span-2 row-span-2 p-4 flex flex-col justify-between bg-surface-lowest border border-outline-variant/20 relative overflow-hidden group">
                <div className="space-y-1 relative z-10">
                  <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
                    <Activity size={20} />
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pt-2">Blood Pressure</p>
                  <h3 className="text-2xl font-extrabold tracking-tight">120/80</h3>
                  <p className="text-[10px] font-bold text-primary uppercase">mmHg • Stable</p>
                </div>
                <div className="h-20 w-full relative z-10 -mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={BP_DATA}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#fff" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorVal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              </Card>

              {/* Sugar Level */}
              <Card className="col-span-2 row-span-1 p-3 flex items-center gap-3 bg-surface-lowest border border-outline-variant/20">
                <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
                  <Droplets size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Sugar</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold">98</span>
                    <span className="text-[9px] font-bold text-on-surface-variant/60">mg/dL</span>
                  </div>
                </div>
              </Card>

              {/* Weight */}
              <Card className="col-span-2 row-span-1 p-3 flex items-center gap-3 bg-surface-lowest border border-outline-variant/20">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Weight size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Weight</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold">72.5</span>
                    <span className="text-[9px] font-bold text-on-surface-variant/60">kg</span>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Emergency Desktop */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden lg:block"
          >
            <button className="w-full bg-error text-white h-20 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-error/20 active:scale-[0.98] transition-transform sos-pulse">
              <AlertCircle size={28} />
              SOS EMERGENCY
            </button>
          </motion.div>

          {/* AI Insight Card - Enhanced */}
          <Card className="bg-surface-lowest border border-tertiary/10 p-6 space-y-6 whisper-shadow relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-tertiary/10 rounded-xl text-tertiary">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-base font-bold text-on-surface">AI Health Insight</h4>
              </div>
              <Badge status="Info" className="text-[10px]">Smart Suggestion</Badge>
            </div>
            
            <div className="space-y-4 relative z-10">
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                ⚠️ Your <span className="text-primary font-bold">Blood Pressure</span> trend is slightly increasing over the last 3 readings.
              </p>
              <div className="bg-surface-low p-4 rounded-2xl space-y-3">
                <p className="text-xs text-on-surface-variant font-bold flex items-center gap-2">
                  <ArrowRight size={14} className="text-tertiary" /> Recommendations:
                </p>
                <ul className="text-xs text-on-surface-variant/80 space-y-2 ml-6 list-disc">
                  <li>Reduce sodium intake to under 2,300mg/day</li>
                  <li>Schedule a follow-up with Dr. Thorne</li>
                </ul>
              </div>
              <Button 
                variant="tertiary" 
                size="sm" 
                className="w-full justify-start px-0 text-xs font-bold"
                onClick={() => onNavigate('explanation')}
              >
                Why am I seeing this? <ChevronRight size={14} />
              </Button>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-tertiary/5 rounded-full blur-3xl -mr-24 -mt-24" />
          </Card>
        </div>
      </div>

      {/* Floating AI Button - Enhanced */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenChat}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl flex flex-col items-center justify-center z-50 border-2 border-white/20"
      >
        <Sparkles size={24} className="animate-pulse" />
        <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">Ask AI</span>
      </motion.button>
    </div>
  );
};
