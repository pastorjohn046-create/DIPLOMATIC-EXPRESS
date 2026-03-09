import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { AdminDashboard } from "./pages/Admin";
import { TrackingPortal } from "./pages/Tracking";
import { SupportPortal } from "./pages/Support";
import { SplashScreen } from "./components/SplashScreen";
import { Auth } from "./pages/Auth";

import { User } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <main className="flex-1 pt-16 md:pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {activeTab === "home" && <Home onTrackClick={() => setActiveTab("tracking")} />}
            {activeTab === "tracking" && <TrackingPortal user={user} setActiveTab={setActiveTab} />}
            {activeTab === "support" && <SupportPortal />}
            {activeTab === "dashboard" && (
              user ? (
                user.role === 'admin' ? (
                  <AdminDashboard user={user} onLogout={() => setUser(null)} />
                ) : (
                  <div className="py-20 text-center space-y-6 max-w-md mx-auto">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <Lock size={40} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-brand-primary tracking-tight">Access Denied</h2>
                      <p className="text-slate-500">This portal is reserved for DIPLOMATIC EXPRESS administrators only. Please contact support if you believe this is an error.</p>
                    </div>
                    <button onClick={() => setActiveTab("home")} className="btn-primary w-full py-4">Return to Home</button>
                  </div>
                )
              ) : (
                <Auth onLogin={(u) => setUser(u)} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />

      {/* Floating Action Button for Mobile Quick Access (Optional) */}
      <div className="fixed bottom-8 right-8 z-40 md:hidden">
        <button 
          onClick={() => setActiveTab("tracking")}
          className="w-16 h-16 bg-brand-secondary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </motion.div>
        </button>
      </div>
    </div>
  );
}
