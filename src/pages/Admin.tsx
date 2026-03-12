import React, { useState, useEffect } from "react";
import { Package, Truck, MessageSquare, X, Camera, LogOut, History, User as UserIcon, FileText, Download, Printer, ShieldCheck, MapPin, ChevronRight, Plane, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Shipment, Ticket, User, Flight } from "../types";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<"shipments" | "cs" | "flights">("shipments");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingFlight, setIsAddingFlight] = useState(false);
  const [newFlight, setNewFlight] = useState({
    airline: "",
    flight_number: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    price: "",
    available_seats: "100"
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showReceiptGen, setShowReceiptGen] = useState(false);
  const [receiptData, setReceiptData] = useState({
    type: "package" as "package" | "flight",
    trackingId: "",
    deliveryDate: "",
    senderName: "",
    senderAddress: "",
    receiverName: "",
    receiverEmail: "",
    receiverAddress: "",
    origin: "",
    content: "Parcel 📦",
    weight: "",
    estDelivery: "",
    paymentStatus: "NOT AVAILABLE",
    quantity: "1",
    action: "In Progress ♻️",
    shippingFee: "",
    ownerPhotoUrl: "",
    // Flight specific fields
    flightNumber: "",
    airline: "",
    departureTime: "",
    arrivalTime: "",
    seatNumber: "",
    gate: "",
    class: "Economy",
    destination: ""
  });
  const [newShipment, setNewShipment] = useState({ id: "", customer_name: "", client_phone: "", origin: "", destination: "", status: "Warehouse" });
  const [clientPhoto, setClientPhoto] = useState<File | null>(null);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null);
  const [isViewingShipment, setIsViewingShipment] = useState(false);
  const [isViewingFlight, setIsViewingFlight] = useState(false);
  const [viewingShipmentData, setViewingShipmentData] = useState<any>(null);
  const [viewingFlightData, setViewingFlightData] = useState<any>(null);
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [editShipmentData, setEditShipmentData] = useState({ customer_name: "", client_phone: "", origin: "", destination: "" });
  const [updateData, setUpdateData] = useState({ status: "Warehouse", location: "", notes: "" });
  const [flightUpdateData, setFlightUpdateData] = useState({ status: "Scheduled", location: "", notes: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    fetchShipments();
    fetchTickets();
    fetchLogs();
    fetchUsers();
    fetchFlights();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "NEW_TICKET") {
        setTickets(prev => [message.data, ...prev]);
      } else if (message.type === "TICKET_REPLY") {
        setReplies(prev => {
          // Only add if it's for the currently selected ticket and not already there
          if (selectedTicket && selectedTicket.id === Number(message.data.ticket_id)) {
            return [...prev, message.data];
          }
          return prev;
        });
      } else if (message.type === "SHIPMENT_UPDATE") {
        fetchShipments();
      }
    };

    return () => ws.close();
  }, []); // Removed selectedTicket from dependencies to prevent unnecessary refetches

  // Refetch replies when selectedTicket changes
  useEffect(() => {
    if (selectedTicket) {
      fetchReplies(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchViewingShipment = async (id: string) => {
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingShipmentData(data);
      }
    } catch (err) {
      console.error("Fetch viewing shipment error:", err);
    }
  };

  const fetchViewingFlight = async (id: number) => {
    try {
      const res = await fetch(`/api/flights/track/${flights.find(f => f.id === id)?.flight_number}`);
      if (res.ok) {
        const data = await res.json();
        setViewingFlightData(data);
      }
    } catch (err) {
      console.error("Fetch viewing flight error:", err);
    }
  };

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
      
      // If we are viewing a shipment, refresh its data too
      if (isViewingShipment && viewingShipmentData) {
        fetchViewingShipment(viewingShipmentData.id);
      }
    } catch (err) {
      console.error("Fetch shipments error:", err);
    }
  };

  const fetchFlights = async () => {
    try {
      const res = await fetch("/api/flights");
      if (res.ok) {
        const data = await res.json();
        setFlights(data);
      }
    } catch (err) {
      console.error("Fetch flights error:", err);
    }
  };

  const handleAddFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newFlight, price: Number(newFlight.price), available_seats: Number(newFlight.available_seats), admin_user: user.username }),
      });
      if (res.ok) {
        setIsAddingFlight(false);
        setNewFlight({ airline: "", flight_number: "", origin: "", destination: "", departure_time: "", arrival_time: "", price: "", available_seats: "100" });
        fetchFlights();
        fetchLogs();
      }
    } catch (err) {
      console.error("Add flight error:", err);
    }
  };

  const handleDeleteFlight = async (id: number) => {
    if (!confirm("Are you sure you want to delete this flight? All bookings will be lost.")) return;
    try {
      const res = await fetch(`/api/flights/${id}?admin_user=${user.username}`, { method: "DELETE" });
      if (res.ok) {
        fetchFlights();
        fetchLogs();
      }
    } catch (err) {
      console.error("Delete flight error:", err);
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

  const handleDeleteShipment = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete shipment ${id}? This will remove all updates and photos.`)) return;

    const res = await fetch(`/api/shipments/${id}?admin_user=${user.username}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchShipments();
      fetchLogs();
    } else {
      alert("Failed to delete shipment.");
    }
  };

  const fetchReplies = async (ticketId: number) => {
    const res = await fetch(`/api/tickets/${ticketId}/replies`);
    const data = await res.json();
    setReplies(data);
  };

  const handleUpdateFlightStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlight) return;

    const res = await fetch(`/api/flights/${selectedFlight.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...flightUpdateData, admin_user: user.username }),
    });

    if (res.ok) {
      setSelectedFlight(null);
      setFlightUpdateData({ status: "Scheduled", location: "", notes: "" });
      fetchFlights();
      fetchLogs();
    }
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

  const handleOwnerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptData({ ...receiptData, ownerPhotoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openReceiptGenWithShipment = (s: Shipment) => {
    setReceiptData({
      ...receiptData,
      type: "package",
      trackingId: s.id,
      receiverName: s.customer_name,
      origin: s.origin,
      receiverAddress: s.destination,
      action: s.status,
      deliveryDate: new Date().toISOString().split('T')[0]
    });
    setShowReceiptGen(true);
  };

  const openReceiptGenWithFlight = (f: any) => {
    setReceiptData({
      ...receiptData,
      type: "flight",
      flightNumber: f.flight_number,
      airline: f.airline,
      origin: f.origin,
      destination: f.destination,
      departureTime: f.departure_time,
      arrivalTime: f.arrival_time,
      shippingFee: `$${f.price}`,
      deliveryDate: new Date(f.departure_time).toISOString().split('T')[0]
    });
    setShowReceiptGen(true);
  };

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-secondary flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg shadow-brand-secondary/20 uppercase shrink-0">
            {user.username[0]}
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-brand-primary tracking-tight">Diplomatic <span className="text-brand-secondary">Xpress</span></h2>
            <p className="text-xs md:text-base text-slate-500">Logged in as <span className="font-bold text-brand-secondary">{user.username}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-4 w-full lg:w-auto">
          <button onClick={() => setShowReceiptGen(true)} className="btn-outline flex-1 md:flex-none flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <FileText size={16} />
            <span className="text-xs md:text-sm font-bold">Receipt</span>
          </button>
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

      <div className="flex border-b border-slate-100 mb-8">
        <button 
          onClick={() => setActiveAdminTab("shipments")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative ${activeAdminTab === "shipments" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Shipments
          {activeAdminTab === "shipments" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveAdminTab("cs")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "cs" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Customer Service
          {tickets.some(t => t.status === 'Open') && <span className="w-2 h-2 bg-brand-secondary rounded-full animate-pulse" />}
          {activeAdminTab === "cs" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveAdminTab("flights")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "flights" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Flights
          {activeAdminTab === "flights" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {activeAdminTab === "shipments" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Truck size={24} className="text-brand-secondary" />
                  Active Shipments
                </h3>
                <div className="flex items-center gap-4">
                  <button onClick={fetchShipments} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-brand-secondary/10 hover:text-brand-secondary transition-all">
                    <History size={16} />
                  </button>
                  <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{shipments.length} Total</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">ID</th>
                      <th className="pb-4 font-bold">Customer</th>
                      <th className="pb-4 font-bold">Destination</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold">Claimed By</th>
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
                        <td className="py-5">
                          {s.claimed_by ? (
                            <span className="text-xs font-bold text-brand-secondary">@{s.claimed_by}</span>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Unclaimed</span>
                          )}
                        </td>
                        <td className="py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => openReceiptGenWithShipment(s)}
                              className="text-brand-secondary font-bold text-sm hover:underline"
                            >
                              Receipt
                            </button>
                            <button 
                              onClick={() => {
                                fetchViewingShipment(s.id);
                                setIsViewingShipment(true);
                              }}
                              className="text-slate-400 font-bold text-sm hover:text-brand-secondary"
                            >
                              View
                            </button>
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
                            <button 
                              onClick={() => handleDeleteShipment(s.id)}
                              className="text-red-400 font-bold text-sm hover:text-red-600"
                            >
                              Delete
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
        )}

        {activeAdminTab === "cs" && (
          <div className="space-y-8">
            <div className="card">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <MessageSquare size={24} className="text-brand-secondary" />
                Customer Service Portal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map((t) => (
                  <div key={t.id} onClick={() => { setSelectedTicket(t); fetchReplies(t.id); }} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-all cursor-pointer group hover:shadow-lg hover:shadow-brand-secondary/5">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                        t.status === 'Open' ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white text-slate-400 border-slate-100'
                      }`}>{t.status}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-brand-primary mb-2 group-hover:text-brand-secondary transition-colors">{t.subject}</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">{t.message}</p>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{t.customer_email}</span>
                      <span className="text-xs font-bold text-brand-secondary">View & Reply →</span>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="col-span-full text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">No customer messages yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "flights" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plane size={24} className="text-brand-secondary" />
                  Flight Management
                </h3>
                <button onClick={() => setIsAddingFlight(true)} className="btn-primary flex items-center gap-2 py-2 px-4">
                  <Plane size={16} />
                  Add Flight
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">Airline / Flight</th>
                      <th className="pb-4 font-bold">Route</th>
                      <th className="pb-4 font-bold">Departure</th>
                      <th className="pb-4 font-bold">Price</th>
                      <th className="pb-4 font-bold">Seats</th>
                      <th className="pb-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flights.map((f) => (
                      <tr key={f.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5">
                          <p className="font-bold text-brand-primary">{f.airline}</p>
                          <p className="text-xs text-slate-400">{f.flight_number}</p>
                        </td>
                        <td className="py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-primary">{f.origin}</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className="font-bold text-brand-secondary">{f.destination}</span>
                          </div>
                        </td>
                        <td className="py-5">
                          <p className="text-sm font-bold text-brand-primary">{new Date(f.departure_time).toLocaleString()}</p>
                        </td>
                        <td className="py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            f.status === "Landed" ? "bg-emerald-100 text-emerald-700" : 
                            f.status === "In-Air" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="py-5">
                          <p className="font-black text-brand-primary">${f.price}</p>
                        </td>
                        <td className="py-5">
                          <p className="text-sm font-bold text-slate-500">{f.available_seats} left</p>
                        </td>
                        <td className="py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => openReceiptGenWithFlight(f)}
                              className="text-brand-secondary font-bold text-sm hover:underline"
                            >
                              Receipt
                            </button>
                            <button 
                              onClick={() => {
                                fetchViewingFlight(f.id);
                                setIsViewingFlight(true);
                              }}
                              className="text-slate-400 font-bold text-sm hover:text-brand-primary"
                            >
                              History
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedFlight(f);
                                setFlightUpdateData({ status: f.status, location: f.location || "", notes: "" });
                              }}
                              className="text-brand-primary font-bold text-sm hover:underline"
                            >
                              Update
                            </button>
                            <button 
                              onClick={() => handleDeleteFlight(f.id)}
                              className="text-red-400 hover:text-red-600 font-bold text-sm"
                            >
                              Delete
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
        )}
      </div>

      <AnimatePresence>
        {showReceiptGen && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowReceiptGen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Receipt Generator</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setReceiptData({...receiptData, type: 'package'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${receiptData.type === 'package' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      Package
                    </button>
                    <button 
                      onClick={() => setReceiptData({...receiptData, type: 'flight'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${receiptData.type === 'flight' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      Flight
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="btn-outline py-2 px-4 flex items-center gap-2">
                      <Printer size={16} /> Print
                    </button>
                    <button onClick={() => setShowReceiptGen(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {receiptData.type === 'package' ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Basic Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Tracking ID</label>
                          <input className="input py-2" value={receiptData.trackingId} onChange={(e) => setReceiptData({...receiptData, trackingId: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Delivery Date</label>
                          <input type="date" className="input py-2" value={receiptData.deliveryDate} onChange={(e) => setReceiptData({...receiptData, deliveryDate: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Sender Name</label>
                        <input className="input py-2" value={receiptData.senderName} onChange={(e) => setReceiptData({...receiptData, senderName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Sender Address</label>
                        <input className="input py-2" value={receiptData.senderAddress} onChange={(e) => setReceiptData({...receiptData, senderAddress: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Receiver Info</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Name</label>
                        <input className="input py-2" value={receiptData.receiverName} onChange={(e) => setReceiptData({...receiptData, receiverName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Email</label>
                        <input className="input py-2" value={receiptData.receiverEmail} onChange={(e) => setReceiptData({...receiptData, receiverEmail: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Address</label>
                        <input className="input py-2" value={receiptData.receiverAddress} onChange={(e) => setReceiptData({...receiptData, receiverAddress: e.target.value})} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Flight Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Flight Number</label>
                          <input className="input py-2" value={receiptData.flightNumber} onChange={(e) => setReceiptData({...receiptData, flightNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Airline</label>
                          <input className="input py-2" value={receiptData.airline} onChange={(e) => setReceiptData({...receiptData, airline: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Origin</label>
                          <input className="input py-2" value={receiptData.origin} onChange={(e) => setReceiptData({...receiptData, origin: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Destination</label>
                          <input className="input py-2" value={receiptData.destination} onChange={(e) => setReceiptData({...receiptData, destination: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Passenger & Schedule</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Passenger Name</label>
                        <input className="input py-2" value={receiptData.receiverName} onChange={(e) => setReceiptData({...receiptData, receiverName: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Departure</label>
                          <input type="datetime-local" className="input py-2" value={receiptData.departureTime} onChange={(e) => setReceiptData({...receiptData, departureTime: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Arrival</label>
                          <input type="datetime-local" className="input py-2" value={receiptData.arrivalTime} onChange={(e) => setReceiptData({...receiptData, arrivalTime: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4 md:col-span-2">
                  <h4 className="font-bold text-brand-primary border-b pb-2">{receiptData.type === 'package' ? 'Consignment' : 'Booking'} Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {receiptData.type === 'package' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Origin</label>
                          <input className="input py-2" value={receiptData.origin} onChange={(e) => setReceiptData({...receiptData, origin: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Content</label>
                          <input className="input py-2" value={receiptData.content} onChange={(e) => setReceiptData({...receiptData, content: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Weight</label>
                          <input className="input py-2" value={receiptData.weight} onChange={(e) => setReceiptData({...receiptData, weight: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Est. Delivery</label>
                          <input className="input py-2" value={receiptData.estDelivery} onChange={(e) => setReceiptData({...receiptData, estDelivery: e.target.value})} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Seat Number</label>
                          <input className="input py-2" placeholder="12A" value={receiptData.seatNumber} onChange={(e) => setReceiptData({...receiptData, seatNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Gate</label>
                          <input className="input py-2" placeholder="B4" value={receiptData.gate} onChange={(e) => setReceiptData({...receiptData, gate: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Class</label>
                          <select className="input py-2" value={receiptData.class} onChange={(e) => setReceiptData({...receiptData, class: e.target.value})}>
                            <option>Economy</option>
                            <option>Premium Economy</option>
                            <option>Business</option>
                            <option>First Class</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Booking Ref</label>
                          <input className="input py-2" placeholder="BK-XXXX" value={receiptData.trackingId} onChange={(e) => setReceiptData({...receiptData, trackingId: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Payment Status</label>
                      <input className="input py-2" value={receiptData.paymentStatus} onChange={(e) => setReceiptData({...receiptData, paymentStatus: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Quantity</label>
                      <input className="input py-2" value={receiptData.quantity} onChange={(e) => setReceiptData({...receiptData, quantity: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Action/Status</label>
                      <input className="input py-2" value={receiptData.action} onChange={(e) => setReceiptData({...receiptData, action: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">{receiptData.type === 'package' ? 'Shipping Fee' : 'Ticket Price'}</label>
                      <input className="input py-2" value={receiptData.shippingFee} onChange={(e) => setReceiptData({...receiptData, shippingFee: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Owner Photo</label>
                      <input type="file" className="input py-2 text-xs" accept="image/*" onChange={handleOwnerPhotoChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Preview (Printable) */}
              <div id="printable-receipt" className="bg-white p-12 border border-slate-200 rounded-lg shadow-sm font-sans text-slate-800">
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                  }
                `}} />
                
                {receiptData.type === 'package' ? (
                  <>
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-12 border-b-4 border-brand-primary pb-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center">
                            <Truck className="text-white" size={28} />
                          </div>
                          <div>
                            <h1 className="text-2xl font-black text-brand-primary leading-tight uppercase tracking-tighter">Diplomatic <span className="text-brand-secondary">Xpress</span></h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Logistics & Courier</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Consignment Receipt</p>
                          <p className="text-sm font-medium text-slate-500 italic">"Global reach, local touch."</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tracking Number</p>
                          <p className="text-xl font-black text-brand-primary font-mono">{receiptData.trackingId || "---"}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date: {receiptData.deliveryDate || new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Address Grid */}
                    <div className="grid grid-cols-2 gap-16 mb-12">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <div className="w-2 h-2 rounded-full bg-brand-secondary" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Shipper Details</h3>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-black text-brand-primary">{receiptData.senderName || "---"}</p>
                          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{receiptData.senderAddress || "---"}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Consignee Details</h3>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-black text-brand-primary">{receiptData.receiverName || "---"}</p>
                          <p className="text-sm font-bold text-brand-secondary">{receiptData.receiverEmail || "---"}</p>
                          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{receiptData.receiverAddress || "---"}</p>
                          {receiptData.ownerPhotoUrl && (
                            <div className="mt-4">
                              <img 
                                src={receiptData.ownerPhotoUrl} 
                                alt="Owner" 
                                className="w-24 h-24 rounded-xl object-cover border-2 border-slate-100 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Main Content Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden mb-12">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Origin</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Weight</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-6 py-8">
                              <p className="font-black text-brand-primary mb-1">{receiptData.content || "General Cargo"}</p>
                              <p className="text-xs text-slate-400 italic">Status: {receiptData.action || "In Transit"}</p>
                            </td>
                            <td className="px-6 py-8 text-center font-bold text-slate-600">{receiptData.origin || "---"}</td>
                            <td className="px-6 py-8 text-center font-bold text-slate-600">{receiptData.weight || "---"}</td>
                            <td className="px-6 py-8 text-right font-black text-brand-primary text-xl">{receiptData.quantity || "1"}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="bg-slate-50/50 p-8 grid grid-cols-2 gap-8 border-t border-slate-200">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Status</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              receiptData.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>{receiptData.paymentStatus || "PENDING"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Delivery</span>
                            <span className="text-sm font-black text-brand-primary">{receiptData.estDelivery || "---"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end space-y-2">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Shipping Fee</p>
                          <p className="text-4xl font-black text-brand-primary tracking-tighter">{receiptData.shippingFee || "---"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Flight Ticket Design */}
                    <div className="border-4 border-brand-primary rounded-3xl overflow-hidden bg-white shadow-xl">
                      <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Plane size={32} className="text-brand-secondary" />
                          <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Diplomatic <span className="text-brand-secondary">Xpress</span> Airways</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Boarding Pass & E-Ticket</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase opacity-60">Flight Number</p>
                          <p className="text-2xl font-black tracking-tighter">{receiptData.flightNumber || "---"}</p>
                        </div>
                      </div>

                      <div className="p-8 grid grid-cols-3 gap-8 relative">
                        {/* Perforation line */}
                        <div className="absolute right-[30%] top-0 bottom-0 border-l-2 border-dashed border-slate-200" />
                        
                        <div className="col-span-2 space-y-8">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passenger Name</p>
                              <p className="text-xl font-black text-brand-primary uppercase">{receiptData.receiverName || "---"}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                              <p className="text-lg font-bold text-slate-600">{receiptData.deliveryDate || "---"}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="text-center space-y-1">
                              <p className="text-3xl font-black text-brand-primary">{receiptData.origin.split('(')[1]?.replace(')', '') || receiptData.origin.substring(0, 3).toUpperCase()}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{receiptData.origin}</p>
                            </div>
                            <div className="flex flex-col items-center gap-2 flex-1 px-8">
                              <div className="w-full h-[2px] bg-slate-200 relative">
                                <Plane size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-secondary" />
                              </div>
                              <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">{receiptData.airline}</p>
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-3xl font-black text-brand-primary">{receiptData.destination.split('(')[1]?.replace(')', '') || receiptData.destination.substring(0, 3).toUpperCase()}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{receiptData.destination}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gate</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.gate || "TBA"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Boarding</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.departureTime ? new Date(receiptData.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "---"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seat</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.seatNumber || "---"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.class}</p>
                            </div>
                          </div>
                        </div>

                        <div className="pl-8 space-y-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passenger</p>
                            <p className="text-sm font-black text-brand-primary uppercase truncate">{receiptData.receiverName || "---"}</p>
                          </div>
                          <div className="flex justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</p>
                              <p className="text-sm font-bold text-slate-600">{receiptData.origin.split('(')[1]?.replace(')', '') || receiptData.origin.substring(0, 3).toUpperCase()}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</p>
                              <p className="text-sm font-bold text-slate-600">{receiptData.destination.split('(')[1]?.replace(')', '') || receiptData.destination.substring(0, 3).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight</p>
                              <p className="text-sm font-black text-brand-primary">{receiptData.flightNumber}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seat</p>
                              <p className="text-sm font-black text-brand-primary">{receiptData.seatNumber || "---"}</p>
                            </div>
                          </div>
                          <div className="pt-4 flex flex-col items-center gap-2">
                             {receiptData.ownerPhotoUrl ? (
                               <img src={receiptData.ownerPhotoUrl} className="w-20 h-20 rounded-lg object-cover border-2 border-slate-100" />
                             ) : (
                               <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                                 <UserIcon size={24} className="text-slate-300" />
                               </div>
                             )}
                             <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID Verified</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex gap-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Booking Ref</p>
                            <p className="text-xs font-bold text-brand-primary">{receiptData.trackingId || "---"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price</p>
                            <p className="text-xs font-bold text-brand-primary">{receiptData.shippingFee || "---"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-500" />
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Valid for travel • Non-transferable</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Footer Section (Common) */}
                <div className="grid grid-cols-3 gap-8 items-end pt-8 border-t border-slate-100 mt-8">
                  <div className="col-span-2 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <ShieldCheck size={20} className="text-brand-secondary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Security Verification</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">This document is digitally signed and verified by Diplomatic Xpress Logistics. Any alteration of this receipt is strictly prohibited and punishable by law.</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-4">
                    <div className="inline-block border-b-2 border-slate-200 px-8 pb-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">Authorized Signature</p>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Logistics Operations Dept.</p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">© 2026 Diplomatic Xpress Logistics. All rights reserved.</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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

        {isViewingShipment && viewingShipmentData && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => { setIsViewingShipment(false); setViewingShipmentData(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-secondary/10 text-brand-secondary rounded-xl flex items-center justify-center">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-primary tracking-tight">Shipment Details</h3>
                    <p className="text-sm font-mono font-bold text-brand-secondary">{viewingShipmentData.id}</p>
                  </div>
                </div>
                <button onClick={() => { setIsViewingShipment(false); setViewingShipmentData(null); }} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="font-bold text-brand-primary">{viewingShipmentData.customer_name}</p>
                    <p className="text-xs text-slate-500">{viewingShipmentData.client_phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-primary">{viewingShipmentData.origin}</span>
                      <ChevronRight size={14} className="text-slate-300" />
                      <span className="font-bold text-brand-secondary">{viewingShipmentData.destination}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                    <span className="px-3 py-1 bg-brand-secondary text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {viewingShipmentData.status}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Claimed By</p>
                    <p className="font-bold text-brand-primary">{viewingShipmentData.claimed_by || "Unclaimed"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-lg font-black text-brand-primary tracking-tight flex items-center gap-2">
                  <History size={20} className="text-brand-secondary" />
                  Transit Timeline
                </h4>
                <div className="space-y-6 border-l-2 border-slate-100 ml-3 pl-6">
                  {viewingShipmentData.updates?.map((update: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full bg-brand-secondary border-2 border-white shadow-sm" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-brand-primary">{update.status}</p>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(update.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {update.location}
                        </p>
                        {update.notes && <p className="text-xs text-slate-400 italic">"{update.notes}"</p>}
                      </div>
                    </div>
                  ))}
                  {(!viewingShipmentData.updates || viewingShipmentData.updates.length === 0) && (
                    <p className="text-sm text-slate-400 italic">No updates recorded yet.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => {
                    setSelectedShipment(viewingShipmentData);
                    setIsViewingShipment(false);
                  }}
                  className="btn-primary flex-1 py-3"
                >
                  Update Status
                </button>
                <button 
                  onClick={() => {
                    setEditShipmentData({
                      customer_name: viewingShipmentData.customer_name,
                      client_phone: viewingShipmentData.client_phone || "",
                      origin: viewingShipmentData.origin,
                      destination: viewingShipmentData.destination
                    });
                    setSelectedShipment(viewingShipmentData);
                    setIsEditingShipment(true);
                    setIsViewingShipment(false);
                  }}
                  className="btn-outline flex-1 py-3"
                >
                  Edit Details
                </button>
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

        {isViewingFlight && viewingFlightData && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsViewingFlight(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Flight History: {viewingFlightData.flight_number}</h3>
                <button onClick={() => setIsViewingFlight(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {viewingFlightData.updates?.map((u: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2 py-0.5 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black rounded uppercase">{u.status}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(u.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">{u.location || "No location provided"}</p>
                    {u.notes && <p className="text-sm text-slate-500 italic">"{u.notes}"</p>}
                  </div>
                ))}
                {(!viewingFlightData.updates || viewingFlightData.updates.length === 0) && (
                  <p className="text-center py-10 text-slate-400 font-bold">No history available.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {selectedFlight && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedFlight(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Update Flight: {selectedFlight.flight_number}</h3>
                <button onClick={() => setSelectedFlight(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleUpdateFlightStatus} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select className="input" value={flightUpdateData.status} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, status: e.target.value })}>
                    <option>Scheduled</option>
                    <option>Delayed</option>
                    <option>Boarding</option>
                    <option>In-Air</option>
                    <option>Landed</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Location</label>
                  <input className="input" placeholder="e.g. Over Atlantic Ocean" value={flightUpdateData.location} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</label>
                  <textarea className="input min-h-[100px]" placeholder="Additional details..." value={flightUpdateData.notes} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, notes: e.target.value })} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setSelectedFlight(null)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Update Flight</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingFlight && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsAddingFlight(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Add New Flight</h3>
                <button onClick={() => setIsAddingFlight(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleAddFlight} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Airline</label>
                    <input required className="input" placeholder="Xpress Airways" value={newFlight.airline} onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Flight Number</label>
                    <input required className="input" placeholder="XP-123" value={newFlight.flight_number} onChange={(e) => setNewFlight({ ...newFlight, flight_number: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" placeholder="New York (JFK)" value={newFlight.origin} onChange={(e) => setNewFlight({ ...newFlight, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" placeholder="London (LHR)" value={newFlight.destination} onChange={(e) => setNewFlight({ ...newFlight, destination: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Departure Time</label>
                    <input required type="datetime-local" className="input" value={newFlight.departure_time} onChange={(e) => setNewFlight({ ...newFlight, departure_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Arrival Time</label>
                    <input required type="datetime-local" className="input" value={newFlight.arrival_time} onChange={(e) => setNewFlight({ ...newFlight, arrival_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Price ($)</label>
                    <input required type="number" className="input" placeholder="599" value={newFlight.price} onChange={(e) => setNewFlight({ ...newFlight, price: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Seats</label>
                    <input required type="number" className="input" placeholder="100" value={newFlight.available_seats} onChange={(e) => setNewFlight({ ...newFlight, available_seats: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAddingFlight(false)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Add Flight</button>
                </div>
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
