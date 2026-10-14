import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'foodlink.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create Listings table with complete dietary, allergen & handling details
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        business_name TEXT NOT NULL,
        business_type TEXT NOT NULL DEFAULT 'Restaurant',
        category TEXT NOT NULL,
        dietary_tags TEXT,
        allergen_info TEXT DEFAULT 'No major allergens declared',
        handling_instructions TEXT DEFAULT 'Safe food handling: Keep chilled or insulated until delivery.',
        quantity TEXT NOT NULL,
        weight_kg REAL NOT NULL DEFAULT 5.0,
        estimated_meals INTEGER NOT NULL DEFAULT 10,
        pickup_address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        pickup_instructions TEXT,
        deadline_time TEXT NOT NULL,
        created_at TEXT NOT NULL,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'available', -- 'available', 'reserved', 'collected', 'cancelled'
        donor_confirmed INTEGER NOT NULL DEFAULT 0, -- 0: pending donor prep/confirm, 1: confirmed & ready for pickup
        claimed_by_name TEXT,
        claimed_by_org TEXT,
        claimed_by_phone TEXT,
        claimed_at TEXT,
        pickup_pin TEXT,
        collected_at TEXT
    )
    ''')

    # Create Notifications table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'new_listing', -- 'new_listing', 'claimed', 'confirmed', 'collected', 'urgent'
        listing_id INTEGER,
        created_at TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0
    )
    ''')

    # Create Activity Log for Community Feed
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_text TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'utensils',
        badge_color TEXT NOT NULL DEFAULT 'emerald',
        created_at TEXT NOT NULL
    )
    ''')

    conn.commit()
    conn.close()

def seed_sample_data():
    conn = get_db()
    cursor = conn.cursor()
    
    # Clear existing listings & notifications if resetting
    cursor.execute('DELETE FROM listings')
    cursor.execute('DELETE FROM notifications')
    cursor.execute('DELETE FROM activity_log')

    now = datetime.now()
    
    # Sample realistic listings representing diverse donor types
    sample_listings = [
        (
            "Fresh Artisan Bread & Croissant Assortment",
            "End-of-day surplus artisanal sourdough loaves, crusty baguettes, and chocolate croissants baked fresh this morning. Safely bagged in food-grade bakery paper.",
            "Golden Crust Bakery",
            "Bakery",
            "Bakery",
            "Vegetarian, Halal",
            "Contains Gluten / Wheat, Milk / Butter. Nut-free facility.",
            "Store in dry paper bags at ambient temperature. Consume or distribute within 24 hours.",
            "18 Loaves & 24 Pastries",
            12.5,
            28,
            "142 Baker Street, Central Plaza",
            12.9716,
            77.5946,
            "Come to the back delivery counter in the alleyway. Ring the silver bell and ask for Chef Pierre.",
            (now + timedelta(hours=2, minutes=30)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
            "available",
            0,
            None, None, None, None, None, None
        ),
        (
            "Prepared Catering Buffet Meals (Paneer Curry & Rice)",
            "Safe surplus buffet trays from an afternoon corporate symposium. Chilled immediately in deep foil gastro-pans. Includes Shahi Paneer, Dal Makhani, and Steamed Basmati Rice.",
            "Spice Symphony Gourmet Catering",
            "Caterer",
            "Cooked Meals",
            "Vegetarian, Gluten-Free",
            "Contains Dairy (Paneer, Cream). Gluten-Free & Nut-Free.",
            "Chilled at 3°C. Bring insulated thermal containers. Reheat thoroughly to 75°C (165°F) before distribution.",
            "35 Ready Meal Portions",
            18.0,
            40,
            "88 Tech Park Boulevard, Sector 4",
            12.9785,
            77.6012,
            "Security gate 2. Mention FoodLink pickup at front reception desk. Loading bay parking available.",
            (now + timedelta(hours=1, minutes=15)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
            "available",
            0,
            None, None, None, None, None, None
        ),
        (
            "Organic Farm Fresh Produce Crate (Tomatoes, Greens & Apples)",
            "Slightly cosmetically imperfect organic produce, crisp, 100% ripe and packed with nutrients. Includes heirloom tomatoes, baby spinach, bell peppers, and Fuji apples.",
            "Green Harvest Organic Grocer",
            "Grocery Store",
            "Fresh Produce",
            "Vegan, Gluten-Free, Organic",
            "Allergen-Free. Pure 100% farm-grown organic produce.",
            "Wash thoroughly before consumption. Keep in well-ventilated cool crates.",
            "4 Crates (~25 kg)",
            25.0,
            55,
            "510 Market Square, 5th Avenue",
            12.9642,
            77.5855,
            "Loading dock behind grocery store. Staff member Sarah is on duty to help load.",
            (now + timedelta(hours=4)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80",
            "available",
            0,
            None, None, None, None, None, None
        ),
        (
            "Greek Yogurt & Whole Milk Dairy Cartons",
            "Refrigerated whole milk jugs, sealed Greek yogurt tubs, and mild cheddar blocks with 'Best Before' in 3 days. Maintained continuously in walk-in cold storage.",
            "Urban Fresh Supermarket",
            "Grocery Store",
            "Dairy & Chilled",
            "Vegetarian, Halal",
            "Contains Cow Milk / Dairy. Safe for lacto-vegetarians.",
            "Keep strictly between 2°C and 4°C. Recipient must transport using cooler or ice chest.",
            "20 Cartons & 15 Tubs",
            16.0,
            35,
            "320 Metro Mall, Ground Floor",
            12.9850,
            77.6100,
            "Enter customer service desk next to dairy aisle. Present your FoodLink reservation PIN.",
            (now + timedelta(hours=3, minutes=45)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
            "reserved",
            1, # Confirmed by donor
            "Sister Teresa",
            "St. Jude Community Kitchen",
            "+91 98450 12345",
            (now - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M"),
            "482-910",
            None
        ),
        (
            "Wood-Fired Pizza & Pasta Lunch Portions",
            "Surplus freshly baked Margherita, mushroom-truffle pizzas, and tray of Penne all'Arrabbiata from lunchtime service. Individual recyclable cardboard meal boxes.",
            "Bella Italia Trattoria",
            "Restaurant",
            "Cooked Meals",
            "Vegetarian",
            "Contains Dairy (Mozzarella, Parmesan), Gluten (Durum wheat).",
            "Best kept warm in insulated catering carriers or consumed immediately upon pickup.",
            "12 Boxed Meals",
            8.0,
            18,
            "74 Olive Walk, Riverside",
            12.9680,
            77.6050,
            "Front host desk. Ask for shift manager Marco.",
            (now + timedelta(hours=1, minutes=45)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(hours=1, minutes=10)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
            "available",
            0,
            None, None, None, None, None, None
        ),
        (
            "Nutritious Mixed Salad Bowls & Fruit Parfaits",
            "Grab-and-go Mediterranean quinoa bowls, roasted chickpea salads, and low-fat berry parfaits prepared this morning. 100% sealed tamper-evident containers.",
            "Pure Greens Salad Bar",
            "Cafe",
            "Cooked Meals",
            "Vegan, Gluten-Free",
            "Parfaits contain Dairy; Quinoa Salad bowls are 100% Vegan & Allergen-Free.",
            "Keep chilled at 4°C. Consume within 12 hours.",
            "15 Meal Bowls",
            6.5,
            15,
            "19 Wellness Way, North Point",
            12.9810,
            77.5890,
            "Side curbside pickup window. Park in spot #4.",
            (now + timedelta(hours=5)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(hours=4)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
            "available",
            0,
            None, None, None, None, None, None
        ),
        (
            "Bulk Pantry Staples (Lentils, Rice, Pasta)",
            "Excess inventory sacks of dry basmati rice, red split lentils, and penne rigate pasta from distribution inventory surplus. Long shelf-life non-perishables.",
            "Apex Wholesale Mart",
            "Grocery Store",
            "Packaged & Pantry",
            "Vegan, Halal",
            "Pasta contains Wheat / Gluten. Rice and Lentils are Naturally Gluten-Free.",
            "Store in dry, pest-free ambient conditions away from direct sunlight.",
            "6 Large Sacks (30 kg)",
            30.0,
            70,
            "12 Logistics Corridor, Outer Ring",
            12.9550,
            77.6180,
            "Bay 4 loading dock. Vehicle recommended for collection.",
            (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
            "collected",
            1,
            "David Chen",
            "Youth Hope Shelter Network",
            "+91 99001 88221",
            (now - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M"),
            "731-504",
            (now - timedelta(hours=2, minutes=10)).strftime("%Y-%m-%d %H:%M")
        ),
        (
            "Assorted Sandwiches & Fresh Juice Bottles",
            "Healthy smoked paneer ciabattas, roasted eggplant focaccias, and cold-pressed citrus juice bottles from cafe afternoon stock.",
            "Corner Bean & Brew",
            "Cafe",
            "Bakery",
            "Vegetarian",
            "Contains Dairy (Paneer), Wheat. Juice is 100% cold-pressed fruit without additives.",
            "Refrigerated display item. Keep at or below 5°C until distributed.",
            "20 Sandwiches & 15 Juices",
            10.0,
            22,
            "22 College Road, South Campus",
            12.9600,
            77.5990,
            "Main counter. Mention code FoodLink #8.",
            (now - timedelta(hours=5)).strftime("%Y-%m-%d %H:%M"),
            (now - timedelta(days=1, hours=2)).strftime("%Y-%m-%d %H:%M"),
            "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
            "collected",
            1,
            "Priya Sharma",
            "Seva Community Kitchen",
            "+91 98860 33445",
            (now - timedelta(hours=8)).strftime("%Y-%m-%d %H:%M"),
            "902-614",
            (now - timedelta(hours=5, minutes=15)).strftime("%Y-%m-%d %H:%M")
        )
    ]

    for item in sample_listings:
        cursor.execute('''
        INSERT INTO listings (
            title, description, business_name, business_type, category,
            dietary_tags, allergen_info, handling_instructions, quantity,
            weight_kg, estimated_meals, pickup_address, latitude, longitude,
            pickup_instructions, deadline_time, created_at, image_url,
            status, donor_confirmed, claimed_by_name, claimed_by_org,
            claimed_by_phone, claimed_at, pickup_pin, collected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', item)

    # Initial notifications
    sample_notifications = [
        (
            "New Surplus Food Available!",
            "Golden Crust Bakery just listed 18 loaves & 24 pastries. Pickup deadline in 2.5 hours.",
            "new_listing",
            1,
            (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M")
        ),
        (
            "Urgent Collection Alert",
            "Spice Symphony Catering has 35 hot buffet portions ready for pickup (expires in ~75m).",
            "urgent",
            2,
            (now - timedelta(minutes=40)).strftime("%Y-%m-%d %H:%M")
        ),
        (
            "Pickup Reserved & Confirmed",
            "St. Jude Community Kitchen reserved Dairy Cartons from Urban Fresh Supermarket. Donor confirmed ready for pickup.",
            "confirmed",
            4,
            (now - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M")
        ),
        (
            "Rescue Complete! 🎉",
            "Apex Wholesale Mart marked 30 kg pantry staples as collected by Youth Hope Shelter.",
            "collected",
            7,
            (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
        )
    ]

    for notif in sample_notifications:
        cursor.execute('''
        INSERT INTO notifications (title, message, type, listing_id, created_at)
        VALUES (?, ?, ?, ?, ?)
        ''', notif)

    # Activity log
    sample_activities = [
        ("Youth Hope Shelter collected 70 meals (30 kg) from Apex Wholesale Mart", "check-circle", "emerald", (now - timedelta(hours=2)).strftime("%H:%M")),
        ("Urban Fresh Supermarket confirmed reservation for St. Jude Kitchen (35 meals ready)", "clipboard-check", "blue", (now - timedelta(minutes=20)).strftime("%H:%M")),
        ("St. Jude Community Kitchen reserved 35 meals from Urban Fresh Supermarket", "hand-holding-heart", "blue", (now - timedelta(minutes=25)).strftime("%H:%M")),
        ("Golden Crust Bakery posted 28 meals of fresh sourdough bread & croissants", "plus-circle", "amber", (now - timedelta(minutes=55)).strftime("%H:%M")),
        ("Spice Symphony Gourmet Catering posted 40 hot buffet meals", "fire", "orange", (now - timedelta(minutes=45)).strftime("%H:%M")),
        ("Seva Community Kitchen completed rescue of 22 meal packs from Corner Bean & Brew", "award", "purple", (now - timedelta(hours=5)).strftime("%H:%M"))
    ]

    for act in sample_activities:
        cursor.execute('''
        INSERT INTO activity_log (action_text, icon, badge_color, created_at)
        VALUES (?, ?, ?, ?)
        ''', act)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    seed_sample_data()
    print("Database initialized and seeded successfully with FoodLink sample data!")
