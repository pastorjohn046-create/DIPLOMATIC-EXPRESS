import React, { useState, useEffect } from "react";
import { User as UserIcon, Package, FileText, LogOut, ChevronRight, Clock, MapPin, Download } from "lucide-react";
import { motion } from "motion/react";
import { User, Shipment } from "../types";

interface ClientDashboardProps {
  user: User;
  onLogout: () => void;
  setActiveTab: (tab: string) => void;
}

export const ClientDashboard = ({ user, onLogout, setActiveTab }: ClientDashboardProps) => {
  const [myShipments, setMyShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyShipments();
  }, []);

  const fetchMyShipments = async () => {
    try {
      const res = await fetch("/api/shipments");
      if (res.ok) {
        const allShipments: Shipment[] = await res.json();
        // Filter shipments claimed by this user
        const filtered = allShipments.filter(s => s.claimed_by === user.username);
        setMyShipments(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-secondary to-brand-accent flex items-center justify-center text-white shadow-xl">
            <UserIcon size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-brand-primary tracking-tight uppercase">My Account</h2>
            <p className="text-slate-500 font-medium">Welcome back, <span className="text-brand-secondary">{user.username}</span></p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="btn-outline flex items-center gap-2 py-3 px-6 text-red-500 hover:bg-red-50 border-red-100"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-6">
            <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-brand-secondary" />
              Profile Details
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                <p className="font-bold text-brand-primary">{user.username}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                <p className="font-bold text-brand-primary">{user.email || "Not provided"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Type</p>
                <p className="font-bold text-brand-secondary uppercase text-xs tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-primary rounded-3xl p-8 text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/20 blur-3xl rounded-full -mr-16 -mt-16" />
            <h4 className="text-lg font-bold relative z-10">Need Assistance?</h4>
            <p className="text-white/70 text-sm relative z-10">Our support team is available 24/7 to help you with your shipments.</p>
            <button 
              onClick={() => setActiveTab("support")}
              className="w-full py-3 bg-white text-brand-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors relative z-10"
            >
              Contact Support
            </button>
          </div>
        </div>

        {/* My Shipments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-primary tracking-tight flex items-center gap-2">
                <Package size={24} className="text-brand-secondary" />
                My Claimed Shipments
              </h3>
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                {myShipments.length} Total
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-bold">Loading your shipments...</p>
              </div>
            ) : myShipments.length > 0 ? (
              <div className="space-y-4">
                {myShipments.map((shipment) => (
                  <motion.div 
                    key={shipment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-all group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-brand-secondary font-mono bg-white px-3 py-1 rounded-lg border border-slate-200">
                            {shipment.id}
                          </span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            shipment.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-secondary/10 text-brand-secondary'
                          }`}>
                            {shipment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin</p>
                            <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
                              <MapPin size={14} className="text-slate-300" />
                              {shipment.origin}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                            <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
                              <MapPin size={14} className="text-brand-secondary" />
                              {shipment.destination}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                        <button 
                          onClick={() => {
                            // We'll reuse the tracking logic by switching tabs and setting the ID
                            setActiveTab("tracking");
                            // We'd need a way to pass the ID, but for now we'll just go there
                          }}
                          className="text-brand-secondary font-bold text-sm flex items-center gap-1 hover:underline"
                        >
                          View Details
                          <ChevronRight size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab("tracking");
                            // In a real app, we'd trigger the print directly
                          }}
                          className="btn-outline py-2 px-4 text-xs flex items-center gap-2"
                        >
                          <Download size={14} />
                          Receipt
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                  <Package size={40} />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-600 font-bold">No shipments claimed yet</p>
                  <p className="text-slate-400 text-sm max-w-xs">Claim a shipment using your tracking ID to see it here in your dashboard.</p>
                </div>
                <button 
                  onClick={() => setActiveTab("tracking")}
                  className="btn-primary py-3 px-8"
                >
                  Track a Shipment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
