"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
  role: z.enum(["doctor", "admin", "user"]),
});

type LoginForm = z.infer<typeof loginSchema>;
type LoginRole = LoginForm["role"];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();
  const [activeRole, setActiveRole] = useState<LoginRole>("doctor");
  const [isLoading, setIsLoading] = useState(false);
  const slideIndex = 1;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: "doctor", email: "", password: "" },
  });

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const handleRoleSwitch = (role: LoginRole) => {
    setActiveRole(role);
    setValue("role", role);
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Login failed");
        return;
      }
      setUser(json.data.user, json.data.access_token);
      toast.success(`Welcome back, ${json.data.user.name}`);
      router.push("/dashboard");
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-medcopilot-text-primary">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#F0FDF4] flex-col justify-between p-16">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSIjMTU4MDNkIi8+PC9zdmc+')",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-bold text-[#15803d] font-serif tracking-tight">MedCoPilot</h1>
            <p className="text-[10px] font-bold tracking-[0.25em] text-[#15803d]/70 uppercase">
              Clinical Decision Support
            </p>
          </div>
        </div>

        <div className="relative z-10 my-auto">
          <div className="mb-6 h-px w-12 bg-[#15803d]/30" />
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="text-xs font-bold font-mono text-[#15803d]/60 mb-2 uppercase tracking-widest">
              0{slideIndex} / 03
            </p>
            <h2 className="text-6xl font-bold text-[#14532d] leading-[1.1] font-serif mb-8 max-w-lg">
              Differential Diagnosis in 3 seconds
            </h2>
            <p className="text-xl text-[#3f6212] leading-relaxed max-w-md opacity-80">
              Harness real-time AI to cross-reference millions of clinical journals and patient
              history instantaneously.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 w-full h-24 overflow-hidden -mx-16">
          <svg viewBox="0 0 800 100" className="w-full opacity-20">
            <polyline
              points="0,50 100,50 150,50 170,10 190,90 210,50 300,50 330,30 360,70 390,50 450,50 470,5 500,95 530,50 600,50 630,40 660,60 690,50 800,50"
              fill="none"
              stroke="#15803d"
              strokeWidth="1.5"
              className="ecg-line"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <h2 className="text-5xl font-bold text-[#1a2e35] font-serif mb-2">Login</h2>
            <p className="text-[#64748b] text-base">
              {activeRole === "user"
                ? "Secure access for patients and caregivers."
                : "Secure access for verified medical professionals."}
            </p>
          </div>

          <div className="grid grid-cols-3 border border-[#e2e8f0] rounded-lg overflow-hidden mb-8">
            <button
              type="button"
              onClick={() => handleRoleSwitch("doctor")}
              className={`py-3 text-xs font-bold tracking-widest uppercase transition-all ${
                activeRole === "doctor" ? "bg-[#16a34a] text-white" : "bg-white text-[#64748b]"
              }`}
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("admin")}
              className={`py-3 text-xs font-bold tracking-widest uppercase transition-all ${
                activeRole === "admin" ? "bg-[#16a34a] text-white" : "bg-white text-[#64748b]"
              }`}
            >
              Clinic Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("user")}
              className={`py-3 text-xs font-bold tracking-widest uppercase transition-all ${
                activeRole === "user" ? "bg-[#16a34a] text-white" : "bg-white text-[#64748b]"
              }`}
            >
              Patient
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                Electronic Mail
              </label>
              <input
                {...register("email")}
                autoFocus
                placeholder={activeRole === "user" ? "patient@example.com" : "name@clinic.com"}
                className="w-full px-4 py-3.5 border border-[#ced4da] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
              {errors.email && (
                <p className="text-red-500 text-[10px] uppercase font-bold">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5 focus-within:text-[#16a34a]">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                  Access Key
                </label>
                <button
                  type="button"
                  className="text-[10px] font-bold tracking-widest text-[#16a34a] uppercase hover:underline"
                >
                  Lost Access?
                </button>
              </div>
              <input
                {...register("password")}
                type="password"
                placeholder="************"
                className="w-full px-4 py-3.5 border border-[#ced4da] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
              {errors.password && (
                <p className="text-red-500 text-[10px] uppercase font-bold">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              disabled={isLoading}
              className="w-full py-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold tracking-[0.2em] uppercase text-xs rounded-lg transition-all shadow-xl shadow-green-500/10 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? "Authenticating Session..." : "Initiate Session"}
            </button>

            <div className="relative py-4 flex items-center">
              <div className="flex-1 border-t border-[#e2e8f0]" />
              <span className="px-4 text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                Verification Provider
              </span>
              <div className="flex-1 border-t border-[#e2e8f0]" />
            </div>

            <button
              type="button"
              className="w-full py-3.5 bg-[#2d3748] hover:bg-[#1a202c] text-white font-bold tracking-widest uppercase text-[10px] rounded-lg flex items-center justify-center gap-3 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12.48 10.92v3.28h4.69c-.19 1.02-.78 1.88-1.67 2.47v2.05h2.69c1.57-1.44 2.48-3.56 2.48-6.11 0-.52-.05-1.02-.14-1.5h-5.05zM12 23c2.97 0 5.46-.98 7.28-2.66l-2.69-2.05c-.75.5-1.71.79-2.9.79-2.22 0-4.09-1.5-4.77-3.51H2.18v2.13C3.99 21.2 7.7 23 12 23zM7.23 15.57c-.18-.52-.28-1.09-.28-1.67 0-.58.1-1.15.28-1.67l-3.32-2.58C3.17 10.92 3 11.41 3 12.01s.17 1.09.91 2.36l3.32-2.8zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.68-2.01 2.55-3.51 4.77-3.51z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="mt-12 pt-12 border-t border-[#f1f5f9] flex justify-center gap-4">
            <span className="text-[9px] font-bold tracking-wider text-[#94a3b8] uppercase">
              ABDM COMPLIANT
            </span>
            <span className="text-[#cbd5e1] text-[9px]">|</span>
            <span className="text-[9px] font-bold tracking-wider text-[#94a3b8] uppercase">
              HIPAA READY
            </span>
            <span className="text-[#cbd5e1] text-[9px]">|</span>
            <span className="text-[9px] font-bold tracking-wider text-[#94a3b8] uppercase">
              EKO-TO-EKD ENCRYPTED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
