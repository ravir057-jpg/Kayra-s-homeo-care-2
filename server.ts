import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    // Note: firebase-admin uses a different way to access specific databases than client SDK
    // In many cases we just use the default or initialize with databaseId if supported in current admin version
}

// Helper to get Razorpay instance for a specific doctor
async function getRazorpayInstance(doctorId?: string) {
  let keyId = process.env.RAZORPAY_KEY_ID || '';
  let keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (doctorId) {
    try {
      const docRef = db.collection('users').doc(doctorId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data?.razorpayKeyId && data?.razorpayKeySecret) {
          keyId = data.razorpayKeyId;
          keySecret = data.razorpayKeySecret;
        }
      }
    } catch (error) {
      console.error('Error fetching doctor keys:', error);
    }
  }

  if (!keyId || !keySecret) {
    return null;
  }

  return {
    instance: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret
  };
}

// Create Order API
app.get('/api/payment/key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, doctorId } = req.body;

    const rzpConfig = await getRazorpayInstance(doctorId);
    if (!rzpConfig) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency,
      receipt,
    };

    const order = await rzpConfig.instance.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Payment API
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, doctorId } = req.body;
    
    const rzpConfig = await getRazorpayInstance(doctorId);
    if (!rzpConfig) {
      return res.status(500).json({ error: 'Razorpay configuration missing for verification' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", rzpConfig.keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ status: 'failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
