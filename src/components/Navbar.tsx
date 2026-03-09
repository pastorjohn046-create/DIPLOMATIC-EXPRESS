import React from "react";
import { Truck, Menu, X } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { username: string; role: string } | null;
}

export const Navbar = ({ activeTab, setActiveTab, user }: NavbarProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "tracking", label: "Track Shipment" },
    { id: "support", label: "Support" },
  ];

  if (user?.role === "admin") {
    navItems.push({ id: "dashboard", label: "Admin" });
  } else {
    navItems.push({ id: "dashboard", label: user ? "My Account" : "Login" });
  }

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
          <div className="bg-brand-secondary p-1.5 md:p-2 rounded-xl shadow-lg shadow-brand-secondary/20 shrink-0">
            <Truck className="text-white" size={18} />
          </div>
          <span className="text-[10px] sm:text-base md:text-xl font-black text-brand-primary tracking-tighter leading-none whitespace-nowrap">
            DIPLOMATIC <span className="text-brand-secondary">EXPRESS</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link ${activeTab === item.id ? "nav-link-active" : ""}`}
            >
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => setActiveTab("tracking")}
            className="btn-primary"
          >
            Track Now
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button 
            onClick={() => setActiveTab("tracking")}
            className="btn-primary py-2 px-3 text-[10px] sm:text-sm"
          >
            Track
          </button>
          <button className="text-brand-primary p-1" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-white border-b border-slate-100 p-6 space-y-4 shadow-xl"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className="block w-full text-left text-lg font-semibold text-slate-600 hover:text-brand-secondary"
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </nav>
  );
};
