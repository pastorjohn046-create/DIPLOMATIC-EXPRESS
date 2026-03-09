import React from "react";
import { Truck, Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-brand-primary text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-brand-secondary p-2 rounded-xl">
              <Truck className="text-white" size={24} />
            </div>
            <span className="text-lg md:text-xl font-black tracking-tighter">DIPLOMATIC EXPRESS DELIVERY</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Revolutionizing global logistics with real-time tracking, visual proof of delivery, and seamless supply chain management.
          </p>
          <div className="flex gap-4">
            {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-secondary transition-colors">
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Our Services</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Tracking</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Services</h4>
          <ul className="space-y-4 text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Air Freight</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Ocean Cargo</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Road Transport</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Warehousing</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-6">Contact Us</h4>
          <ul className="space-y-4 text-slate-400">
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-brand-secondary" />
              <span>support@diplomatic-express.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-brand-secondary" />
              <span>+1 (800) DIPLOMATIC</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-brand-secondary" />
              <span>123 Logistics Way, Tech City</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/10 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} DIPLOMATIC EXPRESS DELIVERY. All rights reserved. Built for modern logistics.</p>
      </div>
    </footer>
  );
};
