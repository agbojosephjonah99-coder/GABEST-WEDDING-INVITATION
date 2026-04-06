# Wedding RSVP System

A production-ready Wedding RSVP system using Node.js, Express, Airtable, and Canvas for invitation card generation.

## Features

- Secure RSVP validation using Airtable
- Unique code and seat assignment
- Downloadable invitation cards with QR codes
- Simple frontend interface

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Airtable account with API access

### 1. Clone or Download the Project

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Set up Airtable

1. Create a new base in Airtable
2. Create a table named "Guests" with the following fields (exact names):
   - Name (Single Line Text)
   - Phone Number (Single Line Text, unique)
   - Wedding Seat Number (Number)
   - Unique Code (Single Line Text)
   - RSVP (Single Line Text or Checkbox)
   - CardURL (URL)

3. Add your guest data to the table

4. Get your API key and Base ID from Airtable account settings

### 4. Configure Environment Variables

For local development, use the `.env` file under `backend/` with your Airtable credentials.

For Vercel deployment, set these environment variables at the project level:
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME` (optional, defaults to `Guests`)

### 5. Run Locally

Backend:
```bash
cd backend
npm install
npm start
```

Frontend:
```bash
cd frontend
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

### 6. Install root dependencies for Vercel

From the repository root:
```bash
npm install
```

### 7. Deploy to Vercel

Deploy the repository root to Vercel. The frontend is served from `frontend/` and the RSVP API is available at `/api/rsvp`.

If you want to test locally with Vercel CLI, install it and run:
```bash
npm run dev
```

This requires Vercel CLI authentication. If you are not logged in yet, run:
```bash
npx vercel login
```

## API Endpoints

### POST /rsvp

Request body:
```json
{
  "phone": "1234567890",
  "name": "John Doe"
}
```

Responses:
- 200: Success with invitation details
- 403: Not invited
- 409: Already RSVP'd
- 400: Bad request
- 500: Server error

## Folder Structure

```
/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── cards/ (generated invitation cards)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.example
└── README.md
```

## Security Notes

- Airtable API key is only used server-side
- All validation happens on the backend
- Invitation cards are generated and stored securely

## Current Status

✅ Backend running on port 3000
✅ Frontend served on port 8080
✅ Airtable integration configured
✅ Canvas dependencies installed
✅ Invitation card generation with QR codes working