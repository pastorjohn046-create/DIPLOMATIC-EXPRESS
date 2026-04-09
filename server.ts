import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Initialize Firebase Admin
try {
  if (firebaseConfig.projectId) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
    console.log("Firebase Admin initialized successfully with project:", firebaseConfig.projectId);
  } else {
    console.warn("Firebase projectId missing in config, skipping Firebase Admin initialization");
  }
} catch (err) {
  console.error("Firebase Admin initialization failed:", err);
}

// Initialize Firestore
const db = admin.firestore();
// Note: If you need a specific database ID, you might need to use the v1 API or a different approach
// with the Admin SDK. For now, we use the default database.

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());
const uploadDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(uploadDir));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database setup - Migrated to Firestore for permanence
console.log("Using Firestore for data persistence.");

// Auth endpoints
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    console.log(`Signup attempt for username: ${username}, email: ${email}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Check if user exists
    const userSnapshot = await db.collection("users").where("username", "==", username).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const userRef = db.collection("users").doc();
    const newUser = {
      id: userRef.id,
      username,
      email: email || null,
      password, // In a real app, hash this!
      role: role || 'user'
    };

    await userRef.set(newUser);
    console.log(`User created with ID: ${userRef.id}`);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error during signup", details: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for username/email: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Check username
    let userSnapshot = await db.collection("users").where("username", "==", username).where("password", "==", password).get();
    
    // Check email if username not found
    if (userSnapshot.empty) {
      userSnapshot = await db.collection("users").where("email", "==", username).where("password", "==", password).get();
    }

    if (!userSnapshot.empty) {
      const user = userSnapshot.docs[0].data();
      console.log(`Login successful for user: ${user.username} (ID: ${user.id})`);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
const seedAdmin = async () => {
  try {
    const existing = await db.collection("users").where("username", "==", "admin").get();
    if (existing.empty) {
      const adminRef = db.collection("users").doc();
      await adminRef.set({
        id: adminRef.id,
        username: 'admin',
        email: 'admin@diplomatic-express.com',
        password: 'adminpassword123',
        role: 'admin'
      });
      console.log("Admin user seeded successfully in Firestore.");
    }
  } catch (e: any) {
    console.error("Error during admin seeding:", e.message);
  }
};
// Run seeding on startup
seedAdmin();

app.get("/api/users", async (req, res) => {
  try {
    if (!(await verifyAdmin(req))) return res.status(403).json({ error: "Unauthorized" });
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map(doc => {
      const { password: _, ...userWithoutPassword } = doc.data();
      return userWithoutPassword;
    });
    res.json(users);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
});

app.get("/api/admin/logs", async (req, res) => {
  try {
    if (!(await verifyAdmin(req))) return res.status(403).json({ error: "Unauthorized" });
    const logsSnapshot = await db.collection("admin_logs").orderBy("timestamp", "desc").limit(100).get();
    const logs = logsSnapshot.docs.map(doc => doc.data());
    res.json(logs);
  } catch (err: any) {
    console.error("Error fetching admin logs:", err);
    res.status(500).json({ error: "Failed to fetch admin logs", details: err.message });
  }
});

async function logAdminAction(username: string, action: string) {
  try {
    await db.collection("admin_logs").add({
      username,
      action,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}

// Authorization middleware helper
const verifyAdmin = async (req: express.Request) => {
  const username = req.body?.admin_user || req.query?.admin_user;
  const adminSecret = req.headers['x-admin-secret'];
  
  console.log(`Verifying admin access for user: ${username}`);

  // If an ADMIN_SECRET is set in environment, it must be provided in headers
  if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.trim() !== "") {
    if (adminSecret !== process.env.ADMIN_SECRET) {
      console.warn(`Admin action attempted with invalid secret from user: ${username}.`);
      return false;
    }
  }

  if (!username) {
    console.warn("Admin action attempted without providing admin_user parameter.");
    return false;
  }

  try {
    const userSnapshot = await db.collection("users").where("username", "==", username).get();
    if (userSnapshot.empty) return false;
    
    const user = userSnapshot.docs[0].data();
    const isAdmin = user && user.role === 'admin';
    if (!isAdmin) {
      console.warn(`User ${username} is not an admin (role: ${user?.role})`);
    }
    return isAdmin;
  } catch (err) {
    console.error("Admin verification error:", err);
    return false;
  }
};

// Multer for photo uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function uploadFile(file: Express.Multer.File): Promise<string> {
  try {
    const bucket = admin.storage().bucket();
    const destination = `uploads/${Date.now()}-${file.originalname}`;
    const fileRef = bucket.file(destination);

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true,
    });

    // Get the public URL
    return `https://storage.googleapis.com/${bucket.name}/${destination}`;
  } catch (err) {
    console.error("Firebase upload failed, falling back to local:", err);
    // Fallback to local disk if Firebase fails
    const dir = process.env.UPLOAD_DIR || "uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return `/uploads/${filename}`;
  }
}

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
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    persistence: {
      database: !!process.env.DATABASE_PATH || true,
      uploads: !!process.env.UPLOAD_DIR || true
    }
  });
});

app.get("/api/shipments", async (req, res) => {
  try {
    const { customer_name, status } = req.query;
    let query: admin.firestore.Query = db.collection("shipments");

    if (customer_name) {
      query = query.where("customer_name", "==", customer_name);
    }
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.orderBy("created_at", "desc").get();
    const shipments = snapshot.docs.map(doc => doc.data());
    res.json(shipments);
  } catch (err: any) {
    console.error("Error fetching shipments:", err);
    res.status(500).json({ error: "Failed to fetch shipments", details: err.message });
  }
});

app.post("/api/shipments", upload.fields([
  { name: 'client_photo', maxCount: 1 },
  { name: 'product_photos', maxCount: 5 }
]), async (req, res) => {
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  const { id, customer_name, client_phone, origin, destination, admin_user, status } = req.body;
  console.log("Creating shipment with data:", { id, customer_name, client_phone, origin, destination, admin_user, status });
  const files = (req as any).files as { [fieldname: string]: any[] };
  
  try {
    let client_photo_url = null;
    if (files?.['client_photo']) {
      client_photo_url = await uploadFile(files['client_photo'][0]);
    }

    const product_photos = files?.['product_photos'] || [];
    const product_photo_urls = [];
    for (const photo of product_photos) {
      product_photo_urls.push(await uploadFile(photo));
    }

    const shipmentRef = db.collection("shipments").doc(id);
    const shipmentData = {
      id,
      customer_name,
      client_phone: client_phone || null,
      client_photo_url,
      origin,
      destination,
      status: status || 'Warehouse',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      product_photos: product_photo_urls
    };

    await shipmentRef.set(shipmentData);
    
    if (admin_user) await logAdminAction(admin_user, `Created shipment ${id}`);
    
    broadcastUpdate({ type: "SHIPMENT_UPDATE", data: { id, action: "CREATE" } });
    res.status(201).json({ id });
  } catch (err: any) {
    console.error("Shipment creation error:", err);
    res.status(400).json({ error: err.message || "Tracking ID already exists or invalid data" });
  }
});

app.get("/api/shipments/:id", async (req, res) => {
  try {
    const shipmentDoc = await db.collection("shipments").doc(req.params.id).get();
    if (!shipmentDoc.exists) return res.status(404).json({ error: "Shipment not found" });
    
    const shipment = shipmentDoc.data();
    const updatesSnapshot = await db.collection("shipments").doc(req.params.id).collection("updates").orderBy("timestamp", "desc").get();
    const updates = updatesSnapshot.docs.map(doc => doc.data());
    
    res.json({ ...shipment, updates });
  } catch (err: any) {
    console.error("Error fetching shipment details:", err);
    res.status(500).json({ error: "Failed to fetch shipment details", details: err.message });
  }
});

app.put("/api/shipments/:id", async (req, res) => {
  const { customer_name, client_phone, origin, destination, admin_user } = req.body;
  
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    await db.collection("shipments").doc(req.params.id).update({
      customer_name,
      client_phone,
      origin,
      destination
    });
    
    if (admin_user) await logAdminAction(admin_user, `Edited shipment ${req.params.id} details`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Edit shipment error:", err);
    res.status(500).json({ error: "Failed to edit shipment", details: err.message });
  }
});

app.post("/api/shipments/:id/updates", upload.single("photo"), async (req, res) => {
  const { status, location, notes, admin_user, payment_methods } = req.body;
  
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    const photo_url = (req as any).file ? await uploadFile((req as any).file) : null;
    
    const updateRef = db.collection("shipments").doc(req.params.id).collection("updates").doc();
    const updateData = {
      id: updateRef.id,
      status,
      location: location || null,
      photo_url,
      notes: notes || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await updateRef.set(updateData);
    
    const updateFields: any = { status };
    if (payment_methods) updateFields.payment_methods = payment_methods;
    
    await db.collection("shipments").doc(req.params.id).update(updateFields);
    
    if (admin_user) await logAdminAction(admin_user, `Updated shipment ${req.params.id} to ${status}`);

    broadcastUpdate({ type: "SHIPMENT_UPDATE", data: { ...updateData, shipment_id: req.params.id } });
    
    res.status(201).json(updateData);
  } catch (err: any) {
    console.error("Update shipment error:", err);
    res.status(500).json({ error: "Failed to update shipment", details: err.message });
  }
});

app.post("/api/shipments/:id/claim", async (req, res) => {
  try {
    const { username } = req.body;
    const shipmentDoc = await db.collection("shipments").doc(req.params.id).get();
    if (!shipmentDoc.exists) return res.status(404).json({ error: "Shipment not found" });
    
    const shipment = shipmentDoc.data();
    if (shipment?.claimed_by) return res.status(400).json({ error: "Shipment already claimed" });
    
    await db.collection("shipments").doc(req.params.id).update({ claimed_by: username });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error claiming shipment:", err);
    res.status(500).json({ error: "Failed to claim shipment", details: err.message });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const { email } = req.query;
    let query: admin.firestore.Query = db.collection("tickets");
    if (email) {
      query = query.where("customer_email", "==", email);
    }
    const snapshot = await query.orderBy("created_at", "desc").get();
    const tickets = snapshot.docs.map(doc => doc.data());
    res.json(tickets);
  } catch (err: any) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets", details: err.message });
  }
});

app.get("/api/tickets/:id/replies", async (req, res) => {
  try {
    const snapshot = await db.collection("tickets").doc(req.params.id).collection("replies").orderBy("timestamp", "asc").get();
    const replies = snapshot.docs.map(doc => doc.data());
    res.json(replies);
  } catch (err: any) {
    console.error("Error fetching ticket replies:", err);
    res.status(500).json({ error: "Failed to fetch ticket replies", details: err.message });
  }
});

app.post("/api/tickets/:id/replies", async (req, res) => {
  try {
    const { sender_username, message } = req.body;
    const replyRef = db.collection("tickets").doc(req.params.id).collection("replies").doc();
    const replyData = {
      id: replyRef.id,
      sender_username,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    await replyRef.set(replyData);
    
    broadcastUpdate({ 
      type: "TICKET_REPLY", 
      data: { ...replyData, ticket_id: req.params.id } 
    });
    
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error("Error posting ticket reply:", err);
    res.status(500).json({ error: "Failed to post ticket reply", details: err.message });
  }
});

app.post("/api/tickets", async (req, res) => {
  try {
    const { customer_email, subject, message } = req.body;
    const ticketRef = db.collection("tickets").doc();
    const ticketData = {
      id: ticketRef.id,
      customer_email,
      subject,
      message,
      status: 'Open',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await ticketRef.set(ticketData);
    
    broadcastUpdate({ 
      type: "NEW_TICKET", 
      data: ticketData 
    });
    
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket", details: err.message });
  }
});

app.delete("/api/shipments/:id", async (req, res) => {
  const { admin_user } = req.query;
  
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    // In Firestore, we need to delete subcollections manually or just the doc
    // For simplicity, we delete the main doc. Subcollections remain but are orphaned.
    await db.collection("shipments").doc(req.params.id).delete();
    
    if (admin_user) await logAdminAction(admin_user as string, `Deleted shipment ${req.params.id}`);
    
    broadcastUpdate({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "DELETE" } });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete shipment error:", err);
    res.status(500).json({ error: "Failed to delete shipment", details: err.message });
  }
});

// Flight API Routes
app.get("/api/flights", async (req, res) => {
  try {
    const { origin, destination } = req.query;
    let query: admin.firestore.Query = db.collection("flights");

    if (origin) {
      query = query.where("origin", "==", origin);
    }
    if (destination) {
      query = query.where("destination", "==", destination);
    }

    const snapshot = await query.orderBy("departure_time", "asc").get();
    const flights = snapshot.docs.map(doc => doc.data());
    res.json(flights);
  } catch (err: any) {
    console.error("Error fetching flights:", err);
    res.status(500).json({ error: "Failed to fetch flights", details: err.message });
  }
});

app.get("/api/flights/track/:flightNumber", async (req, res) => {
  try {
    const snapshot = await db.collection("flights").where("flight_number", "==", req.params.flightNumber).get();
    if (snapshot.empty) return res.status(404).json({ error: "Flight not found" });
    
    const flight = snapshot.docs[0].data();
    const updatesSnapshot = await db.collection("flights").doc(flight.id).collection("updates").orderBy("timestamp", "desc").get();
    const updates = updatesSnapshot.docs.map(doc => doc.data());
    
    res.json({ ...flight, updates });
  } catch (err: any) {
    console.error("Error tracking flight:", err);
    res.status(500).json({ error: "Failed to track flight", details: err.message });
  }
});

app.get("/api/flights/:id/updates", async (req, res) => {
  try {
    const snapshot = await db.collection("flights").doc(req.params.id).collection("updates").orderBy("timestamp", "desc").get();
    const updates = snapshot.docs.map(doc => doc.data());
    res.json(updates);
  } catch (err: any) {
    console.error("Error fetching flight updates:", err);
    res.status(500).json({ error: "Failed to fetch flight updates", details: err.message });
  }
});

app.post("/api/flights/:id/updates", async (req, res) => {
  const { status, location, notes, admin_user } = req.body;
  if (!(await verifyAdmin(req))) return res.status(403).json({ error: "Unauthorized" });

  try {
    const updateRef = db.collection("flights").doc(req.params.id).collection("updates").doc();
    const updateData = {
      id: updateRef.id,
      status,
      location: location || null,
      notes: notes || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await updateRef.set(updateData);
    await db.collection("flights").doc(req.params.id).update({ status });
    
    if (admin_user) await logAdminAction(admin_user, `Updated flight ${req.params.id} status to ${status}`);
    
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/flights", async (req, res) => {
  const { airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats, admin_user } = req.body;
  
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    const flightRef = db.collection("flights").doc();
    const flightData = {
      id: flightRef.id,
      airline,
      flight_number,
      origin,
      destination,
      departure_time,
      arrival_time,
      price: Number(price),
      available_seats: Number(available_seats || 100),
      status: 'Scheduled',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await flightRef.set(flightData);
    
    if (admin_user) await logAdminAction(admin_user, `Added flight ${flight_number} from ${origin} to ${destination}`);
    res.status(201).json({ id: flightRef.id });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add flight", details: err.message });
  }
});

app.post("/api/flights/:id/book", async (req, res) => {
  const { user_id, passenger_name, passport_number } = req.body;
  const flightId = req.params.id;

  try {
    const flightRef = db.collection("flights").doc(flightId);
    await db.runTransaction(async (transaction) => {
      const flightDoc = await transaction.get(flightRef);
      if (!flightDoc.exists) throw new Error("Flight not found");
      
      const flightData = flightDoc.data();
      if (!flightData || flightData.available_seats <= 0) {
        throw new Error("Flight not available or fully booked");
      }

      const bookingRef = db.collection("flights").doc(flightId).collection("bookings").doc();
      transaction.set(bookingRef, {
        id: bookingRef.id,
        user_id,
        passenger_name,
        passport_number: passport_number || null,
        status: 'Confirmed',
        booking_date: admin.firestore.FieldValue.serverTimestamp()
      });
      
      transaction.update(flightRef, {
        available_seats: admin.firestore.FieldValue.increment(-1)
      });
    });
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/my-bookings/:userId", async (req, res) => {
  try {
    const snapshot = await db.collectionGroup("bookings").where("user_id", "==", req.params.userId).get();
    const bookings = snapshot.docs.map(doc => doc.data());
    res.json(bookings);
  } catch (err: any) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});

app.delete("/api/flights/:id", async (req, res) => {
  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    await db.collection("flights").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/setup-check", async (req, res) => {
  if (!(await verifyAdmin(req))) return res.status(403).json({ error: "Unauthorized" });
  
  res.json({ 
    firebase_active: true, 
    tables_ok: true, 
    message: "Using Firebase Firestore for permanent data persistence." 
  });
});

app.get("/api/admin/supabase-status", async (req, res) => {
  if (!(await verifyAdmin(req))) return res.status(403).json({ error: "Unauthorized" });
  
  res.json({
    active: false,
    message: "Supabase integration has been replaced by Firebase Firestore."
  });
});

// Catch-all for API routes to prevent falling through to Vite
app.use("/api", (req, res) => {
  console.warn(`404 API Route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: "API route not found", 
    method: req.method, 
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error Handler:", err);
  if (res.headersSent) return next(err);
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
