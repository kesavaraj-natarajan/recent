import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const db = new Database(process.env.DATABASE_PATH || "farm2home.db");

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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    otp TEXT,
    expiresAt DATETIME,
    type TEXT,
    data TEXT
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
    total_amount REAL,
    delivery_method TEXT,
    status TEXT DEFAULT 'Pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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
      console.log("--- SIMULATED EMAIL CONTENT ---");
      console.log(html.replace(/<[^>]*>?/gm, '')); // Strip HTML for console readability
      console.log("-------------------------------");
      return;
    }

    const host = process.env.SMTP_HOST || "smtp.resend.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    // Force secure: true only for port 465, otherwise false (for STARTTLS on 587)
    const secure = port === 465;

    console.log(`Sending email to ${to} via ${host}:${port} (Secure: ${secure})`);

    // Remove spaces from app passwords (e.g. Google App Passwords)
    const pass = process.env.SMTP_PASS.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: pass,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    try {
      const info = await transporter.sendMail({
        from: `"Farm2Home" <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
        to,
        subject,
        html,
      });
      console.log("Email sent successfully:", info.messageId);
      return info;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  };

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
      await sendEmail(email, "Your Farm2Home Verification Code 🌿", `
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

      res.json({ success: true, message: "OTP sent to email", requireOtp: true });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to process registration" });
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

      const stmt = db.prepare(`
        INSERT INTO users (id, email, password, name, role, phone, address, farmName, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, email, data.password, data.name, data.role, data.phone, data.address, data.farmName, data.location);
      
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

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
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

  app.post("/api/user/update", (req, res) => {
    const { email, name, phone, address, farmName, location } = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE users 
        SET name = ?, phone = ?, address = ?, farmName = ?, location = ?
        WHERE email = ?
      `);
      stmt.run(name, phone, address, farmName, location, email);
      
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
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

  // Supabase Orders API Route
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
          INSERT INTO orders (id, email, first_name, last_name, address, city, state, zip, product_name, total_amount, delivery_method)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          id, orderData.email, orderData.first_name, orderData.last_name, 
          orderData.street_address || orderData.address || '', 
          orderData.city || '', 
          orderData.state || '', 
          orderData.zip_code || orderData.zip || '', 
          orderData.product_name, orderData.total_amount, deliveryMethod
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
