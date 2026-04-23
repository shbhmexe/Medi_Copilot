import { Bell, CheckCircle2, AlertCircle, Clock, ArrowLeft, Settings } from 'lucide-react';
import { Card, Badge, Button } from '@/src/components/ui/Base';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

const NOTIFICATIONS = [
  { id: '1', title: 'Report Ready', desc: 'Your Blood Lipid Profile results are ready for review.', time: 'Just now', type: 'success', icon: CheckCircle2 },
  { id: '2', title: 'Medicine Time', desc: 'Time to take your Vitamin D3 supplement (1000 IU).', time: '15m ago', type: 'info', icon: Bell },
  { id: '3', title: 'Appointment Reminder', desc: 'Your consultation with Dr. Aris is tomorrow at 10:30 AM.', time: '2h ago', type: 'info', icon: Clock },
  { id: '4', title: 'Urgent: Follow-up', desc: 'Dr. Sarah Jenkins requested a follow-up visit regarding your last scan.', time: '5h ago', type: 'urgent', icon: AlertCircle },
];

export const Notifications = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high lg:hidden">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Notifications</h1>
            <p className="text-sm text-on-surface-variant">Stay updated with your health activities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-surface-low rounded-2xl text-on-surface-variant/60 hover:bg-surface-high transition-all">
            <Settings size={20} />
          </button>
          <Button size="sm" variant="secondary" className="hidden sm:flex rounded-xl">Mark all as read</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">New</h2>
              <div className="h-px bg-outline-variant/20 flex-1" />
            </div>
            <div className="space-y-4">
              {NOTIFICATIONS.slice(0, 2).map((notif) => {
                const Icon = notif.icon;
                return (
                  <motion.div key={notif.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={cn(
                      "p-5 flex gap-5 items-start transition-all hover:shadow-md border border-outline-variant/10",
                      notif.type === 'urgent' ? "bg-error-container/10 border-error/20" : "bg-surface-lowest"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        notif.type === 'success' ? "bg-tertiary/10 text-tertiary" : 
                        notif.type === 'urgent' ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
                      )}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-base font-bold">{notif.title}</h3>
                          <span className="text-[10px] font-bold text-on-surface-variant/40 bg-surface-low px-2 py-0.5 rounded-md">{notif.time}</span>
                        </div>
                        <p className="text-sm text-on-surface-variant/80 leading-relaxed">{notif.desc}</p>
                        <div className="mt-4 flex gap-3">
                          <Button size="sm" className="rounded-xl h-8 text-[11px] px-4">View Details</Button>
                          <button className="text-[11px] font-bold text-on-surface-variant/40 hover:text-primary transition-colors">Dismiss</button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">Earlier</h2>
              <div className="h-px bg-outline-variant/20 flex-1" />
            </div>
            <div className="space-y-4">
              {NOTIFICATIONS.slice(2).map((notif) => {
                const Icon = notif.icon;
                return (
                  <Card key={notif.id} className="p-5 flex gap-5 items-start opacity-70 bg-surface-low/50 border border-transparent hover:opacity-100 hover:bg-surface-lowest hover:border-outline-variant/20 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-surface-low text-on-surface-variant/40 flex items-center justify-center shrink-0">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-base font-bold">{notif.title}</h3>
                        <span className="text-[10px] font-bold text-on-surface-variant/40">{notif.time}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant/70 leading-relaxed">{notif.desc}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          {/* Promo Card */}
          <Card className="bg-linear-to-br from-primary to-primary-container p-8 relative overflow-hidden rounded-[2rem] shadow-xl shadow-primary/20">
            <div className="relative z-10 space-y-6">
              <div className="space-y-2">
                <Badge status="Info" className="bg-white/20 text-white border-transparent">Recommended</Badge>
                <h4 className="text-white font-bold text-2xl leading-tight font-headline">Annual Physical Check-up</h4>
                <p className="text-white/80 text-sm leading-relaxed">Book your comprehensive screening for early detection and personalized health plan.</p>
              </div>
              <Button variant="secondary" size="lg" className="bg-white text-primary rounded-2xl px-8 w-full font-bold shadow-lg">
                Book Now
              </Button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
          </Card>

          {/* Settings Card */}
          <Card className="p-6 bg-surface-low/30 border border-outline-variant/20 rounded-3xl">
            <h4 className="text-sm font-bold mb-4">Notification Settings</h4>
            <div className="space-y-4">
              {[
                { label: 'Push Notifications', active: true },
                { label: 'Email Alerts', active: true },
                { label: 'SMS Reminders', active: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface-variant">{item.label}</span>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                    item.active ? "bg-primary" : "bg-surface-high"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      item.active ? "right-1" : "left-1"
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};
