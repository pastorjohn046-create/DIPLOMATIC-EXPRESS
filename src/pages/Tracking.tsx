import React, { useState } from "react";
import { Search, Clock, MapPin, CheckCircle2, AlertCircle, Download, Camera, PackageCheck, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { Shipment, User } from "../types";

interface TrackingPortalProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
}

export const TrackingPortal = ({ user, setActiveTab }: TrackingPortalProps) => {
  const [trackingId, setTrackingId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimStatus, setClaimStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId) return;
    setLoading(true);
    setError("");
    setClaimStatus(null);
    try {
      const res = await fetch(`/api/shipments/${trackingId}`);
      if (res.ok) {
        const data = await res.json();
        setShipment(data);
      } else {
        setError("Tracking ID not found. Please verify and try again.");
        setShipment(null);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user) {
      setActiveTab("auth");
      return;
    }
    if (!shipment) return;

    try {
      const res = await fetch(`/api/shipments/${shipment.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (res.ok) {
        setClaimStatus({ success: true });
        setShipment({ ...shipment, claimed_by: user.username as any });
      } else {
        setClaimStatus({ error: data.error });
      }
    } catch (err) {
      setClaimStatus({ error: "Failed to claim shipment. Please try again." });
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ["Warehouse", "Shipping", "Courier 1", "Courier 2", "Courier 3", "In Transit", "Custom Clearance", "Out for Delivery", "Delivered"];
    return steps.indexOf(status);
  };

  return (
    <div className="py-20 max-w-5xl mx-auto px-6 space-y-16">
      <div className="text-center space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-brand-primary tracking-tight">Track Your Package</h2>
        <p className="text-base md:text-lg text-slate-500">Enter your tracking number below to see real-time status and visual proof of delivery.</p>
      </div>

      <form onSubmit={handleTrack} className="relative max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-secondary to-brand-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative flex flex-col sm:flex-row gap-2">
            <input 
              className="w-full pl-6 pr-6 sm:pr-40 py-4 sm:py-6 rounded-2xl bg-white shadow-2xl border border-slate-100 text-xl sm:text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 transition-all"
              placeholder="LOGI-XXXXX"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="sm:absolute sm:right-3 sm:top-3 sm:bottom-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 py-4 sm:py-0 px-8"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : <MessageSquare size={20} />}
              Customer Care
            </button>
          </div>
        </div>
      </form>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 text-red-500 justify-center font-bold bg-red-50 py-4 rounded-2xl border border-red-100 max-w-md mx-auto">
          <AlertCircle size={24} />
          {error}
        </motion.div>
      )}

      {shipment && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          <div className="card grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10">
            <div className="flex items-center gap-4 md:col-span-2">
              {shipment.client_photo_url && (
                <img src={shipment.client_photo_url} alt="Client" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-brand-secondary shadow-lg" referrerPolicy="no-referrer" />
              )}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Details</span>
                <p className="text-lg md:text-xl font-bold text-brand-primary">{shipment.customer_name}</p>
                <p className="text-sm text-slate-500">{shipment.client_phone}</p>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</span>
              <p className="text-2xl md:text-3xl font-black text-brand-secondary font-mono">{shipment.id}</p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-end gap-3">
              {shipment.claimed_by ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <PackageCheck size={18} />
                  Claimed
                </div>
              ) : (
                <button 
                  onClick={handleClaim}
                  className="btn-primary py-2 px-6 text-sm flex items-center justify-center gap-2"
                >
                  <PackageCheck size={18} />
                  Claim Shipment
                </button>
              )}
              <button onClick={() => window.print()} className="flex items-center justify-center gap-2 text-slate-400 hover:text-brand-secondary font-bold text-sm transition-colors">
                <Download size={18} />
                Download Receipt
              </button>
            </div>
          </div>

          {claimStatus?.error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-bold text-center">
              {claimStatus.error}
            </div>
          )}
          {claimStatus?.success && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 text-sm font-bold text-center">
              Shipment claimed successfully! It is now linked to your account.
            </div>
          )}

          {shipment.product_photos && shipment.product_photos.length > 0 && (
            <div className="card space-y-6">
              <h4 className="text-xl font-black text-brand-primary tracking-tight">Product Images</h4>
              <div className="flex flex-wrap gap-4">
                {shipment.product_photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Product ${i+1}`} className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-md hover:scale-105 transition-transform cursor-pointer" referrerPolicy="no-referrer" />
                ))}
              </div>
            </div>
          )}

          <div className="card space-y-16 overflow-hidden">
            <div className="relative pt-4 overflow-x-auto pb-8 -mx-6 px-6">
              <div className="min-w-[800px] relative">
                <div className="absolute top-[2.1rem] left-0 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(getStatusStep(shipment.status) / 8) * 100}%` }}
                    className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
                <div className="relative flex justify-between">
                  {["Warehouse", "Shipping", "Courier 1", "Courier 2", "Courier 3", "In Transit", "Customs", "Out for Delivery", "Delivered"].map((step, i) => {
                    const isActive = getStatusStep(shipment.status) >= i;
                    return (
                      <div key={step} className="flex flex-col items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-700 ${
                          isActive ? "bg-brand-secondary border-brand-secondary text-white shadow-xl shadow-brand-secondary/30 scale-110" : "bg-white border-slate-100 text-slate-200"
                        }`}>
                          {isActive ? <CheckCircle2 size={24} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${
                          isActive ? "text-brand-primary" : "text-slate-300"
                        }`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <h4 className="text-2xl font-black text-brand-primary tracking-tight flex items-center gap-3">
                <Clock size={28} className="text-brand-secondary" />
                Transit Timeline
              </h4>
              <div className="space-y-10">
                {shipment.updates?.map((update, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-4 border-white shadow-lg transition-colors duration-500 ${i === 0 ? "bg-brand-secondary scale-125" : "bg-slate-300"}`} />
                      {i !== shipment.updates!.length - 1 && <div className="w-1 flex-1 bg-slate-100 my-2 rounded-full" />}
                    </div>
                    <div className="flex-1 space-y-4 pb-10">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                        <div>
                          <p className="text-xl font-black text-brand-primary">{update.status}</p>
                          <p className="text-slate-500 font-medium flex items-center gap-2">
                            <MapPin size={16} className="text-brand-secondary" />
                            {update.location}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{new Date(update.timestamp).toLocaleString()}</span>
                      </div>
                      {update.notes && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed italic">
                          "{update.notes}"
                        </div>
                      )}
                      {update.photo_url && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-brand-secondary">
                            <Camera size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Proof of Delivery</span>
                          </div>
                          <img 
                            src={update.photo_url} 
                            alt="Proof" 
                            className="rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl hover:scale-[1.02] transition-transform cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!shipment.updates || shipment.updates.length === 0) && (
                  <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">Awaiting initial transit scan...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
