require('dotenv').config();

const express = require('express');
const Airtable = require('airtable');
const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files for cards
app.use('/cards', express.static(path.join(__dirname, 'cards')));

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME || 'Guests';

// Ensure cards directory exists
const cardsDir = path.join(__dirname, 'cards');
if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir);
}

// Generate unique code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WED-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate invitation card
async function generateCard(name, code, seatNumber) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background (simple gradient)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8f9fa');
  gradient.addColorStop(1, '#e9ecef');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#6c757d';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Title
  ctx.fillStyle = '#495057';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Wedding Invitation', width / 2, 80);

  // Guest Name
  ctx.font = 'bold 28px Arial';
  ctx.fillText(`Guest: ${name}`, width / 2, 150);

  // Code
  ctx.font = '24px Arial';
  ctx.fillText(`Code: ${code}`, width / 2, 200);

  // Seat Number
  ctx.fillText(`Seat: ${seatNumber}`, width / 2, 250);

  // QR Code
  const qrData = code; // or phone, but code is unique
  const qrCanvas = createCanvas(150, 150);
  await QRCode.toCanvas(qrCanvas, qrData, { width: 150 });
  ctx.drawImage(qrCanvas, width - 200, height - 200, 150, 150);

  // Footer
  ctx.font = '18px Arial';
  ctx.fillText('Please bring this card to the event', width / 2, height - 50);

  return canvas;
}

// POST /rsvp
app.post('/rsvp', async (req, res) => {
  const { phone, name } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ error: 'Phone and name are required' });
  }

  try {
    // Check if phone exists in Airtable
    const records = await base(tableName).select({
      filterByFormula: `{Phone Number} = '${phone}'`
    }).firstPage();

    if (records.length === 0) {
      return res.status(403).json({ error: 'You are not invited' });
    }

    const record = records[0];
    const fields = record.fields;

    // Check if already RSVP'd (has code)
    if (fields['Unique Code']) {
      return res.status(409).json({ error: 'Already RSVP\'d', code: fields['Unique Code'], seatNumber: fields['Wedding Seat Number'], cardUrl: fields.CardURL });
    }

    // Generate code
    const code = generateCode();

    // Assign seat if not assigned
    let seatNumber = fields['Wedding Seat Number'];
    if (!seatNumber) {
      // Find max seat number
      const allRecords = await base(tableName).select().firstPage();
      const maxSeat = Math.max(...allRecords.map(r => r.fields['Wedding Seat Number'] || 0));
      seatNumber = maxSeat + 1;
    }

    // Generate card
    const canvas = await generateCard(name, code, seatNumber);
    const fileName = `${code}.png`;
    const filePath = path.join(cardsDir, fileName);
    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    const cardUrl = `http://localhost:${process.env.PORT || 3000}/cards/${fileName}`;

    // Update Airtable
    await base(tableName).update(record.id, {
      'Unique Code': code,
      'Wedding Seat Number': seatNumber,
      RSVP: 'Yes', // or true
      CardURL: cardUrl
    });

    res.json({
      name,
      code,
      seatNumber,
      cardUrl
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});