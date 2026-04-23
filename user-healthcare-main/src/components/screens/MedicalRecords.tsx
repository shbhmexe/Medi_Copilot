import { Search, Filter, ChevronRight, FileText, ClipboardList } from 'lucide-react';
import { Card, Badge } from '@/src/components/ui/Base';
import { MedicalRecord } from '@/src/types';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

const MOCK_RECORDS: MedicalRecord[] = [
  { id: '1', title: 'Complete Blood Count', date: 'Oct 24, 2025', doctor: 'Dr. Sarah Jenkins', type: 'Report', status: 'Normal' },
  { id: '2', title: 'Lipid Profile', date: 'Oct 12, 2025', doctor: 'Dr. Aris Thorne', type: 'Report', status: 'Attention' },
  { id: '3', title: 'Amoxicillin 500mg', date: 'Sep 28, 2025', doctor: 'Dr. Michael Chen', type: 'Prescription', status: 'Normal' },
  { id: '4', title: 'Chest X-Ray', date: 'Sep 15, 2025', doctor: 'Dr. Emily Watson', type: 'Report', status: 'Urgent' },
];

export const MedicalRecords = ({ onSelectRecord }: { onSelectRecord: (id: string) => void }) => {
  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-headline font-extrabold">Medical Records</h1>
          <p className="text-sm text-on-surface-variant">Manage your health documents and history</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
            <input 
              type="text" 
              placeholder="Search reports, visits..."
              className="w-full bg-surface-low border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:pb-0">
            {['All', 'Reports', 'Prescriptions', 'Scans'].map((tab, i) => (
              <button 
                key={tab}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                  i === 0 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-low text-on-surface-variant hover:bg-surface-high"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Timeline Layout */}
      <div className="space-y-12">
        {['October 2025', 'September 2025'].map((month) => (
          <section key={month} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest whitespace-nowrap">{month}</h2>
              <div className="h-px bg-outline-variant/30 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_RECORDS.filter(r => r.date.includes(month.split(' ')[0])).map((record) => (
                <motion.div
                  key={record.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectRecord(record.id)}
                >
                  <Card className="flex items-center gap-4 p-5 cursor-pointer group border border-outline-variant/20 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      record.type === 'Report' ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                    )}>
                      {record.type === 'Report' ? <FileText size={28} /> : <ClipboardList size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <h3 className="text-base font-bold truncate pr-2 group-hover:text-primary transition-colors">{record.title}</h3>
                        <Badge status={record.status}>{record.status}</Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant/70 font-medium">{record.date} • {record.doctor}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-surface-low flex items-center justify-center text-on-surface-variant/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
