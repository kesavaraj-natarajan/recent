import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

import path from "path";

dotenv.config();

// Fallback to .env.example for local development convenience 
// (Note: In production, secrets are managed via platform env vars)
dotenv.config({ path: path.join(process.cwd(), '.env.example') });

const db = new Database(process.env.DATABASE_PATH || "/tmp/farm2home.db");

// Lazy initialization for Supabase client
let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error("Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in the environment variables.");
    }

    // Basic validation to catch Stripe keys being used by mistake
    if (key.startsWith('sb_publishable_') || key.startsWith('pk_')) {
      console.error("CRITICAL: It looks like you are using a Stripe API key for Supabase. Please use the 'anon' 'public' key from your Supabase dashboard (it usually starts with 'eyJ').");
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT,
    phone TEXT,
    address TEXT,
    farmName TEXT,
    location TEXT,
    profilePhoto TEXT,
    lat REAL,
    lng REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    otp TEXT,
    expiresAt DATETIME,
    type TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    price REAL,
    unit TEXT,
    category TEXT,
    image TEXT,
    farmerName TEXT,
    farmerPhoto TEXT,
    farmerMobile TEXT,
    farmLocation TEXT,
    description TEXT,
    stock INTEGER,
    lat REAL,
    lng REAL,
    rating REAL,
    reviews_json TEXT DEFAULT '[]',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    product_name TEXT,
    items_json TEXT,
    total_amount REAL,
    delivery_method TEXT,
    status TEXT DEFAULT 'Processing',
    date_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    email TEXT,
    farmerName TEXT,
    farmerMobile TEXT,
    farmLocation TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, farmerName)
  );
`);

// Migration: Add lat, lng, and reviews_json to products if they don't exist
try {
  db.prepare("ALTER TABLE products ADD COLUMN lat REAL").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE products ADD COLUMN lng REAL").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE products ADD COLUMN reviews_json TEXT DEFAULT '[]'").run();
} catch (e) {}

// Seed default products if table is empty or contains garbage data
try {
  // Clean up obvious test data
  db.prepare("DELETE FROM products WHERE name = 'vhfh' OR name = 'test'").run();

  const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
  if (productCount.count < 9) {
    console.log("Seeding/Refreshing default products into SQLite...");
    const defaultProducts = [
      {
        id: '1', name: 'Organic Desi Tomatoes', price: 45, unit: 'kg', category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Kisan Seva Farm', farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43210', farmLocation: 'Nashik, Maharashtra', description: 'Sun-ripened desi tomatoes grown without synthetic pesticides.', stock: 25, lat: 19.9975, lng: 73.7898, rating: 4.8
      },
      {
        id: '2', name: 'Fresh Shimla Apples', price: 140, unit: 'kg', category: 'Fruits',
        image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Himalayan Orchards', farmerPhoto: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43211', farmLocation: 'Shimla, HP', description: 'Crisp and sweet Shimla apples, harvested just yesterday.', stock: 50, lat: 31.1048, lng: 77.1734, rating: 4.5
      },
      {
        id: '3', name: 'Raw Forest Honey', price: 350, unit: 'jar', category: 'Honey',
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Coorg Bee Apiary', farmerPhoto: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43212', farmLocation: 'Coorg, Karnataka', description: 'Unfiltered, raw honey from Western Ghats wildflowers.', stock: 15, lat: 12.3375, lng: 75.8069, rating: 4.9
      },
      {
        id: '4', name: 'Farm Fresh Desi Eggs', price: 180, unit: 'dozen', category: 'Dairy',
        image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Pavitra Farms', farmerPhoto: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43213', farmLocation: 'Pune, Maharashtra', description: 'Deep orange yolks from hens that roam free on green pastures.', stock: 20, lat: 18.5204, lng: 73.8567, rating: 4.7
      },
      {
        id: '5', name: 'Organic Fresh Palak', price: 30, unit: 'bunch', category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Kisan Seva Farm', farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43210', farmLocation: 'Nashik, Maharashtra', description: 'Tender baby spinach leaves, triple-washed and ready to eat.', stock: 30, lat: 19.9975, lng: 73.7898, rating: 4.2
      },
      {
        id: '6', name: 'Artisan Whole Wheat Pav', price: 60, unit: 'pack', category: 'Grains',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Desi Bakers', farmerPhoto: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43214', farmLocation: 'Bangalore, KA', description: 'Naturally leavened whole wheat pav with a perfect crust.', stock: 10, lat: 12.9716, lng: 77.5946, rating: 4.6
      },
      {
        id: '7', name: 'Fresh Organic Basil', price: 40, unit: 'bunch', category: 'Herbs',
        image: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Green Valley Herbs', farmerPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43215', farmLocation: 'Ooty, Tamil Nadu', description: 'Aromatic sweet basil leaves, perfect for pesto.', stock: 20, lat: 11.4102, lng: 76.6991, rating: 4.9
      },
      {
        id: '8', name: 'Fresh Curry Leaves', price: 15, unit: 'bunch', category: 'Herbs',
        image: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Chennai Greens', farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43216', farmLocation: 'Chennai, Tamil Nadu', description: 'Freshly picked aromatic curry leaves from local gardens.', stock: 50, lat: 13.0827, lng: 80.2707, rating: 4.8
      },
      {
        id: '9', name: 'Madurai Malli (Jasmine)', price: 120, unit: 'string', category: 'Flowers',
        image: 'https://images.unsplash.com/photo-1592751433068-18567f8b9e6e?auto=format&fit=crop&q=80&w=800',
        farmerName: 'Madurai Florals', farmerPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
        farmerMobile: '+91 98765 43217', farmLocation: 'Madurai, Tamil Nadu', description: 'Fragrant Madurai jasmine flowers, freshly strung.', stock: 30, lat: 9.9252, lng: 78.1198, rating: 5.0
      }
    ];

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, price, unit, category, image, farmerName, farmerPhoto, farmerMobile, farmLocation, description, stock, lat, lng, rating, reviews_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const p of defaultProducts) {
      const reviews = p.id === '1' ? [
        { id: 'r1', userName: 'Rahul M.', rating: 5, comment: 'Best tomatoes I\'ve ever had!', date: '2026-03-01' },
        { id: 'r2', userName: 'Anjali D.', rating: 4, comment: 'Very fresh and tasty.', date: '2026-03-05' }
      ] : p.id === '2' ? [
        { id: 'r3', userName: 'Priya W.', rating: 5, comment: 'Super crisp!', date: '2026-03-02' }
      ] : [];

      insertStmt.run(p.id, p.name, p.price, p.unit, p.category, p.image, p.farmerName, p.farmerPhoto, p.farmerMobile, p.farmLocation, p.description, p.stock, p.lat, p.lng, p.rating, JSON.stringify(reviews));
    }
  }
} catch (e) {
  console.error("Error seeding products:", e);
}

// Migration: Add delivery_method to orders if it doesn't exist
try {
  db.prepare("ALTER TABLE orders ADD COLUMN delivery_method TEXT").run();
  console.log("Added delivery_method column to orders table");
} catch (e: any) {
  if (!e.message.includes("duplicate column name")) {
    console.error("Migration error:", e.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Email Helper Function
  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!to) {
      console.error("Failed to send email: No recipients defined (to address is missing)");
      return;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn(`SMTP credentials missing. Simulating email to ${to}: ${subject}`);
      const textContent = html.replace(/<[^>]*>?/gm, '');
      console.log("--- SIMULATED EMAIL CONTENT ---");
      console.log(textContent); 
      console.log("-------------------------------");
      return { simulated: true, otp: textContent.match(/\d{4}/)?.[0] };
    }

    const host = process.env.SMTP_HOST || "smtp.resend.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    
    // Explicit override or port-based default
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    console.log(`[EMAIL] Attempting to send to ${to} via ${host}:${port} (Secure: ${secure})`);

    // Remove spaces from app passwords (e.g. Google App Passwords)
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: pass,
      },
      tls: {
        // Do not fail on invalid certs (common with some SMTP relays)
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "onboarding@resend.dev";
      const info = await transporter.sendMail({
        from: `"Farm2Home" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`[EMAIL] Success: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("[EMAIL] Error occurred:", error);
      throw error;
    }
  };

  // Supabase Sync Helpers
  const syncToSupabase = async (table: string, data: any) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      
      const { error } = await supabase.from(table).upsert(data);
      if (error) console.error(`Supabase Sync Error [${table}]:`, error.message);
    } catch (err: any) {
      if (err.message?.includes("Supabase configuration missing")) {
        // Silent if not configured
      } else {
        console.error(`Supabase Sync Failed [${table}]:`, err.message);
      }
    }
  };

  // Initial Sync on startup if Supabase is available
  const initialSyncToSupabase = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      
      console.log("Checking for data to sync to Supabase...");
      
      // Sync Users
      const localUsers = db.prepare("SELECT * FROM users").all();
      if (localUsers.length > 0) {
        console.log(`Syncing ${localUsers.length} users to Supabase...`);
        const { error: userError } = await supabase.from('users').upsert(localUsers);
        if (userError) console.error("User sync error:", userError.message);
      }
      
      // Sync Orders
      const localOrders = db.prepare("SELECT * FROM orders").all() as any[];
      if (localOrders.length > 0) {
        console.log(`Syncing ${localOrders.length} orders to Supabase...`);
        const formattedOrders = localOrders.map(o => ({
          ...o,
          items_json: JSON.parse(o.items_json || '[]'),
          date_time: o.createdAt || new Date().toISOString()
        }));
        const { error: orderError } = await supabase.from('orders').upsert(formattedOrders);
        if (orderError) console.error("Order sync error:", orderError.message);
      }
      
      console.log("Initial Supabase sync complete.");
    } catch (e: any) {
      if (!e.message?.includes("Supabase configuration missing")) {
        console.error("Initial Supabase sync failed:", e.message);
      }
    }
  };

  initialSyncToSupabase();

  // Auth API Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role, phone, address, farmName, location } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // Check if user already exists
      const existingUser = db.prepare("SELECT email FROM users WHERE email = ?").get(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
      const data = JSON.stringify({ password, name, role, phone, address, farmName, location });

      const stmt = db.prepare(`
        INSERT INTO otps (email, otp, expiresAt, type, data)
        VALUES (?, ?, ?, 'register', ?)
        ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expiresAt = excluded.expiresAt, type = excluded.type, data = excluded.data
      `);
      stmt.run(email, otp, expiresAt, data);

      // Send OTP Email
      const emailResult = await sendEmail(email, "Your Farm2Home Verification Code 🌿", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Welcome to Farm2Home!</h2>
          <p>Hi ${name},</p>
          <p>Please use the following 4-digit code to verify your email address and complete your registration:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #5A5A40;">${otp}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `);

      res.json({ 
        success: true, 
        message: (emailResult as any)?.simulated ? "Email Simulated (Secrets not set)" : "OTP sent to email", 
        requireOtp: true,
        simulated: (emailResult as any)?.simulated,
        otp: (emailResult as any)?.simulated ? otp : undefined // Only expose OTP if simulated
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage = error.code === 'EAUTH' ? "Email verification failed (Authentication Error). Please check your SMTP credentials." : 
                           error.code === 'ESOCKET' ? "Email verification failed (Connection Error). Please check your SMTP host/port." :
                           "Failed to process registration. " + (error.message || "");
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/verify-register", async (req, res) => {
    const { email, otp } = req.body;
    
    try {
      const otpRecord = db.prepare("SELECT * FROM otps WHERE email = ? AND type = 'register'").get(email) as any;
      
      if (!otpRecord) {
        return res.status(400).json({ error: "No pending registration found" });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      if (new Date(otpRecord.expiresAt) < new Date()) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      const data = JSON.parse(otpRecord.data);
      const id = Math.random().toString(36).substring(7);

      const userObj = { 
        id, 
        email, 
        password: data.password, 
        name: data.name, 
        role: data.role, 
        phone: data.phone, 
        address: data.address, 
        farmName: data.farmName, 
        location: data.location 
      };

      const stmt = db.prepare(`
        INSERT INTO users (id, email, password, name, role, phone, address, farmName, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, email, data.password, data.name, data.role, data.phone, data.address, data.farmName, data.location);
      
  // Sync to Supabase
  const userToSync = { ...userObj };
  delete (userToSync as any).password; // Don't sync raw password if possible, but the schema has it
  syncToSupabase('users', userObj);

      // Delete OTP record
      db.prepare("DELETE FROM otps WHERE email = ? AND type = 'register'").run(email);

      const user = { id, email, name: data.name, role: data.role, phone: data.phone, address: data.address, farmName: data.farmName, location: data.location };

      // Send Welcome Email
      sendEmail(email, "Welcome to Farm2Home! 🌿", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Registration Successful, ${data.name}!</h2>
          <p>Your account has been successfully created. You can now start shopping for fresh, local harvest directly from farmers.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Role:</strong> ${data.role === 'farmer' ? 'Farmer' : 'Consumer'}</p>
            <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${email}</p>
          </div>
          <p>Happy harvesting!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `).catch(err => console.error("Welcome email failed:", err));

      res.json({ success: true, user });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Database error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      // Try Supabase first for login
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();
        
        if (data && !error) {
          return res.json({ success: true, user: data });
        }
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows found"
          console.error("Supabase Login Error:", error.message || error);
        }
      } catch (e: any) {
        if (e.message?.includes("Supabase configuration missing")) {
          // Normal during first boot
        } else if (e.code === 'PGRST116' || e.message?.includes("relation") && e.message?.includes("does not exist")) {
           console.error("Supabase Error: 'users' table not found. Please ensure you have run the setup SQL.");
        } else {
          console.warn("Supabase login failed, using SQLite fallback:", e.message || e);
        }
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/user/update", async (req, res) => {
    const { email, name, phone, address, farmName, location } = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE users 
        SET name = ?, phone = ?, address = ?, farmName = ?, location = ?
        WHERE email = ?
      `);
      stmt.run(name, phone, address, farmName, location, email);
      
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

      // Sync to Supabase
      syncToSupabase('users', user);

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/auth/reset-password-request", async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

      const stmt = db.prepare(`
        INSERT INTO otps (email, otp, expiresAt, type, data)
        VALUES (?, ?, ?, 'reset', '{}')
        ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expiresAt = excluded.expiresAt, type = excluded.type, data = excluded.data
      `);
      stmt.run(email, otp, expiresAt);
      
      await sendEmail(email, "Password Reset Verification 🔐", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Use the 4-digit verification code below to proceed:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #5A5A40;">${otp}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `);

      res.json({ success: true, message: "Reset code sent to email" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  app.post("/api/auth/reset-password-verify", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    try {
      const otpRecord = db.prepare("SELECT * FROM otps WHERE email = ? AND type = 'reset'").get(email) as any;
      
      if (!otpRecord) {
        return res.status(400).json({ error: "No pending password reset found" });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      if (new Date(otpRecord.expiresAt) < new Date()) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Update password
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);
      
      // Delete OTP record
      db.prepare("DELETE FROM otps WHERE email = ? AND type = 'reset'").run(email);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset verify error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Email API Route
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Verify connection configuration
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials missing. Email will not be sent.");
        return res.status(200).json({ 
          success: true, 
          message: "Email simulated (SMTP credentials missing)",
          simulated: true 
        });
      }

      // Remove spaces from app passwords (e.g. Google App Passwords)
      const pass = process.env.SMTP_PASS.replace(/\s+/g, '');

      // Configure transporter
      // For production, use real SMTP settings in .env
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: pass,
        },
        pool: true,               // Use connection pooling
        maxConnections: 1,        // Limit connections
        connectionTimeout: 20000, // 20 seconds
        greetingTimeout: 20000,   // 20 seconds
        socketTimeout: 20000,     // 20 seconds
      });

      console.log(`Attempting to send email via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (Secure: ${process.env.SMTP_SECURE})`);

      const info = await transporter.sendMail({
        from: `"Farm2Home" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Error sending email:", error);
      console.log("--- FAILED EMAIL CONTENT ---");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${text || html}`);
      console.log("----------------------------");
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Orders API Route
  app.get("/api/orders", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('email', email)
          .order('date_time', { ascending: false });
        
        if (data && !error) {
          const formattedOrders = data.map((o: any) => ({
            ...o,
            items: o.items_json || [],
            date: new Date(o.date_time).toLocaleDateString()
          }));
          return res.json({ success: true, orders: formattedOrders });
        }
      } catch (e) {
        console.warn("Supabase orders fetch failed, using SQLite fallback.");
      }

      const orders = db.prepare("SELECT * FROM orders WHERE email = ? ORDER BY createdAt DESC").all(email) as any[];
      const formattedOrders = orders.map(o => ({
        ...o,
        items: JSON.parse(o.items_json || '[]'),
        date: new Date(o.createdAt).toLocaleDateString()
      }));
      res.json({ success: true, orders: formattedOrders });
    } catch (error) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Supabase Orders POST API Route
  app.post("/api/orders", async (req, res) => {
    const orderData = req.body;
    const deliveryMethod = orderData.delivery_method || 'pickup';
    
    console.log("--- NEW ORDER RECEIVED ---");
    console.log("Body:", JSON.stringify(orderData, null, 2));
    console.log(`Delivery Method: ${deliveryMethod}`);
    console.log(`Customer Email: ${orderData.email}`);
    console.log("--------------------------");

    if (!orderData || !orderData.email) {
      console.error("Order data or email missing in request body");
      return res.status(400).json({ error: "Missing order data or email" });
    }

    let savedOrder: any = null;

    try {
      const supabase = getSupabase();
      
      console.log("Attempting to save order to Supabase...");
      // Add a timeout to the Supabase request
      const supabasePromise = supabase
        .from('orders')
        .insert([orderData])
        .select();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Supabase request timed out")), 10000)
      );

      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(`Supabase Error: [${error.code}] ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error("Supabase returned no data after insert");
      }
      
      savedOrder = data[0];
      console.log(`Order saved to Supabase with ID: ${savedOrder.id}`);
    } catch (error: any) {
      if (error.message && error.message.includes('fetch failed')) {
        console.warn("Supabase not available (fetch failed), using SQLite fallback.");
      } else if (error.message && error.message.includes('PGRST204')) {
        console.error("CRITICAL: Supabase Schema Mismatch. The 'orders' table is missing the 'city' column.");
        console.error("Please run the SQL in supabase-setup.sql in your Supabase SQL Editor to fix this.");
      } else {
        console.error("Error saving order to Supabase, falling back to SQLite:", error.message || error);
      }
      
      try {
        const id = 'ord_' + Date.now() + Math.floor(Math.random() * 1000);
        console.log(`Attempting to save order to SQLite with ID: ${id}...`);
        const stmt = db.prepare(`
          INSERT INTO orders (id, email, first_name, last_name, address, city, state, zip, product_name, items_json, total_amount, delivery_method)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          id, orderData.email, orderData.first_name, orderData.last_name, 
          orderData.street_address || orderData.address || '', 
          orderData.city || '', 
          orderData.state || '', 
          orderData.zip_code || orderData.zip || '', 
          orderData.product_name, 
          JSON.stringify(orderData.items_json || []),
          orderData.total_amount, deliveryMethod
        );
        savedOrder = { id, ...orderData, delivery_method: deliveryMethod };
        console.log("Order saved to SQLite successfully.");
      } catch (sqliteError) {
        console.error("SQLite fallback failed:", sqliteError);
        return res.status(500).json({ error: "Failed to save order in both Supabase and SQLite" });
      }
    }

    // Send Order Confirmation Email
    if (orderData.email) {
      const deliveryText = deliveryMethod === 'home' ? "Home Delivery" : "Pickup from Farm";
      console.log(`[EMAIL] Attempting to send CONFIRMATION email to ${orderData.email}`);
      
      sendEmail(orderData.email, `Order Confirmed! 🛒 #${savedOrder.id.toString().substring(0, 8)}`, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Order Confirmation</h2>
          <p>Hi ${orderData.first_name},</p>
          <p>Your order has been placed successfully and is being processed by our farmers.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> ${savedOrder.id}</p>
            <p style="margin: 5px 0 0 0;"><strong>Items:</strong> ${orderData.product_name}</p>
            <p style="margin: 5px 0 0 0;"><strong>Total:</strong> ₹${orderData.total_amount}</p>
            <p style="margin: 5px 0 0 0;"><strong>Delivery Type:</strong> ${deliveryText}</p>
          </div>
          <p>${deliveryMethod === 'home' ? "We'll notify you when your harvest is on its way!" : "You will receive an email when your order is ready for pickup."}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `).then(() => console.log(`[EMAIL] Confirmation email sent successfully to ${orderData.email}`))
        .catch(err => console.error(`[EMAIL] Confirmation email FAILED for ${orderData.email}:`, err));

      // If home delivery, send "Delivered" email after 10 seconds
      if (deliveryMethod === 'home') {
        console.log("[EMAIL] Scheduling DELIVERY notification email in 10 seconds...");
        setTimeout(() => {
          console.log(`[EMAIL] Triggering automatic DELIVERY notification for order ${savedOrder.id} to ${orderData.email}`);
          sendEmail(orderData.email, `Order Delivered Successfully! 📦 #${savedOrder.id.toString().substring(0, 8)}`, `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4CAF50;">Delivered!</h2>
              <p>Hi ${orderData.first_name},</p>
              <p>Your order #${savedOrder.id} has been delivered successfully. We hope you enjoy your fresh harvest!</p>
              <p>Don't forget to leave a review for the farmer.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
            </div>
          `).then(() => console.log(`[EMAIL] Delivery notification sent successfully to ${orderData.email}`))
            .catch(err => console.error(`[EMAIL] Delivery notification FAILED for ${orderData.email}:`, err));
        }, 10000); // 10 seconds
      }
    } else {
      console.warn("Order placed without email, skipping confirmation email.");
    }

    res.json({ success: true, data: [savedOrder] });
  });

  // Order Status Update Route (Mock for Admin/Farmer)
  app.post("/api/orders/status", async (req, res) => {
    const { orderId, email, status, trackingNumber, customerName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      let subject = "";
      let message = "";

      if (status === 'Shipped') {
        subject = `Your Harvest is on the way! 🚚 #${orderId.substring(0, 8)}`;
        message = `Good news! Your order #${orderId} has been shipped. You can track it using the information below:
          <br><br><strong>Tracking Number:</strong> ${trackingNumber || 'TRK' + Math.floor(Math.random() * 1000000)}`;
      } else if (status === 'Delivered') {
        subject = `Delivered! 📦 Enjoy your fresh harvest #${orderId.substring(0, 8)}`;
        message = `Your order #${orderId} has been delivered. We hope you enjoy the fresh produce! Don't forget to leave a review for the farmer.`;
      }

      await sendEmail(email, subject, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Order Update</h2>
          <p>Hi ${customerName || 'there'},</p>
          <p>${message}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #5A5A40;">Status: ${status}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `);

      res.json({ success: true, message: `Status email sent: ${status}` });
    } catch (error) {
      console.error("Failed to send status email:", error);
      res.status(500).json({ error: "Failed to send status email" });
    }
  });

  // Order Pickup Route
  app.post("/api/orders/pickup", async (req, res) => {
    const { orderId, email, customerName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      await sendEmail(email, `Order Picked Up! 🧺 #${orderId.substring(0, 8)}`, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Order Picked Up</h2>
          <p>Hi ${customerName || 'Customer'},</p>
          <p>Your order #${orderId} has been successfully picked up from the farm.</p>
          <p>Thank you for supporting local farmers! We hope you enjoy your fresh harvest.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send pickup email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Products API Routes
  app.get("/api/products", async (req, res) => {
    try {
      const supabaseProducts = await (async () => {
        try {
          const supabase = getSupabase();
          // Fetch products and their reviews
          const { data: productsData, error: prodError } = await supabase
            .from('products')
            .select('*');
          
          if (prodError) throw prodError;

          const { data: reviewsData, error: revError } = await supabase
            .from('reviews')
            .select('*');
          
          if (productsData && productsData.length > 0) {
            return productsData.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              unit: p.unit,
              category: p.category,
              image: p.image,
              farmerName: p.farmer_name || p.farmerName,
              farmerPhoto: p.farmer_photo || p.farmerPhoto,
              farmerMobile: p.farmer_mobile || p.farmerMobile,
              farmLocation: p.farm_location || p.farmLocation,
              description: p.description,
              stock: p.stock,
              rating: p.rating,
              coordinates: p.lat ? { lat: parseFloat(p.lat), lng: parseFloat(p.lng) } : p.coordinates,
              reviews: (reviewsData || []).filter((r: any) => r.product_id === p.id).map((r: any) => ({
                id: r.id,
                userName: r.user_name,
                rating: r.rating,
                comment: r.comment,
                date: r.date,
                imageUrl: r.image_url
              }))
            }));
          }
        } catch (e: any) {
          if (e.message?.includes("Supabase configuration missing")) {
            console.log("Supabase not configured, showing local products.");
          } else {
            console.error("Supabase products fetch failed:", e.message || e);
          }
        }
        return null;
      })();

      if (supabaseProducts) {
        return res.json({ success: true, products: supabaseProducts });
      }
      
      // Fallback to SQLite products
      const sqliteProducts = db.prepare("SELECT * FROM products").all() as any[];
      const formattedProducts = sqliteProducts.map(p => ({
        ...p,
        coordinates: { lat: p.lat, lng: p.lng },
        reviews: JSON.parse(p.reviews_json || '[]')
      }));

      res.json({ success: true, products: formattedProducts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    const productData = req.body;
    try {
      const supabaseResult = await (async () => {
        try {
          const supabase = getSupabase();
          // Map to snake_case for Supabase
          const supabaseData = {
            id: productData.id,
            name: productData.name,
            price: productData.price,
            unit: productData.unit,
            category: productData.category,
            image: productData.image,
            farmer_name: productData.farmerName,
            farmer_photo: productData.farmerPhoto,
            farmer_mobile: productData.farmerMobile,
            farm_location: productData.farmLocation,
            description: productData.description,
            stock: productData.stock,
            rating: productData.rating,
            lat: productData.coordinates?.lat,
            lng: productData.coordinates?.lng
          };
          
          const { data, error } = await supabase
            .from('products')
            .upsert([supabaseData])
            .select();

          if (error) throw error;
          
          // Map back to camelCase for the response
          const p = data[0];
          return {
            ...p,
            farmerName: p.farmer_name,
            farmerPhoto: p.farmer_photo,
            farmerMobile: p.farmer_mobile,
            farmLocation: p.farm_location,
            coordinates: p.lat ? { lat: p.lat, lng: p.lng } : null
          };
        } catch (e: any) {
          console.warn("Supabase product save failed, falling back to SQLite:", e.message || e);
          return null;
        }
      })();

      if (supabaseResult) {
        return res.json({ success: true, product: supabaseResult });
      }

      // Fallback to SQLite
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO products (id, name, price, unit, category, image, farmerName, farmerPhoto, farmerMobile, farmLocation, description, stock, lat, lng, rating, reviews_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const p = productData;
      insertStmt.run(
        p.id, 
        p.name, 
        p.price, 
        p.unit, 
        p.category, 
        p.image, 
        p.farmerName, 
        p.farmerPhoto || null, 
        p.farmerMobile || null, 
        p.farmLocation || 'Local Farm', 
        p.description || '', 
        p.stock || 0, 
        p.coordinates?.lat || 20.5937, 
        p.coordinates?.lng || 78.9629, 
        p.rating || 5.0, 
        JSON.stringify(p.reviews || [])
      );

      res.json({ success: true, product: p });
    } catch (error: any) {
      console.error("Failed to save product:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    const { productId, review } = req.body;
    try {
      const supabaseResult = await (async () => {
        try {
          const supabase = getSupabase();
          const reviewData = {
            id: review.id,
            product_id: productId,
            user_name: review.userName,
            rating: review.rating,
            comment: review.comment,
            image_url: review.imageUrl,
            date: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('reviews')
            .insert([reviewData])
            .select();

          if (error) throw error;
          return data[0];
        } catch (e: any) {
          console.warn("Supabase review save failed, falling back to SQLite:", e.message || e);
          return null;
        }
      })();

      if (supabaseResult) {
        return res.json({ success: true, review: supabaseResult });
      }

      // Fallback to SQLite
      const product = db.prepare("SELECT reviews_json, rating FROM products WHERE id = ?").get(productId) as any;
      if (product) {
        const reviews = JSON.parse(product.reviews_json || '[]');
        reviews.push({
          id: review.id,
          userName: review.userName,
          rating: review.rating,
          comment: review.comment,
          imageUrl: review.imageUrl,
          date: new Date().toISOString()
        });

        // Recalculate rating
        const newRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length;

        db.prepare("UPDATE products SET reviews_json = ?, rating = ? WHERE id = ?")
          .run(JSON.stringify(reviews), newRating, productId);
        
        res.json({ success: true, review: { ...review, date: new Date().toISOString() } });
      } else {
        res.status(404).json({ error: "Product not found" });
      }
    } catch (error: any) {
      console.error("Failed to save review:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/favorites", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('favorite_farmers')
        .select('farmer_name')
        .eq('user_email', email);
      
      if (error) throw error;
      res.json({ success: true, favorites: data.map((f: any) => f.farmer_name) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders/status", async (req, res) => {
    const { orderId, status } = req.body;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) {
        // Fallback to SQLite
        const stmt = db.prepare("UPDATE orders SET status = ? WHERE id = ?");
        stmt.run(status, orderId);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    const { email, farmerName, farmerMobile, farmLocation } = req.body;
    try {
      const savedToSupabase = await (async () => {
        try {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('favorite_farmers')
            .upsert([{ 
              user_email: email, 
              farmer_name: farmerName,
              farmer_mobile: farmerMobile || '',
              farm_location: farmLocation || ''
            }]);
          
          if (error) throw error;
          return true;
        } catch (e) {
          return false;
        }
      })();

      // Local fallback
      db.prepare(`
        INSERT OR REPLACE INTO favorites (email, farmerName, farmerMobile, farmLocation)
        VALUES (?, ?, ?, ?)
      `).run(email, farmerName, farmerMobile || '', farmLocation || '');
      
      res.json({ success: true, savedToSupabase });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/favorites", async (req, res) => {
    const { email, farmerName } = req.body;
    try {
      await (async () => {
        try {
          const supabase = getSupabase();
          await supabase
            .from('favorite_farmers')
            .delete()
            .eq('user_email', email)
            .eq('farmer_name', farmerName);
        } catch (e) {}
      })();

      // Always delete locally too
      db.prepare("DELETE FROM favorites WHERE email = ? AND farmerName = ?").run(email, farmerName);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
