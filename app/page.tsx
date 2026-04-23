"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from "framer-motion";
import { useAuthStore } from "@/store";
import { 
  Brain, 
  Activity, 
  ShieldCheck, 
  Zap, 
  FileText, 
  Pill, 
  ChevronRight, 
  Stethoscope, 
  Heart,
  Globe,
  AlertCircle,
  CheckCircle,
  Lock,
  Shield,
  Award,
  ArrowRight,
  ExternalLink,
  Users,
  Search,
  Check
} from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const borderPulse: Variants = {
  pulse: {
    borderColor: ["rgba(22, 163, 74, 0.2)", "rgba(22, 163, 74, 0.6)", "rgba(22, 163, 74, 0.2)"],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden text-[#1e293b]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md z-50 border-b border-[#E2E8F0] flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#16a34a] flex items-center justify-center shadow-lg shadow-green-600/20">
            <Stethoscope className="text-white" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-serif text-[#1e293b] leading-none">MedCoPilot</span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#16a34a] uppercase">Intelligence</span>
          </div>
        </div>

        <div className="hidden lg:flex gap-10 text-[11px] font-bold tracking-[0.2em] text-[#64748b] uppercase">
          <Link href="#features" className="hover:text-[#16a34a] transition-all hover:tracking-[0.3em]">The Engine</Link>
          <Link href="#journey" className="hover:text-[#16a34a] transition-all hover:tracking-[0.3em]">Workflow</Link>
          <Link href="#security" className="hover:text-[#16a34a] transition-all hover:tracking-[0.3em]">Compliance</Link>
          <Link href="#pricing" className="hover:text-[#16a34a] transition-all hover:tracking-[0.3em]">Access</Link>
        </div>

        <div className="flex items-center gap-6">
          {mounted && isAuthenticated ? (
            <Link href="/dashboard">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#16a34a] text-white px-8 py-3 rounded-xl text-[11px] font-bold tracking-[0.1em] uppercase shadow-xl shadow-green-600/20"
              >
                Go to Dashboard
              </motion.button>
            </Link>
          ) : (
            <Link href="/login">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#1e293b] text-white px-8 py-3 rounded-xl text-[11px] font-bold tracking-[0.1em] uppercase shadow-2xl flex items-center gap-2"
              >
                Sign In <ChevronRight size={14} className="text-[#16a34a]" />
              </motion.button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 md:px-10 min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ y: yBg }}
          className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-[#f0fdf4] blur-[120px] opacity-60 -z-10"
        />
        <div className="absolute bottom-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-[#f1f5f9] blur-[120px] opacity-60 -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col gap-10"
          >
            <motion.div variants={fadeIn} className="flex items-center gap-4 bg-[#f1fdf4] border border-[#16a34a]/20 w-fit px-5 py-2.5 rounded-full">
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#16a34a] z-10" />
                <motion.span 
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-4 h-4 rounded-full bg-[#16a34a]/40" 
                />
              </div>
              <span className="text-[11px] font-bold tracking-[0.3em] text-[#16a34a] uppercase">V2.4 Precision Engine Live</span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="text-6xl md:text-8xl font-bold font-serif text-[#1e293b] leading-[1.05] tracking-tight">
              The <span className="text-[#16a34a] italic">Digital Surgeon</span> For Every Clinic.
            </motion.h1>

            <motion.p variants={fadeIn} className="text-xl md:text-2xl text-[#64748b] leading-relaxed max-w-xl font-light">
              Empowering 500,000+ doctors across Tier-2/3 India with instant AI diagnostics and seamless clinical automation.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-wrap gap-6 pt-4">
              <Link href={mounted && isAuthenticated ? "/dashboard" : "/login"}>
                <motion.button 
                  whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(22, 163, 74, 0.5)" }}
                  className="bg-[#16a34a] text-white px-12 py-5 rounded-2xl text-[13px] font-bold tracking-[0.3em] uppercase transition-all shadow-2xl shadow-green-600/30 active:scale-95 flex items-center gap-3"
                >
                  Initiate Portal <ArrowRight size={18} />
                </motion.button>
              </Link>
            </motion.div>

            <motion.div variants={fadeIn} className="flex items-center gap-8 pt-6 opacity-60">
              <div className="flex flex-col">
                <span className="text-2xl font-bold font-serif">500k+</span>
                <span className="text-[10px] font-bold tracking-widest uppercase">Doctors</span>
              </div>
              <div className="w-px h-10 bg-[#E2E8F0]" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold font-serif">12ms</span>
                <span className="text-[10px] font-bold tracking-widest uppercase">Latency</span>
              </div>
              <div className="w-px h-10 bg-[#E2E8F0]" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold font-serif">99.8%</span>
                <span className="text-[10px] font-bold tracking-widest uppercase">Uptime</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Visual Block */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-10 bg-gradient-to-tr from-[#16a34a]/10 to-blue-500/5 blur-3xl rounded-full -z-10" />
            
            {/* The "Brain" interface mockup */}
            <div className="bg-[#1e293b] rounded-[40px] p-2 shadow-[0_50px_100px_-20px_rgba(30,41,59,0.5)] border border-white/10 overflow-hidden">
               <div className="bg-[#1a2530] rounded-[32px] p-10 border border-white/5 space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-500/80" />
                       <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                       <div className="w-3 h-3 rounded-full bg-[#16a34a]" />
                    </div>
                    <div className="flex gap-4">
                       <div className="h-6 px-3 rounded-full bg-white/5 flex items-center gap-2 border border-white/10">
                          <Brain size={12} className="text-[#16a34a]" />
                          <span className="text-[9px] font-bold text-white/60 tracking-widest uppercase italic">Logic Layer L4</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 }}
                        className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
                     >
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase">Differential Dx</span>
                           <span className="text-[11px] font-bold text-white font-mono">92.4%</span>
                        </div>
                        <h4 className="text-xl font-bold text-white font-serif mb-2">Myocardial Infarction</h4>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "92.4%" }}
                              transition={{ duration: 2, delay: 1.5 }}
                              className="h-full bg-gradient-to-r from-[#16a34a] to-[#22c55e]" 
                           />
                        </div>
                     </motion.div>

                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2 }}
                        className="p-6 rounded-3xl bg-[#16a34a]/10 border border-[#16a34a]/30"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-[#16a34a] flex items-center justify-center">
                              <Shield size={20} className="text-white" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase">Safety Engine</span>
                              <span className="text-xs text-white/80">No Drug Interactions Detected</span>
                           </div>
                        </div>
                     </motion.div>
                  </div>
               </div>
            </div>

            {/* Decorative Floating Elements */}
            <motion.div 
               animate={{ y: [0, 20, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-10 -left-10 w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center"
            >
               <Activity size={32} className="text-[#16a34a]" />
            </motion.div>
            
            <motion.div 
               animate={{ y: [0, -20, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-10 -right-10 w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-4 border border-[#E2E8F0]"
            >
               <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-[#1e293b] font-serif tracking-tighter">97%</span>
                  <span className="text-[8px] font-bold text-[#64748b] tracking-widest uppercase">Recall</span>
               </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Marquee */}
      <div className="w-full bg-[#1e293b] py-8 overflow-hidden flex whitespace-nowrap relative border-y border-white/5">
         <motion.div 
            animate={{ x: [0, -2100] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="flex gap-24 items-center justify-center uppercase tracking-[0.4em] text-[11px] font-bold text-white/40"
         >
           {[1,2,3,4,5,6].map(i => (
             <span key={i} className="flex gap-24 items-center">
               <span><b className="text-white text-lg font-serif italic pr-3">5k+</b> Clinics Onboarded</span>
               <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
               <span><b className="text-white text-lg font-serif italic pr-3">12M+</b> Guidelines Vectorized in Qdrant</span>
               <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
               <span><b className="text-white text-lg font-serif italic pr-3">1B+</b> Drug Interaction Pairs Indexed</span>
               <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
               <span><b className="text-white text-lg font-serif italic pr-3">HIPAA</b> & <b className="text-white text-lg font-serif italic pl-3">ABDM</b> Compliant Infrastructure</span>
               <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
             </span>
           ))}
         </motion.div>
      </div>

      {/* The Engine Grid Section */}
      <section id="features" className="py-40 px-6 md:px-10 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-end mb-32">
             <div className="lg:col-span-7">
                <span className="text-[11px] font-bold tracking-[0.4em] text-[#16a34a] uppercase block mb-6 px-1 border-l-4 border-[#16a34a] ml-1">The Core Engine</span>
                <h2 className="text-5xl md:text-7xl font-bold font-serif text-[#1e293b] leading-[1.1]">Clinical IQ Built on Real World Data.</h2>
             </div>
             <div className="lg:col-span-5 pb-2">
                <p className="text-xl text-[#64748b] font-light leading-relaxed">
                   MedCoPilot isn&apos;t just an LLM wrapper. It is a multi-agent diagnostic ecosystem powered by neo4j graph traversal and vectored RAG search across 12M+ guidelines.
                </p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Brain, title: "Diagnostic Pipeline", desc: "LangChain orchestrated inference cycle delivering ICD-11 coded results in seconds.", color: "bg-[#f0fdf4] text-[#16a34a]" },
              { icon: Pill, title: "Interaction Graph", desc: "Traversal of Cypher queries across DrugBank for major polypharmacy safe-guards.", color: "bg-blue-50 text-blue-600" },
              { icon: FileText, title: "OCR Report Extraction", desc: "Google Cloud Vision & Claude Sonnet 3.5 structured lab result extraction.", color: "bg-amber-50 text-amber-600" },
              { icon: Activity, title: "Vitals Forecasting", desc: "Prophet-driven time series anomaly detection to highlight rising clinical risk.", color: "bg-purple-50 text-purple-600" },
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -12 }}
                className="group p-10 rounded-[32px] bg-[#f8fafc] border border-[#E2E8F0] shadow-sm hover:shadow-2xl hover:shadow-[#16a34a]/5 transition-all duration-500"
              >
                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <f.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-[#1e293b] font-serif mb-4 leading-tight">{f.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed font-light">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Journey Section */}
      <section id="journey" className="py-40 px-6 md:px-10 bg-[#1e293b] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full border border-white" />
           <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full border border-white" />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col items-center">
           <div className="text-center max-w-3xl mb-32">
              <span className="text-[11px] font-bold tracking-[0.4em] text-[#16a34a] uppercase block mb-6 italic">The Clinical Loop</span>
              <h2 className="text-5xl md:text-7xl font-bold font-serif text-white mb-8">From Patient Entry to Smart Note.</h2>
              <p className="text-xl text-white/60 font-light">
                 Our system handles the cognitive heavy lifting, so you can focus on the human connection.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {/* Connector Line */}
              <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-white/20 hidden md:block -translate-y-12" />

              {[
                { step: "01", title: "Capture Data", desc: "Speak or upload lab results. MedCoPilot structures the complaint instantly.", icon: Activity },
                { step: "02", title: "Analyze IQ", desc: "Real-time differential diagnosis and drug interaction check.", icon: Brain },
                { step: "03", title: "Smart Export", desc: "Auto-generated SOAP notes exported directly to EMR or Print.", icon: CheckCircle },
              ].map((s, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="flex flex-col items-center text-center relative z-10"
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 border border-white/20 flex items-center justify-center mb-8 backdrop-blur-md group relative">
                     <span className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-xs font-bold font-mono shadow-xl border-4 border-[#1e293b]">
                        {s.step}
                     </span>
                     <s.icon size={40} className="text-[#16a34a]" />
                  </div>
                  <h4 className="text-2xl font-bold text-white font-serif mb-4">{s.title}</h4>
                  <p className="text-md text-white/40 leading-relaxed max-w-xs font-light">
                    {s.desc}
                  </p>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* Compliance & Security Banner */}
      <section id="security" className="py-32 px-6 md:px-10 bg-[#f1f5f9]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-20">
           <div className="max-w-xl">
              <div className="flex gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                   <ShieldCheck className="text-[#16a34a]" />
                </div>
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                   <Lock className="text-blue-600" />
                </div>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold font-serif text-[#1e293b] mb-8 leading-tight">Bank-Grade Security for Every Patient.</h2>
              <p className="text-xl text-[#64748b] leading-relaxed font-light mb-10">
                 We are the first clinical system in India to offer full ABDM integration with local GCP data sovereignty in Mumbai (asia-south1). Your data never leaves Indian borders.
              </p>
              <ul className="space-y-4">
                 {[
                   "HIPAA & ABDM Level 3 Compliant",
                   "AES-256 Cloud Storage Encryption",
                   "One-click Referral Network Security",
                   "Zero-access Knowledge Retrieval"
                 ].map((t, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-bold tracking-wide uppercase text-[#1e293b]">
                       <div className="w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center">
                          <Check size={12} className="text-white" />
                       </div>
                       {t}
                    </li>
                 ))}
              </ul>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1e293b] p-8 rounded-[40px] flex flex-col items-center justify-center text-center w-64 h-64 border border-white/5 shadow-2xl">
                 <Shield size={48} className="text-[#16a34a] mb-6" />
                 <span className="text-white font-serif text-2xl font-bold italic">HIPAA</span>
                 <span className="text-[10px] text-white/50 tracking-widest uppercase font-bold mt-2">Verified</span>
              </div>
              <div className="bg-white p-8 rounded-[40px] flex flex-col items-center justify-center text-center w-64 h-64 border border-[#E2E8F0] shadow-2xl mt-12">
                 <Globe size={48} className="text-blue-600 mb-6" />
                 <span className="text-[#1e293b] font-serif text-2xl font-bold italic">ABDM</span>
                 <span className="text-[10px] text-[#64748b] tracking-widest uppercase font-bold mt-2">Certified</span>
              </div>
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-40 px-6 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
           <div className="text-center max-w-2xl mb-24">
              <h2 className="text-5xl md:text-7xl font-bold font-serif text-[#1e293b] mb-6">Built for Scaling Care.</h2>
              <p className="text-xl text-[#64748b] font-light">Choose the tier that fits your clinical load.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {[
                { name: "Clinical Lite", price: "Free", sub: "For New Registrars", features: ["Up to 10 daily visits", "Basic AI Differential", "Local Data Sync"], cta: "Get Started", primary: false },
                { name: "AI Professional", price: "₹2,499", sub: "per clinic / month", features: ["Unlimited Clinical Visits", "LangChain Multi-Agent IQ", "OCR Lab Extractions", "WhatsApp Notifications"], cta: "Try Pro Free", primary: true },
                { name: "Health Network", price: "Custom", sub: "Tiered Enterprise Scaler", features: ["Hospital MIS Integration", "Dedicated GKE Instance", "mTLS Tunneling", "Whitelabel Mobile App"], cta: "Contact Sales", primary: false },
              ].map((p, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className={`p-12 rounded-[48px] flex flex-col border transition-all ${p.primary ? "bg-[#1e293b] text-white border-white/10 shadow-[0_40px_80px_-15px_rgba(30,41,59,0.3)] relative scale-105 z-10" : "bg-white text-[#1e293b] border-[#E2E8F0]"}`}
                >
                  {p.primary && (
                    <div className="absolute top-0 right-12 -translate-y-1/2 bg-[#16a34a] text-white px-6 py-2 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase shadow-xl">
                       Most Popular
                    </div>
                  )}
                  <div className="mb-10">
                    <span className={`text-[11px] font-bold tracking-[0.3em] uppercase ${p.primary ? "text-[#16a34a]" : "text-[#64748b]"}`}>{p.name}</span>
                    <div className="flex items-baseline gap-2 mt-4">
                      <h3 className="text-5xl font-bold font-serif italic">{p.price}</h3>
                    </div>
                    <p className={`text-sm mt-3 ${p.primary ? "text-white/60" : "text-[#64748b]"}`}>{p.sub}</p>
                  </div>
                  
                  <div className="space-y-6 mb-12 flex-1">
                    {p.features.map((f, j) => (
                       <div key={j} className="flex items-start gap-4">
                          <Check size={18} className={p.primary ? "text-[#16a34a]" : "text-[#16a34a]"} />
                          <span className="text-sm font-light leading-tight">{f}</span>
                       </div>
                    ))}
                  </div>

                  <Link href="/login">
                    <button className={`w-full py-5 rounded-2xl text-[11px] font-bold tracking-[0.3em] uppercase transition-all shadow-xl active:scale-95 ${p.primary ? "bg-[#16a34a] text-white hover:bg-white hover:text-[#1e293b]" : "bg-[#1e293b] text-white"}`}>
                      {p.cta}
                    </button>
                  </Link>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f8fafc] pt-32 pb-16 px-6 md:px-10 border-t border-[#E2E8F0]">
         <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
               <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#16a34a] flex items-center justify-center shadow-lg shadow-green-600/20">
                      <Stethoscope className="text-white" size={24} />
                    </div>
                    <span className="text-2xl font-bold font-serif text-[#1e293b]">MedCoPilot</span>
                  </div>
                  <p className="text-sm text-[#64748b] leading-relaxed max-w-xs font-light">
                    Building the clinical infrastructure of the future for physicians everywhere.
                  </p>
                  <div className="flex gap-4">
                     {[Globe, Heart, Award].map((Ibc, idx) => (
                       <div key={idx} className="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#64748b] hover:border-[#16a34a] hover:text-[#16a34a] transition-all cursor-pointer">
                         <Ibc size={18} />
                       </div>
                     ))}
                  </div>
               </div>

               {[
                 { title: "Platform", links: ["Features", "Accuracy", "Safety Library", "Mobile App"] },
                 { title: "Enterprise", links: ["GCP Infrastructure", "ABDM Integration", "Referral Mesh", "Global Pricing"] },
                 { title: "Company", links: ["About Vision", "Press Kit", "Privacy Policy", "Ethics & Bias"] }
               ].map((c, i) => (
                 <div key={i} className="flex flex-col gap-6">
                    <span className="text-[11px] font-bold tracking-[0.4em] text-[#1e293b] uppercase italic">{c.title}</span>
                    <ul className="flex flex-col gap-4">
                       {c.links.map((l, j) => (
                         <li key={j}>
                            <Link href="#" className="text-sm text-[#64748b] hover:text-[#16a34a] transition-colors font-light italic">— {l}</Link>
                         </li>
                       ))}
                    </ul>
                 </div>
               ))}
            </div>

            <div className="pt-12 border-t border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-8">
               <span className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase">© 2026 MedCoPilot AI. All Sovereign Rights Reserved.</span>
               <div className="flex items-center gap-6 text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase">
                  <span>Mumbai, India</span>
                  <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                  <span>Cloud Active</span>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
