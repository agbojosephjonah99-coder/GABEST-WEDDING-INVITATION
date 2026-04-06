const Airtable = require('airtable');
const QRCode = require('qrcode');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME || 'Guests';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WED-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function generateCardSvg(name, code, seatNumber) {
  const qrSvg = await QRCode.toString(code, { type: 'svg', width: 150, margin: 1 });
  const innerQrSvg = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const safeSeat = escapeHtml(String(seatNumber));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8f9fa" />
      <stop offset="100%" stop-color="#e9ecef" />
    </linearGradient>
    <style>
      .title { font: bold 36px Arial, sans-serif; fill: #495057; }
      .label { font: bold 28px Arial, sans-serif; fill: #495057; }
      .text { font: 24px Arial, sans-serif; fill: #495057; }
      .footer { font: 18px Arial, sans-serif; fill: #495057; }
    </style>
  </defs>
  <rect x="0" y="0" width="800" height="600" fill="url(#bg)" />
  <rect x="20" y="20" width="760" height="560" rx="24" ry="24" fill="none" stroke="#6c757d" stroke-width="4" />
  <text x="400" y="80" text-anchor="middle" class="title">Wedding Invitation</text>
  <text x="400" y="150" text-anchor="middle" class="label">Guest: ${safeName}</text>
  <text x="400" y="210" text-anchor="middle" class="text">Code: ${safeCode}</text>
  <text x="400" y="260" text-anchor="middle" class="text">Seat: ${safeSeat}</text>
  <g transform="translate(620, 390)">
    <svg x="0" y="0" width="150" height="150" viewBox="0 0 150 150">
      ${innerQrSvg}
    </svg>
  </g>
  <text x="400" y="560" text-anchor="middle" class="footer">Please bring this card to the event</text>
</svg>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phone, name } = req.body || {};
  if (!phone || !name) {
    return res.status(400).json({ error: 'Phone and name are required' });
  }

  try {
    const safePhone = String(phone).replace(/'/g, "\\'");
    const records = await base(tableName).select({
      filterByFormula: `{Phone Number} = '${safePhone}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      return res.status(403).json({ error: 'You are not invited' });
    }

    const record = records[0];
    const fields = record.fields;
    const guestName = fields.Name || name;

    if (fields['Unique Code']) {
      const seatNumber = fields['Wedding Seat Number'] || 0;
      const cardSvg = await generateCardSvg(guestName, fields['Unique Code'], seatNumber);
      const cardDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(cardSvg).toString('base64');
      return res.status(409).json({
        error: 'Already RSVP\'d',
        name: guestName,
        code: fields['Unique Code'],
        seatNumber,
        cardDataUrl
      });
    }

    let seatNumber = fields['Wedding Seat Number'];
    if (!seatNumber) {
      const allRecords = await base(tableName).select({ fields: ['Wedding Seat Number'] }).firstPage();
      const maxSeat = allRecords.reduce((max, r) => {
        const candidate = Number(r.fields['Wedding Seat Number']);
        return Number.isFinite(candidate) ? Math.max(max, candidate) : max;
      }, 0);
      seatNumber = maxSeat + 1;
    }

    const code = generateCode();
    const cardSvg = await generateCardSvg(guestName, code, seatNumber);
    const cardDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(cardSvg).toString('base64');

    await base(tableName).update(record.id, {
      'Unique Code': code,
      'Wedding Seat Number': seatNumber,
      RSVP: 'Yes'
    });

    return res.json({
      name: guestName,
      code,
      seatNumber,
      cardDataUrl
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
