import os
import random
import math
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from database import get_db, init_db, seed_sample_data

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'foodlink-dev-secret-key-hackathon-2026')
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Haversine distance in km
def calculate_distance(lat1, lon1, lat2, lon2):
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        r = 6371 # Radius of earth in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))
        return round(r * c, 1)
    except Exception:
        return 1.2

def compute_urgency(deadline_str, now):
    try:
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d %H:%M")
        diff = deadline - now
        minutes_left = int(diff.total_seconds() / 60)
        if minutes_left <= 0:
            return minutes_left, 'expired', 'Expired'
        elif minutes_left <= 60:
            return minutes_left, 'critical', f'Expires in {minutes_left}m'
        elif minutes_left <= 180:
            hours = minutes_left // 60
            mins = minutes_left % 60
            return minutes_left, 'urgent', f'Expires in {hours}h {mins}m'
        else:
            hours = minutes_left // 60
            return minutes_left, 'normal', f'Expires in {hours}h'
    except Exception:
        return 120, 'normal', 'Active today'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/listings', methods=['GET'])
def get_listings():
    user_lat = request.args.get('lat', 12.9716)
    user_lon = request.args.get('lon', 77.5946)
    status_filter = request.args.get('status', '')
    category_filter = request.args.get('category', '')
    search_query = request.args.get('q', '').strip().lower()
    max_distance = request.args.get('distance', type=float)
    pickup_time = request.args.get('pickup_time', '')

    conn = get_db()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM listings WHERE 1=1'
    params = []

    if status_filter:
        query += ' AND status = ?'
        params.append(status_filter)
    
    if category_filter and category_filter != 'all':
        query += ' AND category = ?'
        params.append(category_filter)

    if search_query:
        query += ' AND (LOWER(title) LIKE ? OR LOWER(business_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(pickup_address) LIKE ?)'
        like_str = f'%{search_query}%'
        params.extend([like_str, like_str, like_str, like_str])

    query += ' ORDER BY CASE status WHEN "available" THEN 1 WHEN "reserved" THEN 2 ELSE 3 END, id DESC'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    listings = []
    now = datetime.now()

    for row in rows:
        item = dict(row)
        # Calculate distance
        dist = calculate_distance(user_lat, user_lon, item['latitude'], item['longitude'])
        item['distance_km'] = dist
        
        # Calculate deadline status
        minutes_left, urgency, urgency_label = compute_urgency(item['deadline_time'], now)
        item['minutes_left'] = minutes_left
        item['urgency'] = urgency
        item['urgency_label'] = urgency_label

        # Distance filter if supplied
        if max_distance is not None and max_distance > 0:
            if dist > max_distance:
                continue

        # Pickup time filter if supplied
        if pickup_time == 'urgent' and minutes_left > 120:
            continue
        elif pickup_time == 'today' and minutes_left > 360:
            continue

        listings.append(item)

    return jsonify(listings)

@app.route('/api/listings/<int:listing_id>', methods=['GET'])
def get_listing_detail(listing_id):
    user_lat = request.args.get('lat', 12.9716)
    user_lon = request.args.get('lon', 77.5946)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM listings WHERE id = ?', (listing_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': 'Listing not found'}), 404

    item = dict(row)
    now = datetime.now()
    item['distance_km'] = calculate_distance(user_lat, user_lon, item['latitude'], item['longitude'])
    minutes_left, urgency, urgency_label = compute_urgency(item['deadline_time'], now)
    item['minutes_left'] = minutes_left
    item['urgency'] = urgency
    item['urgency_label'] = urgency_label

    return jsonify(item)

@app.route('/api/listings', methods=['POST'])
def create_listing():
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now()

    # Support JSON or multipart form
    if request.is_json:
        data = request.get_json()
        image_url = data.get('image_url') or 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
    else:
        data = request.form.to_dict()
        image_url = data.get('image_url')
        if 'image_file' in request.files:
            file = request.files['image_file']
            if file and allowed_file(file.filename):
                filename = secure_filename(f"{int(now.timestamp())}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_url = f"/static/uploads/{filename}"

    if not image_url:
        # Default placeholder based on category
        cat = data.get('category', 'Cooked Meals')
        cat_images = {
            'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
            'Cooked Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
            'Fresh Produce': 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80',
            'Dairy & Chilled': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
            'Packaged & Pantry': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'
        }
        image_url = cat_images.get(cat, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80')

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400

    business_name = data.get('business_name', 'Community Food Partner')
    business_type = data.get('business_type', 'Restaurant')
    category = data.get('category', 'Cooked Meals')
    dietary_tags = data.get('dietary_tags', 'Vegetarian')
    allergen_info = data.get('allergen_info', 'No major allergens declared')
    handling_instructions = data.get('handling_instructions', 'Safe food handling: Keep chilled or insulated until delivery.')
    quantity = data.get('quantity', '10 portions')
    
    try:
        weight_kg = float(data.get('weight_kg', 5.0))
    except (ValueError, TypeError):
        weight_kg = 5.0

    try:
        estimated_meals = int(data.get('estimated_meals', int(weight_kg * 2.2)))
        if estimated_meals < 1:
            estimated_meals = int(weight_kg * 2.2) or 5
    except (ValueError, TypeError):
        estimated_meals = int(weight_kg * 2.2) or 5

    pickup_address = data.get('pickup_address', '12 Central Road')
    try:
        latitude = float(data.get('latitude', 12.9716 + random.uniform(-0.015, 0.015)))
        longitude = float(data.get('longitude', 77.5946 + random.uniform(-0.015, 0.015)))
    except (ValueError, TypeError):
        latitude = 12.9716
        longitude = 77.5946

    pickup_instructions = data.get('pickup_instructions', 'Ring bell at front counter.')
    
    # Deadline: default 3 hours from now if not given
    deadline_time = data.get('deadline_time')
    if not deadline_time:
        deadline_time = (now + timedelta(hours=3)).strftime("%Y-%m-%d %H:%M")
    elif 'T' in deadline_time:
        deadline_time = deadline_time.replace('T', ' ')[:16]

    description = data.get('description', f'Safe, freshly prepared surplus {title} ready for immediate charity pickup.')

    cursor.execute('''
    INSERT INTO listings (
        title, description, business_name, business_type, category,
        dietary_tags, allergen_info, handling_instructions, quantity,
        weight_kg, estimated_meals, pickup_address, latitude, longitude,
        pickup_instructions, deadline_time, created_at, image_url,
        status, donor_confirmed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 0)
    ''', (
        title, description, business_name, business_type, category,
        dietary_tags, allergen_info, handling_instructions, quantity,
        weight_kg, estimated_meals, pickup_address, latitude, longitude,
        pickup_instructions, deadline_time, now.strftime("%Y-%m-%d %H:%M"),
        image_url
    ))
    new_id = cursor.lastrowid

    # Create notification for nearby charities
    cursor.execute('''
    INSERT INTO notifications (title, message, type, listing_id, created_at)
    VALUES (?, ?, 'new_listing', ?, ?)
    ''', (
        f"New Food Listed: {title}",
        f"{business_name} just listed {quantity} ({estimated_meals} meals). Pickup by {deadline_time[-5:]}.",
        new_id,
        now.strftime("%Y-%m-%d %H:%M")
    ))

    # Add activity log
    cursor.execute('''
    INSERT INTO activity_log (action_text, icon, badge_color, created_at)
    VALUES (?, 'plus-circle', 'emerald', ?)
    ''', (
        f"{business_name} posted {estimated_meals} meals of {title}",
        now.strftime("%H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'id': new_id,
        'message': 'Surplus food listing published! Alert sent to registered charities.'
    }), 201

@app.route('/api/listings/<int:listing_id>/claim', methods=['POST'])
def claim_listing(listing_id):
    data = request.get_json() or {}
    name = data.get('name', 'Community Volunteer').strip()
    org = data.get('org', 'Local Charity Partner').strip()
    phone = data.get('phone', '+91 98000 00000').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM listings WHERE id = ?', (listing_id,))
    listing = cursor.fetchone()

    if not listing:
        conn.close()
        return jsonify({'error': 'Listing not found'}), 404

    if listing['status'] != 'available':
        conn.close()
        return jsonify({'error': f"Cannot claim: item is already {listing['status']}."}), 400

    # Generate 6-digit pickup PIN
    pin = f"{random.randint(100, 999)}-{random.randint(100, 999)}"
    now = datetime.now()

    cursor.execute('''
    UPDATE listings
    SET status = 'reserved',
        donor_confirmed = 0,
        claimed_by_name = ?,
        claimed_by_org = ?,
        claimed_by_phone = ?,
        claimed_at = ?,
        pickup_pin = ?
    WHERE id = ?
    ''', (name, org, phone, now.strftime("%Y-%m-%d %H:%M"), pin, listing_id))

    # Add notification for business
    cursor.execute('''
    INSERT INTO notifications (title, message, type, listing_id, created_at)
    VALUES (?, ?, 'claimed', ?, ?)
    ''', (
        f"Food Claimed: {listing['title']}",
        f"{org} ({name}) has reserved this pickup. Verification PIN: {pin}.",
        listing_id,
        now.strftime("%Y-%m-%d %H:%M")
    ))

    # Add activity log
    cursor.execute('''
    INSERT INTO activity_log (action_text, icon, badge_color, created_at)
    VALUES (?, 'hand-holding-heart', 'blue', ?)
    ''', (
        f"{org} reserved {listing['estimated_meals']} meals from {listing['business_name']}",
        now.strftime("%H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'pickup_pin': pin,
        'claimed_by_name': name,
        'claimed_by_org': org,
        'pickup_address': listing['pickup_address'],
        'pickup_instructions': listing['pickup_instructions'],
        'deadline_time': listing['deadline_time'],
        'message': 'Food successfully reserved! Show your PIN upon arrival.'
    })

# Step 3 in Journey: Donor confirms the reservation
@app.route('/api/listings/<int:listing_id>/confirm_reservation', methods=['POST'])
def confirm_reservation(listing_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM listings WHERE id = ?', (listing_id,))
    listing = cursor.fetchone()

    if not listing:
        conn.close()
        return jsonify({'error': 'Listing not found'}), 404

    if listing['status'] != 'reserved':
        conn.close()
        return jsonify({'error': f"Cannot confirm: listing is {listing['status']}."}), 400

    now = datetime.now()
    cursor.execute('''
    UPDATE listings
    SET donor_confirmed = 1
    WHERE id = ?
    ''', (listing_id,))

    # Notification for recipient
    cursor.execute('''
    INSERT INTO notifications (title, message, type, listing_id, created_at)
    VALUES (?, ?, 'confirmed', ?, ?)
    ''', (
        f"Order Packed & Ready: {listing['title']}",
        f"{listing['business_name']} has confirmed your reservation! Your surplus food is packed and ready for pickup.",
        listing_id,
        now.strftime("%Y-%m-%d %H:%M")
    ))

    # Activity log
    cursor.execute('''
    INSERT INTO activity_log (action_text, icon, badge_color, created_at)
    VALUES (?, 'clipboard-check', 'blue', ?)
    ''', (
        f"{listing['business_name']} confirmed pickup ready for {listing['claimed_by_org']}",
        now.strftime("%H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f"Reservation confirmed! Notification sent to {listing['claimed_by_org']}."
    })

# Step 4 in Journey: Handover verification and collection
@app.route('/api/listings/<int:listing_id>/collect', methods=['POST'])
def collect_listing(listing_id):
    data = request.get_json() or {}
    provided_pin = data.get('pin', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM listings WHERE id = ?', (listing_id,))
    listing = cursor.fetchone()

    if not listing:
        conn.close()
        return jsonify({'error': 'Listing not found'}), 404

    if listing['status'] == 'collected':
        conn.close()
        return jsonify({'error': 'Item has already been marked as collected.'}), 400

    # If pin is provided, verify it (or allow business override)
    if provided_pin and listing['pickup_pin'] and provided_pin != listing['pickup_pin']:
        conn.close()
        return jsonify({'error': 'Invalid Pickup PIN. Please check the recipient pickup ticket.'}), 400

    now = datetime.now()
    cursor.execute('''
    UPDATE listings
    SET status = 'collected',
        donor_confirmed = 1,
        collected_at = ?
    WHERE id = ?
    ''', (now.strftime("%Y-%m-%d %H:%M"), listing_id))

    # Add notification
    cursor.execute('''
    INSERT INTO notifications (title, message, type, listing_id, created_at)
    VALUES (?, ?, 'collected', ?, ?)
    ''', (
        f"Mission Accomplished: {listing['title']} Rescued!",
        f"{listing['estimated_meals']} meals ({listing['weight_kg']} kg) successfully diverted from waste and delivered.",
        listing_id,
        now.strftime("%Y-%m-%d %H:%M")
    ))

    # Add activity log
    cursor.execute('''
    INSERT INTO activity_log (action_text, icon, badge_color, created_at)
    VALUES (?, 'award', 'emerald', ?)
    ''', (
        f"Successfully rescued {listing['estimated_meals']} meals ({listing['weight_kg']} kg) from {listing['business_name']}!",
        now.strftime("%H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'meals_saved': listing['estimated_meals'],
        'weight_kg': listing['weight_kg'],
        'message': f"Food handover verified! {listing['estimated_meals']} meals saved from waste."
    })

@app.route('/api/listings/<int:listing_id>/cancel', methods=['POST'])
def cancel_claim(listing_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM listings WHERE id = ?', (listing_id,))
    listing = cursor.fetchone()

    if not listing:
        conn.close()
        return jsonify({'error': 'Listing not found'}), 404

    cursor.execute('''
    UPDATE listings
    SET status = 'available',
        donor_confirmed = 0,
        claimed_by_name = NULL,
        claimed_by_org = NULL,
        claimed_by_phone = NULL,
        claimed_at = NULL,
        pickup_pin = NULL
    WHERE id = ?
    ''', (listing_id,))

    now = datetime.now()
    cursor.execute('''
    INSERT INTO notifications (title, message, type, listing_id, created_at)
    VALUES (?, ?, 'urgent', ?, ?)
    ''', (
        f"Listing Re-opened: {listing['title']}",
        f"Reservation was released. Surplus food is available again for immediate pickup.",
        listing_id,
        now.strftime("%Y-%m-%d %H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Reservation cancelled. Listing is available again.'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    # Total collected items
    cursor.execute('SELECT SUM(estimated_meals) as meals, SUM(weight_kg) as weight, COUNT(*) as count FROM listings WHERE status = "collected"')
    collected_stats = cursor.fetchone()
    
    meals_collected = collected_stats['meals'] or 0
    kg_diverted = collected_stats['weight'] or 0.0

    # Add historical baseline for demonstration realism
    baseline_meals = 1240
    baseline_kg = 560.0
    
    total_meals = meals_collected + baseline_meals
    total_kg = round(kg_diverted + baseline_kg, 1)
    co2_kg = round(total_kg * 2.5, 1) # Standard FAO benchmark: 2.5kg CO2e per kg food saved
    water_liters = int(total_kg * 850) # Approx 850 liters water saved per kg
    cost_saved = int(total_meals * 80) # Estimated ₹80 / $1.00 per meal value

    # Active available & reserved counts
    cursor.execute('SELECT COUNT(*) as count FROM listings WHERE status = "available"')
    active_count = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM listings WHERE status = "reserved"')
    reserved_count = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM listings WHERE status = "collected"')
    total_collected_count = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(DISTINCT business_name) as count FROM listings')
    donors_count = cursor.fetchone()['count'] + 14 # Include community network donors

    cursor.execute('SELECT COUNT(*) as count FROM listings')
    total_listings_count = cursor.fetchone()['count'] + 42 # Total listings shared historically

    # Category breakdown for charts
    cursor.execute('''
    SELECT category, COUNT(*) as count, SUM(estimated_meals) as meals
    FROM listings
    GROUP BY category
    ''')
    category_rows = cursor.fetchall()
    categories = []
    for r in category_rows:
        categories.append({
            'category': r['category'],
            'count': r['count'],
            'meals': r['meals'] or 0
        })

    # Recent activities
    cursor.execute('SELECT * FROM activity_log ORDER BY id DESC LIMIT 10')
    activities = [dict(row) for row in cursor.fetchall()]

    # Leaderboard donors
    cursor.execute('''
    SELECT business_name, business_type, SUM(estimated_meals) as total_meals, SUM(weight_kg) as total_kg
    FROM listings
    GROUP BY business_name
    ORDER BY total_meals DESC
    LIMIT 5
    ''')
    donors = [dict(row) for row in cursor.fetchall()]

    # Top charities
    top_charities = [
        {"name": "Youth Hope Shelter Network", "type": "Homeless Shelter", "rescued_meals": 480, "impact_badge": "Hero"},
        {"name": "St. Jude Community Kitchen", "type": "Soup Kitchen", "rescued_meals": 390, "impact_badge": "Champion"},
        {"name": "Seva Community Kitchen", "type": "Community Pantry", "rescued_meals": 275, "impact_badge": "Guardian"},
        {"name": "Elderly Care Food Hub", "type": "Senior Center", "rescued_meals": 195, "impact_badge": "Supporter"}
    ]

    conn.close()

    return jsonify({
        'total_meals_saved': total_meals,
        'total_kg_diverted': total_kg,
        'co2_kg_prevented': co2_kg,
        'water_liters_saved': water_liters,
        'cost_saved': cost_saved,
        'active_listings': active_count,
        'reserved_listings': reserved_count,
        'collected_listings': total_collected_count,
        'total_listings_shared': total_listings_count,
        'active_donors': donors_count,
        'categories': categories,
        'recent_activities': activities,
        'leaderboard_donors': donors,
        'leaderboard_charities': top_charities
    })

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notifications ORDER BY id DESC LIMIT 20')
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/seed', methods=['POST'])
def reset_seed():
    seed_sample_data()
    return jsonify({'success': True, 'message': 'Demo data reset and seeded successfully!'})

if __name__ == '__main__':
    init_db()
    print("Starting FoodLink Web App on http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
