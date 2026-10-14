# FoodLink 🍲🌱
### Reducing Food Waste in Communities • Practical Hackathon Prototype 2026

> **Problem Statement:**  
> Restaurants, grocery stores, bakeries, caterers, and households regularly discard safe, edible surplus food while nearby charities, shelters, and community members face food insecurity. These groups lack a fast, simple, hyper-local way to discover each other and coordinate pickups before safe food expires.

> **Solution: FoodLink**  
> **FoodLink** is a lightweight, responsive web platform that connects food donors with local charities and residents. Donors post surplus food in 60 seconds with quantities, handling notes, allergen information, and pickup deadlines. Recipients discover nearby listings on interactive maps and feeds, reserve batches, receive a verified digital Pickup Pass (PIN & QR), and coordinate swift, safe collections.

---

## 🌟 The Complete 5-Step User Journey

FoodLink demonstrates an end-to-end interactive journey from initial listing to verified community impact:

1. **Step 1: Donor Posts Surplus Food**  
   - Business or household specifies title, donor type (Restaurant, Bakery, Grocer, Cafe, Caterer, Household), food category, quantity, food weight (kg), calculated meal portions, dietary classifications, allergen disclosures, safe handling instructions, pickup address, and collection deadline.
   - Smart impact calculator automatically computes estimated meals and landfill diversion.

2. **Step 2: Recipient Finds and Reserves Food**  
   - Recipients discover nearby surplus food via **List View** or **Interactive Leaflet Map**.
   - Multi-criteria filtering by **distance** (`< 2 km`, `< 5 km`, `< 10 km`), **food category**, **dietary tags** (Vegetarian, Vegan, Halal, Gluten-Free), and **pickup urgency** (`< 2 hours`).
   - Detailed **Listing Details Modal** displays high-res imagery, donor address, allergen disclosures, storage/temperature requirements, and pickup window.
   - 1-click reservation locks the surplus food batch, preventing double-claims.
   - Generates a digital **Pickup Pass** with a unique **6-digit verification PIN**, **scannable QR code**, pickup directions, and Google Maps integration.

3. **Step 3: Donor Confirms Reservation**  
   - In the **Donor Portal**, donor receives an instant alert of the reservation.
   - Donor confirms items are packed and ready for pickup with one click (**Confirm Ready**).
   - Recipient sees live status update: `Donor Confirmed & Ready for Pickup`.

4. **Step 4: Recipient Collects Food (PIN Verified)**  
   - Volunteer or recipient arrives at donor location and presents their 6-digit PIN / QR pass.
   - Donor enters or validates the recipient PIN to verify identity and completes the handover.
   - Web Audio chime sound and celebratory confetti burst confirm handover success.

5. **Step 5: Platform Records and Visualizes Impact**  
   - Real-time impact engine increments meals saved, kg diverted from landfills, CO₂e greenhouse emissions eliminated, and water conserved.
   - Citywide analytics dashboard with Chart.js donut and bar charts, leaderboards, live rescue feed, and printable **Community Food Hero Award**.

---

## 🚀 How to Run FoodLink Locally

### Prerequisites
- Python 3.10+ (Python 3.12 verified)
- Flask (`pip install flask`)

### 1-Click Launch (Windows)
Double-click `run.bat` or run:
```cmd
run.bat
```

### Manual Command Line Launch
1. Open PowerShell / Command Prompt in the project folder:
   ```powershell
   cd c:\Users\SREENATH\OneDrive\Desktop\NIAT111
   ```
2. Initialize and seed realistic demo listings:
   ```powershell
   python database.py
   ```
3. Start the Flask application:
   ```powershell
   python app.py
   ```
4. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 🎤 Under 2-Minute Hackathon Demo Script for Judges

| Time | Journey Step | Screen / Action | What to Say |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:25** | **The Problem & Discovery** | Start on **Find Food** tab. Show filter chips, test search `"Bakery"`, and switch to **Map View**. | *"Globally, over 1 billion meals are wasted while local shelters struggle to source food. FoodLink closes the hyper-local last-mile gap. A volunteer opens FoodLink and instantly sees available surplus food with real-time distance, dietary tags, and urgent countdown timers."* |
| **0:25 - 0:45** | **Listing Details & Reserve** | Click **Details** on *"Fresh Artisan Bread & Croissant Assortment"*, then click **Reserve Surplus Food**. Submit volunteer form. | *"Clicking Details shows complete safe handling notes and allergen disclosures. Clicking Reserve immediately locks the batch. FoodLink generates an authenticated digital Pickup Pass with a 6-digit PIN, scannable QR code, and Google Maps navigation."* |
| **0:45 - 1:15** | **Donor Portal & Handover** | Switch to **Donor Portal** tab. Click **"Step 3: Confirm Ready"**, then verify the recipient's PIN and click **"Step 4: Verify Handover"**. | *"At the bakery, staff see the reservation in their Donor Portal. They confirm the food is packed. When the volunteer arrives, the donor enters the PIN to verify handover. Notice the instant celebratory feedback and sound chime!"* |
| **1:15 - 1:40** | **Recipient Dashboard** | Switch to **My Pickups** tab. | *"In the Recipient Dashboard, shelters track all their active and historical pickups with live status tags and directions. No more phone tag or wasted trips."* |
| **1:40 - 2:00** | **City Impact & Certificate** | Switch to **Impact** tab. Click **"Test Alert"**, then click **"Generate Impact Certificate"**. | *"Every completed pickup instantly feeds our environmental impact engine: meals provided, landfill kilograms avoided, CO₂ cut, and water conserved. Businesses can even print audited certificates for CSR and food safety compliance!"* |

---

## 🛠️ Architecture & Technical Stack

- **Backend:** Python 3.12, Flask RESTful API, SQLite3
- **Frontend:** HTML5, Modern Tailwind CSS (CDN), FontAwesome 6 Icons, Vanilla JavaScript ES6+
- **Mapping:** Leaflet.js with OpenStreetMap Carto Voyager tiles (no external API key required)
- **Visualizations:** Chart.js 4 (Doughnut category distribution & Bar diversion trend)
- **Utilities:** QRCode.js (dynamic scannable passes), Canvas Confetti (celebratory UI), Web Audio API (native alert synthesizer)
- **Database:** Local SQLite database (`foodlink.db`) with zero external service dependencies.

---

## 📋 Assumptions, Limitations & Future Roadmap

### Assumptions
- Donors and recipients operate within a hyper-local metropolitan radius (default: 10 km).
- Food complies with local Good Samaritan Food Donation safety regulations and proper initial packaging.

### Current Prototype Limitations
- Role switching is handled via simulated tab navigation without full multi-tenant password authentication.
- Geolocation utilizes client-provided coordinates and default city center reference points.
- Push notifications run via browser toasts and in-app drawers rather than Web Push service workers.

### Production Next Steps
1. **User Authentication & Verification:** Role-based JWT login for registered non-profits (501(c)(3) / 80G tax exemptions) and licensed food establishments.
2. **Native Mobile App (PWA):** Geofenced GPS push notifications notifying volunteers when surplus food is posted within 1 km.
3. **Automated Volunteer Dispatch:** Integration with local bicycle courier networks for automated pickup of bulk food donations.
4. **IoT Temperature Logging:** Bluetooth temperature probes verifying cold chain compliance during transport for high-risk dairy and cooked meats.
