import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const UA_UNIVERSITY_ID = '00000000-0000-0000-0000-000000000001';

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: { error: "Too many login attempts, please try again later." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: { error: "Upload limit exceeded, please try again later." },
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

  // Stripe Webhook (needs raw body)
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`[SECURITY] Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.type === "buy_listing") {
        const { listingId, buyerId, sellerId, price, university_id } = metadata;
        
        // Server-side validation of price and fee
        const expectedPrice = parseFloat(price);
        const platformFee = expectedPrice * 0.025;

        console.log(`[PAYMENT] Processing purchase for listing ${listingId} by user ${buyerId}`);

        // Record transaction
        await supabase.from("transactions").insert({
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          university_id: university_id || UA_UNIVERSITY_ID,
          sale_price: expectedPrice,
          platform_fee: platformFee,
          stripe_payment_intent_id: session.payment_intent as string
        });
      } else if (metadata?.type === "boost_listing") {
        const { listingId, university_id, amount } = metadata;
        
        // Validate boost amount
        if (parseFloat(amount) !== 2.00) {
          console.error(`[SECURITY] Invalid boost amount detected: ${amount}`);
          return res.status(400).json({ error: "Invalid boost amount" });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        console.log(`[PAYMENT] Processing boost for listing ${listingId}`);

        // Update listing boost
        await supabase.from("listings").update({
          boosted: true,
          boost_expires_at: expiresAt.toISOString()
        }).eq("id", listingId);

        // Record boost payment
        await supabase.from("boost_payments").insert({
          listing_id: listingId,
          seller_id: metadata.userId,
          university_id: university_id || UA_UNIVERSITY_ID,
          amount: 2.00,
          stripe_payment_intent_id: session.payment_intent as string
        });
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());
  app.use("/api/", apiLimiter);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy Auth Routes for Rate Limiting
  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { email, password, data } = req.body;
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data }
      });
      if (error) throw error;
      res.json(authData);
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
    const { title, price, category, description, imageUrl, images, lat, lng, userId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Usage Guard: Limit listings per user per day (max 10)
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

      // Validation
      if (parseFloat(price) < 0) return res.status(400).json({ error: "Invalid price" });

      const { data, error } = await supabase
        .from("listings")
        .insert({
          title,
          price: parseFloat(price),
          category,
          description,
          image_url: imageUrl,
          images: images || [imageUrl],
          lat: lat ? parseFloat(lat) : undefined,
          lng: lng ? parseFloat(lng) : undefined,
          seller_id: userId,
          university_id: UA_UNIVERSITY_ID
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log(`[LISTING] User ${userId} created listing: ${title}`);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Listing Update
  app.post("/api/listings/update", async (req, res) => {
    const { id, title, price, category, description, imageUrl, images, lat, lng, userId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", id)
        .single();

      if (checkError || !existing) throw new Error("Listing not found");
      if (existing.seller_id !== userId) return res.status(403).json({ error: "Forbidden" });

      // Validation
      if (parseFloat(price) < 0) return res.status(400).json({ error: "Invalid price" });

      const { data, error } = await supabase
        .from("listings")
        .update({
          title,
          price: parseFloat(price),
          category,
          description,
          image_url: imageUrl || undefined,
          images: images || undefined,
          lat: lat ? parseFloat(lat) : undefined,
          lng: lng ? parseFloat(lng) : undefined
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      console.log(`[LISTING] User ${userId} updated listing: ${id}`);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Listing Deletion
  app.post("/api/listings/delete", async (req, res) => {
    const { id, userId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("id", id)
        .single();

      if (checkError || !existing) throw new Error("Listing not found");
      if (existing.seller_id !== userId) return res.status(403).json({ error: "Forbidden" });

      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      console.log(`[LISTING] User ${userId} deleted listing: ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Message Sending with Usage Guards
  app.post("/api/messages/send", async (req, res) => {
    const { listingId, senderId, receiverId, message } = req.body;

    if (!senderId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Usage Guard: Limit messages per minute (max 10)
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
          message: message.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger Notification
      await supabase.from("notifications").insert({
        user_id: receiverId,
        type: 'message',
        content: `You received a new message about your listing.`,
        link: `/messages`,
        read: false
      });

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Favorite Toggle with Notification
  app.post("/api/favorites/toggle", async (req, res) => {
    const { listingId, userId } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { data: existing } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .single();

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

  // Create Checkout Session for Buying
  app.post("/api/payments/create-checkout", async (req, res) => {
    const { listingId, userId } = req.body;

    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error || !listing) throw new Error("Listing not found");

      // Server-side price validation
      const amount = Math.round(listing.price * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: listing.title,
                description: listing.description,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/messages`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/listing/${listingId}`,
        metadata: {
          type: "buy_listing",
          listingId,
          buyerId: userId,
          sellerId: listing.seller_id,
          university_id: listing.university_id || UA_UNIVERSITY_ID,
          price: listing.price.toString(),
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Checkout Session for Boosting
  app.post("/api/payments/create-boost-checkout", async (req, res) => {
    const { listingId, userId } = req.body;

    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error || !listing) throw new Error("Listing not found");

      // Usage Guard: Limit boost attempts per listing (max 5 per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error: boostCountError } = await supabase
        .from("boost_payments")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("created_at", today.toISOString());

      if (boostCountError) throw boostCountError;
      if (count !== null && count >= 5) {
        return res.status(429).json({ error: "Maximum boost attempts reached for today." });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Listing Boost (24 Hours)",
                description: "Move your listing to the top of the feed.",
              },
              unit_amount: 200, // $2.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/my-listings`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/my-listings`,
        metadata: {
          type: "boost_listing",
          listingId,
          userId,
          university_id: listing.university_id || UA_UNIVERSITY_ID,
          amount: "2.00"
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
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
