export interface Shipment {
  id: string;
  customer_name: string;
  client_phone: string | null;
  client_photo_url: string | null;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  claimed_by: string | null;
  updates?: ShipmentUpdate[];
  product_photos?: string[];
}

export interface ShipmentUpdate {
  id: number;
  shipment_id: string;
  status: string;
  location: string;
  photo_url: string | null;
  notes: string | null;
  timestamp: string;
}

export interface Ticket {
  id: number;
  customer_email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}
