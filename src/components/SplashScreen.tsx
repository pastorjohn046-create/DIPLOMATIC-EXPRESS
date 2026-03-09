import React from "react";
import { motion } from "motion/react";
import { Truck } from "lucide-react";

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-brand-primary flex flex-col items-center justify-center z-[100]">
      <div className="relative w-full max-w-md h-40 overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-4 text-brand-secondary"
        >
          <Truck size={64} fill="currentColor" />
          <div className="h-1 w-24 bg-brand-secondary/30 rounded-full" />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center space-y-2"
      >
        <h1 className="text-4xl font-black text-white tracking-tighter">DIPLOMATIC EXPRESS</h1>
        <p className="text-brand-secondary font-bold tracking-widest text-xs uppercase">Global Logistics Solutions</p>
      </motion.div>
    </div>
  );
};
