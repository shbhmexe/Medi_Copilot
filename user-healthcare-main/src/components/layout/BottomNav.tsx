import { Home, FileText, Calendar, User, Bell } from 'lucide-react';
import { Screen } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface BottomNavProps {
  activeTab: Screen;
  onTabChange: (tab: Screen) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'booking', label: 'Booking', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass whisper-shadow rounded-t-2xl px-6 py-3 flex justify-between items-center z-40 border-t border-outline-variant">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || (tab.id === 'records' && activeTab === 'report-detail');
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as Screen)}
            className={cn(
              'flex flex-col items-center gap-1 transition-all duration-300',
              isActive ? 'text-primary scale-110' : 'text-on-surface-variant/60'
            )}
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              isActive && "bg-primary/10"
            )}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
