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
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Helper Function
  const sendEmail = async (to: string, subject: string, html: string) => {
    const host = process.env.SMTP_HOST || "smtp.resend.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    // Force secure: true only for port 465, otherwise false (for STARTTLS on 587)
    const secure = port === 465;

    console.log(`Sending email to ${to} via ${host}:${port} (Secure: ${secure})`);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER || "resend",
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    return transporter.sendMail({
      from: `"Farm2Home" <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
      to,
      subject,
      html,
    });
  };

  // Auth API Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role, phone, address, farmName, location } = req.body;
    const id = Math.random().toString(36).substring(7);

    try {
      const stmt = db.prepare(`
        INSERT INTO users (id, email, password, name, role, phone, address, farmName, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, email, password, name, role, phone, address, farmName, location);
      
      const user = { id, email, name, role, phone, address, farmName, location };

      // Send Welcome/Verification Email
      sendEmail(email, "Welcome to Farm2Home! 🌿", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Welcome to Farm2Home, ${name}!</h2>
          <p>Thank you for joining our community of fresh produce lovers.</p>
          <p>Your account has been successfully created. You can now start shopping for fresh, local harvest directly from farmers.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Role:</strong> ${role === 'farmer' ? 'Farmer' : 'Consumer'}</p>
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
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const resetToken = Math.random().toString(36).substring(2, 15);
      
      await sendEmail(email, "Password Reset Verification 🔐", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #5A5A40;">${resetToken.toUpperCase()}</span>
          </div>
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

  // Email API Route
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Configure transporter
      // For production, use real SMTP settings in .env
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        pool: true,               // Use connection pooling
        maxConnections: 1,        // Limit connections
        connectionTimeout: 20000, // 20 seconds
        greetingTimeout: 20000,   // 20 seconds
        socketTimeout: 20000,     // 20 seconds
      });

      // Verify connection configuration
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials missing. Email will not be sent.");
        return res.status(200).json({ 
          success: true, 
          message: "Email simulated (SMTP credentials missing)",
          simulated: true 
        });
      }

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

    if (!orderData) {
      return res.status(400).json({ error: "Missing order data" });
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) {
        console.error(`Supabase Error Details: [${error.code}] ${error.message}. Hint: ${error.hint}. Details: ${error.details}`);
        return res.status(500).json({ 
          error: error.message || "Unknown Supabase error", 
          details: error.details, 
          hint: error.hint,
          code: error.code 
        });
      }

      // Send Order Confirmation Email
      sendEmail(orderData.email, `Order Confirmed! 🛒 #${data[0].id.toString().substring(0, 8)}`, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #5A5A40;">Order Confirmation</h2>
          <p>Hi ${orderData.first_name},</p>
          <p>Your order has been placed successfully and is being processed by our farmers.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> ${data[0].id}</p>
            <p style="margin: 5px 0 0 0;"><strong>Items:</strong> ${orderData.product_name}</p>
            <p style="margin: 5px 0 0 0;"><strong>Total:</strong> ₹${orderData.total_amount}</p>
          </div>
          <p>We'll notify you when your harvest is on its way!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
        </div>
      `).catch(err => console.error("Order confirmation email failed:", err));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error saving order to Supabase:", {
        message: error.message,
        stack: error.stack,
        error
      });
      res.status(500).json({ error: "Failed to save order" });
    }
  });

  // Order Status Update Route (Mock for Admin/Farmer)
  app.post("/api/orders/status", async (req, res) => {
    const { orderId, email, status, trackingNumber, customerName } = req.body;
    
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
