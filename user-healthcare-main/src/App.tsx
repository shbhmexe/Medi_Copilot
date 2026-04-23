import { useState, useEffect } from 'react';
import { Screen } from './types';
import { BottomNav } from './components/layout/BottomNav';
import { Dashboard } from './components/screens/Dashboard';
import { MedicalRecords } from './components/screens/MedicalRecords';
import { ReportDetail } from './components/screens/ReportDetail';
import { MedicineReminder } from './components/screens/MedicineReminder';
import { AppointmentBooking } from './components/screens/AppointmentBooking';
import { Notifications } from './components/screens/Notifications';
import { UploadReport } from './components/screens/UploadReport';
import { ChatAssistant } from './components/screens/ChatAssistant';
import { Landing } from './components/screens/Landing';
import { Settings } from './components/screens/Settings';
import { HelpCenter } from './components/screens/HelpCenter';
import { Sidebar } from './components/layout/Sidebar';
import { Modal, Button } from './components/ui/Base';
import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'upload' | 'booking' | 'explanation' | null>(null);

  // Simple routing logic
  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <Landing onGetStarted={() => setCurrentScreen('home')} />;
      case 'home':
        return (
          <Dashboard 
            onNavigate={(screen) => {
              if (screen === 'upload') setActiveModal('upload');
              else if (screen === 'booking') setActiveModal('booking');
              else setCurrentScreen(screen);
            }} 
            onOpenChat={() => setIsChatOpen(true)} 
          />
        );
      case 'upload':
        return (
          <UploadReport 
            onBack={() => setCurrentScreen('home')} 
            onComplete={() => setCurrentScreen('records')} 
          />
        );
      case 'records':
        return (
          <MedicalRecords 
            onSelectRecord={(id) => {
              setSelectedRecordId(id);
              setCurrentScreen('report-detail');
            }} 
          />
        );
      case 'report-detail':
        return (
          <ReportDetail 
            id={selectedRecordId || '1'} 
            onBack={() => setCurrentScreen('records')} 
          />
        );
      case 'booking':
        return <AppointmentBooking />;
      case 'profile':
        return <MedicineReminder onNavigate={setCurrentScreen} />; // Using Meds as Profile for this demo to show all screens
      case 'notifications':
        return <Notifications onBack={() => setCurrentScreen('home')} />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpCenter />;
      default:
        return <Dashboard onNavigate={setCurrentScreen} onOpenChat={() => setIsChatOpen(true)} />;
    }
  };

  const isLanding = currentScreen === 'landing';

  return (
    <div className={cn(
      "min-h-screen bg-surface selection:bg-primary/20",
      !isLanding && "lg:flex"
    )}>
      {!isLanding && (
        <Sidebar 
          activeTab={currentScreen} 
          onTabChange={(tab) => {
            if (tab === 'upload') setActiveModal('upload');
            else if (tab === 'booking') setActiveModal('booking');
            else setCurrentScreen(tab);
          }} 
        />
      )}

      <main className={cn(
        "relative min-h-screen transition-all duration-300",
        isLanding ? "w-full" : "flex-1 lg:max-w-screen-2xl lg:mx-auto"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Nav - Mobile Only */}
        {!['report-detail', 'notifications', 'upload', 'landing'].includes(currentScreen) && (
          <div className="lg:hidden">
            <BottomNav 
              activeTab={currentScreen === 'report-detail' ? 'records' : currentScreen} 
              onTabChange={(tab) => {
                if (tab === 'upload') setActiveModal('upload');
                else if (tab === 'booking') setActiveModal('booking');
                else setCurrentScreen(tab);
              }} 
            />
          </div>
        )}

        {/* Quick Action Modals */}
        <Modal 
          isOpen={activeModal === 'upload'} 
          onClose={() => setActiveModal(null)}
          title="Upload Medical Report"
          maxWidth="4xl"
        >
          <UploadReport 
            onBack={() => setActiveModal(null)} 
            onComplete={() => {
              setActiveModal(null);
              setCurrentScreen('records');
            }} 
            isModal={true}
          />
        </Modal>

        <Modal 
          isOpen={activeModal === 'booking'} 
          onClose={() => setActiveModal(null)}
          title="Book Appointment"
          maxWidth="6xl"
        >
          <AppointmentBooking isModal={true} />
        </Modal>

        <Modal 
          isOpen={activeModal === 'explanation'} 
          onClose={() => setActiveModal(null)}
          title="AI Health Insight"
          maxWidth="md"
        >
          <div className="space-y-6">
            <div className="p-4 bg-tertiary/5 rounded-2xl border border-tertiary/10 space-y-3">
              <div className="flex items-center gap-2 text-tertiary">
                <Sparkles size={18} />
                <p className="text-sm font-bold">Why am I seeing this?</p>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Our AI model analyzed your last 3 blood pressure readings (118, 122, 125 mmHg) and detected a consistent upward trend. 
                While still within the normal range, early detection of such trends allows for proactive lifestyle adjustments.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-on-surface">Data Sources Analyzed:</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Manual BP entries (Last 7 days)
                </li>
                <li className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Wearable heart rate data
                </li>
                <li className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Recent Lab Report (Sodium levels)
                </li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => setActiveModal(null)}>I Understand</Button>
          </div>
        </Modal>

        <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </main>
    </div>
  );
}
