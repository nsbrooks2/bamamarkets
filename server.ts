import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

dotenv.config();

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stripeClient: Stripe | null = null;

function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.");
      // Return a dummy object that throws on use to prevent crash on startup
      return {
        webhooks: { constructEvent: () => { throw new Error("Stripe not configured") } },
        checkout: { sessions: { create: () => { throw new Error("Stripe not configured") } } }
      } as unknown as Stripe;
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const UA_UNIVERSITY_ID = '00000000-0000-0000-0000-000000000001';

// Validation Schemas
const ListingSchema = z.object({
  title: z.string().min(3).max(100).trim(),
  price: z.number().min(0).max(1000000),
  category: z.enum(['Gameday', 'Furniture', 'Electronics', 'Textbooks', 'Dorm Items', 'Clothes', 'Shoes', 'Tickets', 'Free Stuff', 'Services', 'Other']),
  size: z.string().max(50).nullable().optional(),
  description: z.string().min(10).max(2000).trim(),
  imageUrl: z.string().url(),
  images: z.array(z.string().url()).optional(),
  locationName: z.string().min(2).max(100).trim(),
  userId: z.string().uuid()
});

const MessageSchema = z.object({
  listingId: z.string().uuid(),
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  message: z.string().min(1).max(1000).trim()
});

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased for debugging
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: { error: "Too many login attempts, please try again later." },
  validate: { trustProxy: false },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: { error: "Upload limit exceeded, please try again later." },
  validate: { trustProxy: false },
});

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting behind Cloud Run/Nginx
  app.set('trust proxy', 1);

  // Global Middleware
  app.use(express.json());
  app.use("/api", apiLimiter);

  // Global APP_URL cleanup to prevent double slashes
  const rawAppUrl = process.env.APP_URL || "";
  const appUrl = rawAppUrl.endsWith('/') ? rawAppUrl.slice(0, -1) : rawAppUrl;
  
  // Try to get Shared App URL if available
  const sharedAppUrl = (process.env.SHARED_APP_URL || "").endsWith('/') 
    ? (process.env.SHARED_APP_URL || "").slice(0, -1) 
    : (process.env.SHARED_APP_URL || "");

  // Stripe Webhook (needs raw body)
  // Handle multiple variations to avoid 302 redirects from proxies/middleware
  app.get(["/api/webhooks/stripe", "/api/webhooks/stripe/"], (req, res) => {
    res.send("Stripe Webhook endpoint is active. Please use POST for actual webhook events.");
  });

  app.post(["/api/webhooks/stripe", "/api/webhooks/stripe/"], express.raw({ type: "*/*" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripe = getStripe();
    let event;

    console.log(`[STRIPE] Webhook request received. Path: ${req.path}, Signature: ${sig ? 'Present' : 'Missing'}, Body Length: ${req.body?.length || 0}`);

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[SECURITY] STRIPE_WEBHOOK_SECRET is not set in environment variables.");
      return res.status(500).send("Webhook Secret not configured");
    }

    try {
      const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        secret
      );
      console.log(`[STRIPE] Webhook verified successfully: ${event.type}`);
    } catch (err: any) {
      console.error(`[SECURITY] Webhook Verification Failed: ${err.message}`);
      console.log(`[DEBUG] Secret length: ${process.env.STRIPE_WEBHOOK_SECRET?.length || 0}`);
      console.log(`[DEBUG] Body type: ${typeof req.body}, Is Buffer: ${Buffer.isBuffer(req.body)}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await processCompletedSession(session);
    }

    res.json({ received: true });
  });

  // Helper to process a completed session (used by webhook and manual sync)
  async function processCompletedSession(session: Stripe.Checkout.Session) {
    const metadata = session.metadata;
    if (!metadata) {
      console.error("[PAYMENT] No metadata found in checkout session");
      return;
    }

    const { listingId, university_id, amount, type, userId } = metadata;
    console.log(`[PAYMENT] Processing session for ${type} - Listing: ${listingId}`);

    if (type === "boost_listing") {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      console.log(`[PAYMENT] Boosting listing ${listingId} until ${expiresAt.toISOString()}`);

      // Update listing boost
      const { error: updateError } = await supabase.from("listings").update({
        boosted: true,
        boost_expires_at: expiresAt.toISOString()
      }).eq("id", listingId);

      if (updateError) {
        console.error(`[PAYMENT] Error updating listing boost: ${updateError.message}`);
        return;
      }

      // Record boost payment
      const { error: insertError } = await supabase.from("boost_payments").insert({
        listing_id: listingId,
        seller_id: userId,
        university_id: university_id || UA_UNIVERSITY_ID,
        amount: 1.00,
        stripe_payment_intent_id: session.payment_intent as string
      });

      if (insertError) {
        console.error(`[PAYMENT] Error recording boost payment: ${insertError.message}`);
      } else {
        console.log(`[PAYMENT] Successfully boosted listing ${listingId}`);
      }
    } else if (type === "feature_listing") {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      console.log(`[PAYMENT] Featuring listing ${listingId} until ${expiresAt.toISOString()}`);

      // Update listing feature
      const { error: updateError } = await supabase.from("listings").update({
        featured: true,
        featured_expires_at: expiresAt.toISOString()
      }).eq("id", listingId);

      if (updateError) {
        console.error(`[PAYMENT] Error updating listing feature: ${updateError.message}`);
        return;
      }

      // Record feature payment
      const { error: insertError } = await supabase.from("featured_payments").insert({
        listing_id: listingId,
        seller_id: userId,
        university_id: university_id || UA_UNIVERSITY_ID,
        amount: 5.00,
        stripe_payment_intent_id: session.payment_intent as string
      });

      if (insertError) {
        console.error(`[PAYMENT] Error recording feature payment: ${insertError.message}`);
      } else {
        console.log(`[PAYMENT] Successfully featured listing ${listingId}`);
      }
    }
  }

  // Manual Payment Sync (Fallback for when webhooks are blocked by proxy)
  app.post("/api/payments/sync", async (req, res) => {
    const stripe = getStripe();
    try {
      console.log("[PAYMENT] Starting manual payment sync...");
      const sessions = await stripe.checkout.sessions.list({
        limit: 20,
        status: 'complete'
      });

      let syncedCount = 0;
      for (const session of sessions.data) {
        if (session.payment_status === 'paid' && session.metadata?.listingId) {
          const paymentIntentId = session.payment_intent as string;
          const type = session.metadata?.type;
          
          let alreadyProcessed = false;

          if (type === "boost_listing") {
            const { data: existing } = await supabase
              .from("boost_payments")
              .select("id")
              .eq("stripe_payment_intent_id", paymentIntentId)
              .maybeSingle();
            alreadyProcessed = !!existing;
          } else if (type === "feature_listing") {
            const { data: existing } = await supabase
              .from("featured_payments")
              .select("id")
              .eq("stripe_payment_intent_id", paymentIntentId)
              .maybeSingle();
            alreadyProcessed = !!existing;
          }

          if (!alreadyProcessed) {
            console.log(`[PAYMENT] Syncing missing ${type} for session: ${session.id}`);
            await processCompletedSession(session);
            syncedCount++;
          }
        }
      }

      res.json({ success: true, syncedCount });
    } catch (err: any) {
      console.error(`[PAYMENT] Sync failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.use(express.json());
  app.use("/api/", apiLimiter);

  // API Routes
  app.get("/api/health", async (req, res) => {
    // Check if tables exist
    const { error: boostTableError } = await supabase.from('boost_payments').select('id').limit(1);
    const { error: featureTableError } = await supabase.from('featured_payments').select('id').limit(1);
    const { error: favoritesTableError } = await supabase.from('favorites').select('id').limit(1);
    const { error: profilesTableError } = await supabase.from('profiles').select('id').limit(1);

    res.json({ 
      status: "ok",
      config: {
        hasAppUrl: !!appUrl,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        appUrl: appUrl ? `${appUrl.slice(0, 15)}...` : null,
        webhookUrl: appUrl ? `${appUrl}/api/webhooks/stripe` : "APP_URL not set",
        sharedWebhookUrl: sharedAppUrl ? `${sharedAppUrl}/api/webhooks/stripe` : null,
        tablesExist: !boostTableError && !featureTableError && !favoritesTableError && !profilesTableError,
        errors: {
          boostTable: boostTableError?.message,
          featureTable: featureTableError?.message,
          favoritesTable: favoritesTableError?.message,
          profilesTable: profilesTableError?.message
        }
      }
    });
  });

  // Proxy Auth Routes for Rate Limiting
  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { email, password, data } = req.body;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data }
      });
      if (signUpError) throw signUpError;
      
      if (signUpData.session) {
        res.json(signUpData);
      } else {
        // Attempt sign in immediately
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          res.json(signUpData); // Fallback to returning the signup data (likely needs confirmation)
        } else {
          res.json(signInData);
        }
      }
    } catch (err: any) {
      console.error(`[SECURITY] Signup failed for ${email}: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      res.json(authData);
    } catch (err: any) {
      console.error(`[SECURITY] Login failed for ${email}: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  // Secure Image Upload
  app.post("/api/upload", uploadLimiter, upload.single("image"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userId = req.body.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("listing-images")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      res.json({ url: publicUrl });
    } catch (err: any) {
      console.error(`[SECURITY] Upload failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Listing Creation with Usage Guards
  app.post("/api/listings/create", async (req, res) => {
    try {
      // 1. Validate Input
      const validatedData = ListingSchema.parse(req.body);
      const { title, price, category, size, description, imageUrl, images, locationName, userId } = validatedData;

      // 2. Sanitize Description (XSS Protection)
      const cleanDescription = DOMPurify.sanitize(description);

      // 3. Usage Guard: Limit listings per user per day (max 10)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error: countError } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)
        .gte("created_at", today.toISOString());

      if (countError) throw countError;
      if (count !== null && count >= 10) {
        console.warn(`[USAGE] User ${userId} exceeded daily listing limit`);
        return res.status(429).json({ error: "Daily listing limit (10) exceeded." });
      }

      const listingData: any = {
        title,
        price,
        category,
        size: size || null,
        description: cleanDescription,
        image_url: imageUrl,
        images: images || [imageUrl],
        location_name: locationName,
        seller_id: userId,
        university_id: UA_UNIVERSITY_ID
      };

      let { data, error } = await supabase
        .from("listings")
        .insert(listingData)
        .select()
        .single();

      // Fallback if 'size' column doesn't exist in DB yet
      if (error && (error.message.includes('size') || error.code === 'PGRST204')) {
        console.warn('Database missing "size" column, falling back to description append');
        const fallbackData = { ...listingData };
        delete fallbackData.size;
        if (size) {
          fallbackData.description = `${cleanDescription}\n\nSize: ${size}`;
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from("listings")
          .insert(fallbackData)
          .select()
          .single();
        
        data = retryData;
        error = retryError;
      }

      if (error) throw error;
      
      console.log(`[LISTING] User ${userId} created listing: ${title}`);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Listing Update
  app.post("/api/listings/update", async (req, res) => {
    try {
      // 1. Validate Input
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Listing ID is required" });
      
      const validatedData = ListingSchema.parse(req.body);
      const { title, price, category, size, description, imageUrl, images, locationName, userId } = validatedData;

      // 2. Sanitize Description
      const cleanDescription = DOMPurify.sanitize(description);

      // 3. Check ownership and get old price
      const { data: existing, error: checkError } = await supabase
        .from("listings")
        .select("seller_id, price, title")
        .eq("id", id)
        .single();

      if (checkError || !existing) throw new Error("Listing not found");
      if (existing.seller_id !== userId) return res.status(403).json({ error: "Forbidden" });

      const oldPrice = parseFloat(existing.price as any);
      const newPrice = price;

      const updateData: any = {
        title,
        price: newPrice,
        category,
        size: size || null,
        description: cleanDescription,
        image_url: imageUrl || undefined,
        images: images || undefined,
        location_name: locationName
      };

      let { data, error } = await supabase
        .from("listings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      // Fallback if 'size' column doesn't exist in DB yet
      if (error && (error.message.includes('size') || error.code === 'PGRST204')) {
        console.warn('Database missing "size" column, falling back to description append');
        const fallbackData = { ...updateData };
        delete fallbackData.size;
        if (size) {
          fallbackData.description = `${cleanDescription}\n\nSize: ${size}`;
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from("listings")
          .update(fallbackData)
          .eq("id", id)
          .select()
          .single();
        
        data = retryData;
        error = retryError;
      }

      if (error) throw error;

      // Price Drop Notification
      if (newPrice < oldPrice) {
        console.log(`[NOTIFICATION] Price drop detected for ${id}: ${oldPrice} -> ${newPrice}`);
        
        // Get all users who favorited this listing
        const { data: favorites } = await supabase
          .from("favorites")
          .select("user_id")
          .eq("listing_id", id);

        if (favorites && favorites.length > 0) {
          const notifications = favorites.map(f => ({
            user_id: f.user_id,
            type: 'price_drop',
            content: `Price drop! "${existing.title}" is now $${newPrice} (was $${oldPrice})`,
            link: `/listing/${id}`,
            read: false
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
      
      console.log(`[LISTING] User ${userId} updated listing: ${id}`);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Listing Deletion
  app.post("/api/listings/delete", async (req, res) => {
    const { id, userId } = req.body;
    console.log(`[DELETE DEBUG] Attempting to delete listing ${id} for user ${userId}`);

    if (!userId) return res.status(401).json({ error: "Unauthorized: No User ID provided" });

    try {
      // 1. Check if it exists and who owns it
      const { data: existing, error: checkError } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", id)
        .single();

      if (checkError) {
        console.error(`[DELETE DEBUG] Check Error:`, checkError);
        return res.status(404).json({ error: `Listing not found or DB error: ${checkError.message}` });
      }

      if (!existing) {
        return res.status(404).json({ error: "Listing not found in database" });
      }

      console.log(`[DELETE DEBUG] Listing owner is ${existing.seller_id}, requester is ${userId}`);

      if (existing.seller_id !== userId) {
        return res.status(403).json({ error: `Forbidden: You do not own this listing. Owner: ${existing.seller_id}, You: ${userId}` });
      }

      // 2. Perform the delete
      const { error: deleteError, count } = await supabase
        .from("listings")
        .delete({ count: 'exact' })
        .eq("id", id);

      if (deleteError) {
        console.error(`[DELETE DEBUG] Delete Error:`, deleteError);
        return res.status(500).json({ error: `Database failed to delete: ${deleteError.message} (Code: ${deleteError.code})` });
      }
      
      console.log(`[DELETE DEBUG] Successfully deleted ${count} rows`);
      res.json({ success: true, count });
    } catch (err: any) {
      console.error(`[DELETE DEBUG] System Crash:`, err);
      res.status(500).json({ error: `Server Error: ${err.message}` });
    }
  });

  // Secure Message Sending with Usage Guards
  app.post("/api/messages/send", async (req, res) => {
    try {
      // 1. Validate Input
      const validatedData = MessageSchema.parse(req.body);
      const { listingId, senderId, receiverId, message } = validatedData;

      // 2. Sanitize Message
      const cleanMessage = DOMPurify.sanitize(message);

      // 3. Usage Guard: Limit messages per minute (max 10)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", senderId)
        .gte("created_at", oneMinuteAgo.toISOString());

      if (countError) throw countError;
      if (count !== null && count >= 10) {
        console.warn(`[USAGE] User ${senderId} exceeded message rate limit`);
        return res.status(429).json({ error: "Message rate limit exceeded. Please wait a minute." });
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          listing_id: listingId,
          sender_id: senderId,
          receiver_id: receiverId,
          message: cleanMessage
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger Notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", senderId)
        .single();

      await supabase.from("notifications").insert({
        user_id: receiverId,
        type: 'message',
        content: `${senderProfile?.full_name || 'Someone'} sent you a message about your listing.`,
        link: `/messages`,
        read: false
      });

      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: err.issues });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Favorite Toggle with Notification
  app.post("/api/favorites/toggle", async (req, res) => {
    const { listingId, userId } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Ensure profile exists (fallback for users created before trigger)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (!profile) {
        console.log(`[FAVORITE] Auto-creating missing profile for user ${userId}`);
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData.user) {
          await supabase.from("profiles").insert({
            id: userId,
            email: userData.user.email,
            full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0]
          });
        }
      }

      const { data: existing, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("listing_id", listingId);
        res.json({ favorite: false });
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: userId, listing_id: listingId });

        // Get listing to notify seller
        const { data: listing } = await supabase
          .from("listings")
          .select("seller_id, title")
          .eq("id", listingId)
          .single();

        if (listing && listing.seller_id !== userId) {
          await supabase.from("notifications").insert({
            user_id: listing.seller_id,
            type: 'favorite',
            content: `Someone favorited your listing: ${listing.title}`,
            link: `/listing/${listingId}`,
            read: false
          });
        }
        res.json({ favorite: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update User Profile
  app.post("/api/profile/update", async (req, res) => {
    const { 
      userId, locationName, name, username, bio, avatarUrl, bannerUrl,
      venmo_username, paypal_username, zelle_email, cashapp_username, applepay_contact, accepts_cash
    } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          location: locationName,
          full_name: name,
          username: username,
          bio: bio,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          venmo_username,
          paypal_username,
          zelle_email,
          cashapp_username,
          applepay_contact,
          accepts_cash
        })
        .eq("id", userId)
        .select()
        .single();
  
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Follow/Unfollow Toggle
  app.post("/api/profile/follow/toggle", async (req, res) => {
    const { followerId, followingId } = req.body;
    if (!followerId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { data: existing } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .single();

      if (existing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", followerId)
          .eq("following_id", followingId);
        res.json({ following: false });
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: followerId, following_id: followingId });
        
        // Notify the user being followed
        await supabase.from("notifications").insert({
          user_id: followingId,
          type: 'system',
          content: `Someone started following you!`,
          link: `/profile/${followerId}`,
          read: false
        });

        res.json({ following: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Checkout Session for Boosting
  app.post("/api/payments/create-boost-checkout", async (req, res) => {
    const { listingId, userId } = req.body;
    const stripe = getStripe();

    if (!appUrl) {
      console.error("[PAYMENT] APP_URL environment variable is not set");
      return res.status(500).json({ error: "Server configuration error: APP_URL is missing. Please set it in the environment variables." });
    }

    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error || !listing) throw new Error("Listing not found");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Listing Boost (24 Hours)",
                description: "Move your listing higher in the feed.",
              },
              unit_amount: 100, // $1.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/my-listings?success=boost`,
        cancel_url: `${appUrl}/my-listings`,
        metadata: {
          type: "boost_listing",
          listingId,
          userId,
          university_id: listing.university_id || UA_UNIVERSITY_ID,
          amount: "1.00"
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error(`[PAYMENT] Boost checkout failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Checkout Session for Featuring
  app.post("/api/payments/create-feature-checkout", async (req, res) => {
    const { listingId, userId } = req.body;
    const stripe = getStripe();

    if (!appUrl) {
      console.error("[PAYMENT] APP_URL environment variable is not set");
      return res.status(500).json({ error: "Server configuration error: APP_URL is missing. Please set it in the environment variables." });
    }

    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error || !listing) throw new Error("Listing not found");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Featured Listing (24 Hours)",
                description: "Place your listing in the Featured section at the top.",
              },
              unit_amount: 500, // $5.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/my-listings?success=feature`,
        cancel_url: `${appUrl}/my-listings`,
        metadata: {
          type: "feature_listing",
          listingId,
          userId,
          university_id: listing.university_id || UA_UNIVERSITY_ID,
          amount: "5.00"
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error(`[PAYMENT] Feature checkout failed: ${err.message}`);
      res.status(500).json({ error: err.message });
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
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
