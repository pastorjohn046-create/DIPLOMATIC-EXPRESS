import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { AdminDashboard } from "./pages/Admin";
import { TrackingPortal } from "./pages/Tracking";
import { SupportPortal } from "./pages/Support";
import { Reviews } from "./pages/Reviews";
import { SplashScreen } from "./components/SplashScreen";
import { Auth } from "./pages/Auth";
import { ClientDashboard } from "./pages/ClientDashboard";
import { Flights } from "./pages/Flights";

import { User } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("logistics_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("logistics_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("logistics_user");
    }
  }, [user]);

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
            {activeTab === "home" && <Home onSupportClick={() => setActiveTab("support")} />}
            {activeTab === "tracking" && <TrackingPortal user={user} setActiveTab={setActiveTab} />}
            {activeTab === "support" && <SupportPortal />}
            {activeTab === "flights" && <Flights user={user} setActiveTab={setActiveTab} />}
            {activeTab === "reviews" && <Reviews />}
            {(activeTab === "dashboard" || activeTab === "auth") && (
              user ? (
                user.role === 'admin' ? (
                  <AdminDashboard user={user} onLogout={() => setUser(null)} />
                ) : (
                  <ClientDashboard user={user} onLogout={() => setUser(null)} setActiveTab={setActiveTab} />
                )
              ) : (
                <Auth onLogin={(u) => { setUser(u); setActiveTab("dashboard"); }} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />

      {/* Floating Action Button for Mobile Quick Access */}
      <div className="fixed bottom-8 right-8 z-40 md:hidden">
        <button 
          onClick={() => setActiveTab("support")}
          className="w-16 h-16 bg-brand-secondary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </motion.div>
        </button>
      </div>
    </div>
  );
}
