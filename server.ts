import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database setup
let db: Database.Database;
try {
  const dbPath = path.resolve("logistics.db");
  db = new Database(dbPath);
  
  // Enable WAL mode for better persistence and concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  console.log(`Database initialized successfully at ${dbPath}`);
} catch (err) {
  console.error("Failed to initialize database:", err);
  process.exit(1);
}

// Ensure database is closed properly on exit
const closeDb = () => {
  if (db) {
    db.close();
    console.log("Database connection closed.");
  }
};

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    client_phone TEXT,
    client_photo_url TEXT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    claimed_by TEXT,
    payment_methods TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shipment_product_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
  );

  CREATE TABLE IF NOT EXISTS shipment_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    photo_url TEXT,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    airline TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    price REAL NOT NULL,
    available_seats INTEGER DEFAULT 100,
    status TEXT DEFAULT 'Scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flight_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id)
  );

  CREATE TABLE IF NOT EXISTS flight_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    passport_number TEXT,
    status TEXT DEFAULT 'Confirmed',
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure columns exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS easily)
const migrate = () => {
  const tables = {
    users: ['role', 'email'],
    shipments: ['client_phone', 'client_photo_url', 'claimed_by', 'payment_methods']
  };

  for (const [table, columns] of Object.entries(tables)) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const existingColumns = info.map(c => c.name);
    
    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        try {
          db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`).run();
          console.log(`Added column ${col} to table ${table}`);
        } catch (e) {
          console.error(`Failed to add column ${col} to ${table}:`, e);
        }
      }
    }
  }
};
migrate();

// Auth endpoints
app.post("/api/auth/signup", (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    console.log(`Signup attempt for username: ${username}, email: ${email}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const result = db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run(username, email, password, role || 'user');
    console.log(`User created with ID: ${result.lastInsertRowid}`);
    
    // Auto-login after signup for efficiency
    const newUser = db.prepare("SELECT id, username, email, role FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
    res.status(201).json(newUser);
  } catch (err: any) {
    console.error("Signup error:", err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    res.status(500).json({ error: "Internal server error during signup", details: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for username/email: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = db.prepare("SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?").get(username, username, password) as any;
    if (user) {
      console.log(`Login successful for user: ${user.username} (ID: ${user.id})`);
      res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
    } else {
      console.log(`Login failed for username/email: ${username} - Invalid credentials`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login", details: err.message });
  }
});

// Seed default admin
try {
  db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run('admin', 'admin@diplomatic-express.com', 'adminpassword123', 'admin');
} catch (e) {}

app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, username, email, role FROM users").all();
  res.json(users);
});

app.get("/api/admin/logs", (req, res) => {
  const logs = db.prepare("SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs);
});

function logAdminAction(username: string, action: string) {
  db.prepare("INSERT INTO admin_logs (username, action) VALUES (?, ?)").run(username, action);
}

// Authorization middleware helper
const verifyAdmin = (username: string | undefined) => {
  if (!username) return false;
  const user = db.prepare("SELECT role FROM users WHERE username = ?").get(username) as any;
  return user && user.role === 'admin';
};

// Multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// WebSocket for real-time updates
wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
});

const broadcastUpdate = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/shipments", (req, res) => {
  const shipments = db.prepare("SELECT * FROM shipments ORDER BY created_at DESC").all();
  res.json(shipments);
});

app.post("/api/shipments", upload.fields([
  { name: 'client_photo', maxCount: 1 },
  { name: 'product_photos', maxCount: 5 }
]), (req, res) => {
  const { id, customer_name, client_phone, origin, destination, admin_user, status } = req.body;
  const files = (req as any).files as { [fieldname: string]: any[] };
  
  const client_photo_url = files?.['client_photo'] ? `/uploads/${files['client_photo'][0].filename}` : null;
  const product_photos = files?.['product_photos'] || [];

  if (!verifyAdmin(admin_user)) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    db.transaction(() => {
      db.prepare("INSERT INTO shipments (id, customer_name, client_phone, client_photo_url, origin, destination, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, customer_name, client_phone, client_photo_url, origin, destination, status || 'Warehouse');

      const insertPhoto = db.prepare("INSERT INTO shipment_product_photos (shipment_id, photo_url) VALUES (?, ?)");
      for (const photo of product_photos) {
        insertPhoto.run(id, `/uploads/${photo.filename}`);
      }
      
      if (admin_user) logAdminAction(admin_user, `Created shipment ${id}`);
    })();
    broadcastUpdate({ type: "SHIPMENT_UPDATE", data: { id, action: "CREATE" } });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Tracking ID already exists or invalid data" });
  }
});

app.get("/api/shipments/:id", (req, res) => {
  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  
  const updates = db.prepare("SELECT * FROM shipment_updates WHERE shipment_id = ? ORDER BY timestamp DESC").all(req.params.id);
  const product_photos = db.prepare("SELECT photo_url FROM shipment_product_photos WHERE shipment_id = ?").all(req.params.id);
  
  res.json({ ...shipment, updates, product_photos: product_photos.map((p: any) => p.photo_url) });
});

app.put("/api/shipments/:id", (req, res) => {
  const { customer_name, client_phone, origin, destination, admin_user } = req.body;
  
  if (!verifyAdmin(admin_user)) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    db.prepare("UPDATE shipments SET customer_name = ?, client_phone = ?, origin = ?, destination = ? WHERE id = ?")
      .run(customer_name, client_phone, origin, destination, req.params.id);
    
    if (admin_user) logAdminAction(admin_user, `Edited shipment ${req.params.id} details`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Edit shipment error:", err);
    res.status(500).json({ error: "Failed to edit shipment", details: err.message });
  }
});

app.post("/api/shipments/:id/updates", upload.single("photo"), (req, res) => {
  const { status, location, notes, admin_user, payment_methods } = req.body;
  
  if (!verifyAdmin(admin_user)) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  const photo_url = (req as any).file ? `/uploads/${(req as any).file.filename}` : null;
  
  db.prepare("INSERT INTO shipment_updates (shipment_id, status, location, photo_url, notes) VALUES (?, ?, ?, ?, ?)")
    .run(req.params.id, status, location, photo_url, notes);
  
  if (payment_methods) {
    db.prepare("UPDATE shipments SET status = ?, payment_methods = ? WHERE id = ?").run(status, payment_methods, req.params.id);
  } else {
    db.prepare("UPDATE shipments SET status = ? WHERE id = ?").run(status, req.params.id);
  }
  
  if (admin_user) logAdminAction(admin_user, `Updated shipment ${req.params.id} to ${status}`);

  const update = { shipment_id: req.params.id, status, location, photo_url, notes, timestamp: new Date() };
  broadcastUpdate({ type: "SHIPMENT_UPDATE", data: update });
  
  res.status(201).json(update);
});

app.post("/api/shipments/:id/claim", (req, res) => {
  const { username } = req.body;
  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  if (shipment.claimed_by) return res.status(400).json({ error: "Shipment already claimed" });
  
  db.prepare("UPDATE shipments SET claimed_by = ? WHERE id = ?").run(username, req.params.id);
  res.json({ success: true });
});

app.get("/api/tickets", (req, res) => {
  const { email } = req.query;
  let tickets;
  if (email) {
    tickets = db.prepare("SELECT * FROM tickets WHERE customer_email = ? ORDER BY created_at DESC").all(email);
  } else {
    tickets = db.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
  }
  res.json(tickets);
});

app.get("/api/tickets/:id/replies", (req, res) => {
  const replies = db.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY timestamp ASC").all(req.params.id);
  res.json(replies);
});

app.post("/api/tickets/:id/replies", (req, res) => {
  const { sender_username, message } = req.body;
  const result = db.prepare("INSERT INTO ticket_replies (ticket_id, sender_username, message) VALUES (?, ?, ?)")
    .run(req.params.id, sender_username, message);
  
  broadcastUpdate({ 
    type: "TICKET_REPLY", 
    data: { id: result.lastInsertRowid, ticket_id: req.params.id, sender_username, message, timestamp: new Date() } 
  });
  
  res.status(201).json({ success: true });
});

app.post("/api/tickets", (req, res) => {
  const { customer_email, subject, message } = req.body;
  const result = db.prepare("INSERT INTO tickets (customer_email, subject, message) VALUES (?, ?, ?)")
    .run(customer_email, subject, message);
  
  broadcastUpdate({ 
    type: "NEW_TICKET", 
    data: { id: result.lastInsertRowid, customer_email, subject, message, status: 'Open', created_at: new Date() } 
  });
  
  res.status(201).json({ success: true });
});

app.delete("/api/shipments/:id", (req, res) => {
  const { admin_user } = req.query;
  
  if (!verifyAdmin(admin_user as string)) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    db.transaction(() => {
      db.prepare("DELETE FROM shipment_updates WHERE shipment_id = ?").run(req.params.id);
      db.prepare("DELETE FROM shipment_product_photos WHERE shipment_id = ?").run(req.params.id);
      db.prepare("DELETE FROM shipments WHERE id = ?").run(req.params.id);
      
      if (admin_user) logAdminAction(admin_user as string, `Deleted shipment ${req.params.id}`);
    })();
    broadcastUpdate({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "DELETE" } });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete shipment error:", err);
    res.status(500).json({ error: "Failed to delete shipment", details: err.message });
  }
});

// Flight API Routes
app.get("/api/flights", (req, res) => {
  const { origin, destination } = req.query;
  let query = "SELECT * FROM flights WHERE 1=1";
  const params: any[] = [];

  if (origin) {
    query += " AND origin LIKE ?";
    params.push(`%${origin}%`);
  }
  if (destination) {
    query += " AND destination LIKE ?";
    params.push(`%${destination}%`);
  }

  query += " ORDER BY departure_time ASC";
  const flights = db.prepare(query).all(...params);
  res.json(flights);
});

app.get("/api/flights/track/:flightNumber", (req, res) => {
  const flight = db.prepare("SELECT * FROM flights WHERE flight_number = ?").get(req.params.flightNumber) as any;
  if (!flight) return res.status(404).json({ error: "Flight not found" });
  
  const updates = db.prepare("SELECT * FROM flight_updates WHERE flight_id = ? ORDER BY timestamp DESC").all(flight.id);
  res.json({ ...flight, updates });
});

app.get("/api/flights/:id/updates", (req, res) => {
  const updates = db.prepare("SELECT * FROM flight_updates WHERE flight_id = ? ORDER BY timestamp DESC").all(req.params.id);
  res.json(updates);
});

app.post("/api/flights/:id/updates", (req, res) => {
  const { status, location, notes, admin_user } = req.body;
  if (!verifyAdmin(admin_user)) return res.status(403).json({ error: "Unauthorized" });

  try {
    db.transaction(() => {
      db.prepare("INSERT INTO flight_updates (flight_id, status, location, notes) VALUES (?, ?, ?, ?)")
        .run(req.params.id, status, location, notes);
      db.prepare("UPDATE flights SET status = ? WHERE id = ?").run(status, req.params.id);
      logAdminAction(admin_user, `Updated flight ${req.params.id} status to ${status}`);
    })();
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/flights", (req, res) => {
  const { airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats, admin_user } = req.body;
  
  if (!verifyAdmin(admin_user)) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    const result = db.prepare(`
      INSERT INTO flights (airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats || 100);
    
    logAdminAction(admin_user, `Added flight ${flight_number} from ${origin} to ${destination}`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add flight", details: err.message });
  }
});

app.post("/api/flights/:id/book", (req, res) => {
  const { user_id, passenger_name, passport_number } = req.body;
  const flightId = req.params.id;

  try {
    db.transaction(() => {
      const flight = db.prepare("SELECT available_seats FROM flights WHERE id = ?").get(flightId) as any;
      if (!flight || flight.available_seats <= 0) {
        throw new Error("Flight not available or fully booked");
      }

      db.prepare("INSERT INTO flight_bookings (flight_id, user_id, passenger_name, passport_number) VALUES (?, ?, ?, ?)")
        .run(flightId, user_id, passenger_name, passport_number);
      
      db.prepare("UPDATE flights SET available_seats = available_seats - 1 WHERE id = ?").run(flightId);
    })();
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/my-bookings/:userId", (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, f.airline, f.flight_number, f.origin, f.destination, f.departure_time, f.price
    FROM flight_bookings b
    JOIN flights f ON b.flight_id = f.id
    WHERE b.user_id = ?
    ORDER BY b.booking_date DESC
  `).all(req.params.userId);
  res.json(bookings);
});

app.delete("/api/flights/:id", (req, res) => {
  const { admin_user } = req.query;
  if (!verifyAdmin(admin_user as string)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    db.transaction(() => {
      db.prepare("DELETE FROM flight_bookings WHERE flight_id = ?").run(req.params.id);
      db.prepare("DELETE FROM flights WHERE id = ?").run(req.params.id);
    })();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for API routes to prevent falling through to Vite
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message,
    path: req.url
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
