"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration (ensures Zustand has read from localStorage)
  // Wait for client-side hydration (ensures Zustand has read from localStorage)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.push("/");
    }
  }, [isHydrated, token, router]);

  // While waiting for hydration, show loading
  if (!isHydrated) {
     return (
       <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-emerald-500">
         <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
           <span className="text-xs font-medium opacity-50">Nexus Chat...</span>
         </div>
       </div>
     );
  }


  // If we have no token after hydration, the useEffect will handle redirect
  if (!token) return null;


  return <>{children}</>;
}
