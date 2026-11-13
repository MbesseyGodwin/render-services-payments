# Render Services Payments — Final Year Project

A Next.js (App Router, TypeScript) payment portal designed as a 1:1 replica of the Render Services invoice and Stripe checkout experience, integrated with Paystack for live NGN currency checkout.

## Overview

- **3 Service Receipts (Invoices)**:
  1. `Render Backend Server (Pro Max, 16GB/4CPU)` — **$4,200.00** (`/receipts/backend` and `/`)
  2. `Render Frontend Server (Pro Plus, 8GB/4CPU)` — **$2,100.00** (`/receipts/frontend`)
  3. `Render PostgreSQL Primary (16GB/4CPU, pooled)` — **$4,200.00** (`/receipts/postgresql`)

- **Fixed Customer & Details**:
  - **To**: `nelson.attah@live.com`
  - **From**: `Render Services, Inc dba Render` (`@render`)
  - **Memo**: `Render Oct 1, 2026 - Sep 30, 2027`
  - **Invoice #**: Dynamically generated hexadecimal format (e.g. `#DD8452BB-0036`)

- **Currency Conversion**:
  - Fixed conversion: **1 USD = 1,346.84 NGN**
  - **$4,200.00 USD** = **₦5,656,728.00 NGN** (565,672,800 kobo)
  - **$2,100.00 USD** = **₦2,828,364.00 NGN** (282,836,400 kobo)

- **UI & Features**:
  - Pixel-perfect typography, colors, borders, and shadows matching the attached invoice references.
  - Smooth animated right sidebar / drawer for "View invoice and payment details".
  - Card input container matching Stripe Elements with card brand icons (Visa, Mastercard, Amex, Discover, CVC).
  - Printable invoice layout triggered by "Invoice PDF".
  - Paystack Checkout integration using `/api/paystack/initialize` and `/api/paystack/verify`.
  - Demo mode toggle for school presentation and evaluation.

## Configuration (.env.local)

```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
```

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the portal.
