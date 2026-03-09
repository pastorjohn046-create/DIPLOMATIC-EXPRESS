import React, { useState, useEffect } from "react";
import { Package, Truck, MessageSquare, X, Camera, LogOut, History, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Shipment, Ticket, User } from "../types";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [newShipment, setNewShipment] = useState({ id: "", customer_name: "", client_phone: "", origin: "", destination: "", status: "Warehouse" });
  const [clientPhoto, setClientPhoto] = useState<File | null>(null);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [editShipmentData, setEditShipmentData] = useState({ customer_name: "", client_phone: "", origin: "", destination: "" });
  const [updateData, setUpdateData] = useState({ status: "Warehouse", location: "", notes: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    fetchShipments();
    fetchTickets();
    fetchLogs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

  const fetchShipments = async () => {
    try {
      const res = await fetch("/api/shipments");
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      setShipments(data);
    } catch (err) {
      console.error("Fetch shipments error:", err);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Fetch logs error:", err);
    }
  };

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("id", newShipment.id);
    formData.append("customer_name", newShipment.customer_name);
    formData.append("client_phone", newShipment.client_phone);
    formData.append("origin", newShipment.origin);
    formData.append("destination", newShipment.destination);
    formData.append("status", newShipment.status);
    formData.append("admin_user", user.username);
    
    if (clientPhoto) formData.append("client_photo", clientPhoto);
    productPhotos.forEach((p) => formData.append("product_photos", p));

    const res = await fetch("/api/shipments", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setIsAdding(false);
      setNewShipment({ id: "", customer_name: "", client_phone: "", origin: "", destination: "", status: "Warehouse" });
      setClientPhoto(null);
      setProductPhotos([]);
      fetchShipments();
      fetchLogs();
    } else {
      alert("Error adding shipment. Tracking ID might exist.");
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    const formData = new FormData();
    formData.append("status", updateData.status);
    formData.append("location", updateData.location);
    formData.append("notes", updateData.notes);
    formData.append("admin_user", user.username);
    if (photo) formData.append("photo", photo);

    const res = await fetch(`/api/shipments/${selectedShipment.id}/updates`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setSelectedShipment(null);
      setUpdateData({ status: "Warehouse", location: "", notes: "" });
      setPhoto(null);
      fetchShipments();
      fetchLogs();
    }
  };

  const handleEditShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    const res = await fetch(`/api/shipments/${selectedShipment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editShipmentData, admin_user: user.username }),
    });

    if (res.ok) {
      setIsEditingShipment(false);
      setSelectedShipment(null);
      fetchShipments();
      fetchLogs();
    }
  };

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");

  const fetchReplies = async (ticketId: number) => {
    const res = await fetch(`/api/tickets/${ticketId}/replies`);
    const data = await res.json();
    setReplies(data);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newReply) return;
    const res = await fetch(`/api/tickets/${selectedTicket.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_username: "Admin", message: newReply }),
    });
    if (res.ok) {
      setNewReply("");
      fetchReplies(selectedTicket.id);
    }
  };

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-secondary flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg shadow-brand-secondary/20 uppercase shrink-0">
            {user.username[0]}
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-brand-primary tracking-tight">Admin Control</h2>
            <p className="text-xs md:text-base text-slate-500">Logged in as <span className="font-bold text-brand-secondary">{user.username}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 w-full lg:w-auto">
          <button onClick={() => setShowUsers(true)} className="btn-outline flex-1 md:flex-none flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <UserIcon size={16} />
            <span className="text-xs md:text-sm font-bold">Users</span>
          </button>
          <button onClick={() => setShowLogs(true)} className="btn-outline flex-1 md:flex-none flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <History size={16} />
            <span className="text-sm font-bold hidden sm:inline">Logs</span>
            <span className="text-xs font-bold sm:hidden">Logs</span>
          </button>
          <button onClick={() => setIsAdding(true)} className="btn-primary flex-[2] md:flex-none flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <Package size={16} />
            <span className="text-xs md:text-sm font-bold">New Shipment</span>
          </button>
          <button onClick={onLogout} className="p-2 md:p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all shrink-0">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Truck size={24} className="text-brand-secondary" />
                Active Shipments
              </h3>
              <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{shipments.length} Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                    <th className="pb-4 font-bold">ID</th>
                    <th className="pb-4 font-bold">Customer</th>
                    <th className="pb-4 font-bold">Destination</th>
                    <th className="pb-4 font-bold">Status</th>
                    <th className="pb-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {shipments.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 font-mono font-black text-brand-secondary">{s.id}</td>
                      <td className="py-5 font-medium">{s.customer_name}</td>
                      <td className="py-5 text-slate-500">{s.destination}</td>
                      <td className="py-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          s.status === "Delivered" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => {
                              setSelectedShipment(s);
                              setEditShipmentData({
                                customer_name: s.customer_name,
                                client_phone: s.client_phone || "",
                                origin: s.origin,
                                destination: s.destination
                              });
                              setIsEditingShipment(true);
                            }}
                            className="text-slate-400 font-bold text-sm hover:text-brand-primary"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => setSelectedShipment(s)}
                            className="text-brand-secondary font-bold text-sm hover:underline"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <MessageSquare size={24} className="text-brand-secondary" />
              Support Inbox
            </h3>
            <div className="space-y-4">
              {tickets.map((t) => (
                <div key={t.id} onClick={() => { setSelectedTicket(t); fetchReplies(t.id); }} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-slate-100">{t.status}</span>
                    <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-brand-primary mb-1">{t.subject}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{t.message}</p>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-sm text-slate-400">No active tickets.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUsers && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowUsers(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Registered Users</h3>
                <button onClick={() => setShowUsers(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">Username</th>
                      <th className="pb-4 font-bold">Email</th>
                      <th className="pb-4 font-bold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-brand-primary">{u.username}</td>
                        <td className="py-4 text-slate-500">{u.email}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {showLogs && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowLogs(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Admin Activity Logs</h3>
                <button onClick={() => setShowLogs(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-4">
                    <div>
                      <p className="text-sm font-bold text-brand-primary">{log.action}</p>
                      <p className="text-xs text-slate-400">By <span className="text-brand-secondary font-bold">{log.username}</span></p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-10 text-slate-400">No activity logged yet.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isEditingShipment && selectedShipment && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => { setIsEditingShipment(false); setSelectedShipment(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Edit Shipment: {selectedShipment.id}</h3>
                <button onClick={() => { setIsEditingShipment(false); setSelectedShipment(null); }} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleEditShipment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Customer Name</label>
                  <input required className="input" value={editShipmentData.customer_name} onChange={(e) => setEditShipmentData({ ...editShipmentData, customer_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Phone</label>
                  <input required className="input" value={editShipmentData.client_phone} onChange={(e) => setEditShipmentData({ ...editShipmentData, client_phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" value={editShipmentData.origin} onChange={(e) => setEditShipmentData({ ...editShipmentData, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" value={editShipmentData.destination} onChange={(e) => setEditShipmentData({ ...editShipmentData, destination: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}

        {selectedTicket && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Ticket: {selectedTicket.subject}</h3>
                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Original Message</p>
                  <p className="text-sm text-slate-600">{selectedTicket.message}</p>
                </div>
                <div className="space-y-4">
                  {replies.map((r) => (
                    <div key={r.id} className={`p-4 rounded-xl border ${r.sender_username === "Admin" ? "bg-indigo-50 border-indigo-100 ml-8" : "bg-white border-slate-100 mr-8"}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-brand-secondary uppercase">{r.sender_username}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{r.message}</p>
                    </div>
                  ))}
                </div>
              </div>
              <form onSubmit={handleReply} className="flex gap-4">
                <input className="input flex-1" placeholder="Type your reply..." value={newReply} onChange={(e) => setNewReply(e.target.value)} />
                <button type="submit" className="btn-primary px-8">Reply</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsAdding(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-black text-brand-primary tracking-tight">New Shipment</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleAddShipment} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tracking ID</label>
                    <input required className="input" placeholder="LOGI-XXXXX" value={newShipment.id} onChange={(e) => setNewShipment({ ...newShipment, id: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Customer Name</label>
                    <input required className="input" placeholder="John Doe" value={newShipment.customer_name} onChange={(e) => setNewShipment({ ...newShipment, customer_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Phone</label>
                    <input required className="input" placeholder="+1 234 567 890" value={newShipment.client_phone} onChange={(e) => setNewShipment({ ...newShipment, client_phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Photo</label>
                    <input type="file" className="input text-xs" onChange={(e) => setClientPhoto(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" placeholder="New York, NY" value={newShipment.origin} onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" placeholder="London, UK" value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Initial Status</label>
                  <select className="input" value={newShipment.status} onChange={(e) => setNewShipment({ ...newShipment, status: e.target.value })}>
                    <option>Warehouse</option>
                    <option>Courier 1</option>
                    <option>Courier 2</option>
                    <option>Courier 3</option>
                    <option>Shipped</option>
                    <option>In Transit</option>
                    <option>Custom Clearance</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Product Photos (Max 5)</label>
                  <input 
                    type="file" 
                    multiple 
                    className="input text-xs" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setProductPhotos(files.slice(0, 5));
                    }} 
                  />
                  <p className="text-[10px] text-slate-400">{productPhotos.length} photos selected</p>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Create Shipment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedShipment && !isEditingShipment && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedShipment(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Update: {selectedShipment.id}</h3>
                <button onClick={() => setSelectedShipment(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleUpdateStatus} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select className="input" value={updateData.status} onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}>
                    <option>Warehouse</option>
                    <option>Courier 1</option>
                    <option>Courier 2</option>
                    <option>Courier 3</option>
                    <option>Shipped</option>
                    <option>In Transit</option>
                    <option>Custom Clearance</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Location</label>
                  <input className="input" placeholder="Distribution Hub A" value={updateData.location} onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</label>
                  <textarea className="input h-24" placeholder="Update details..." value={updateData.notes} onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Proof Photo</label>
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-brand-secondary transition-all bg-slate-50/50">
                    <Camera size={32} className="text-slate-300" />
                    <span className="text-sm font-bold text-slate-500">{photo ? photo.name : "Click to upload photo"}</span>
                    <input type="file" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setSelectedShipment(null)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Update Status</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
