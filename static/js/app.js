// FoodLink - Community Food Waste Reduction Platform
// Core JavaScript Application

const AppState = {
    role: 'recipient', // 'recipient', 'my-pickups', 'donor', 'impact'
    viewMode: 'list',  // 'list' or 'map'
    listings: [],
    stats: null,
    notifications: [],
    unreadCount: 0,
    activeCategory: 'all',
    searchQuery: '',
    selectedDietary: '',
    selectedDistance: '',
    selectedTime: '',
    selectedListing: null,
    map: null,
    markers: [],
    soundEnabled: true,
    userLocation: { lat: 12.9716, lng: 77.5946 } // Default city center
};

// Web Audio API Synthesizer for clean alert chimes
function playChime(type = 'alert') {
    if (!AppState.soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'alert') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch (e) {
        console.warn('Audio chime unsupported or blocked', e);
    }
}

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupRoleNavigation();
    setupEventListeners();
    await fetchListings();
    await fetchStats();
    await fetchNotifications();
    setupRealtimeSimulators();
}

// Role Navigation (Find Food, Recipient Dashboard, Donor Portal, Impact)
function setupRoleNavigation() {
    const roleBtns = document.querySelectorAll('.role-nav-btn');
    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            switchRole(role);
        });
    });
}

function switchRole(role) {
    AppState.role = role;
    
    // Update active nav button styling
    document.querySelectorAll('.role-nav-btn').forEach(btn => {
        if (btn.dataset.role === role) {
            btn.classList.add('bg-emerald-600', 'text-white', 'shadow-md');
            btn.classList.remove('text-slate-600', 'hover:bg-slate-200/60');
        } else {
            btn.classList.remove('bg-emerald-600', 'text-white', 'shadow-md');
            btn.classList.add('text-slate-600', 'hover:bg-slate-200/60');
        }
    });

    // Hide all sections
    document.getElementById('recipientSection').classList.add('hidden');
    document.getElementById('myPickupsSection').classList.add('hidden');
    document.getElementById('donorSection').classList.add('hidden');
    document.getElementById('impactSection').classList.add('hidden');

    // Show selected section
    if (role === 'recipient') {
        document.getElementById('recipientSection').classList.remove('hidden');
        if (AppState.viewMode === 'map') {
            setTimeout(initOrUpdateMap, 200);
        }
    } else if (role === 'my-pickups') {
        document.getElementById('myPickupsSection').classList.remove('hidden');
        renderRecipientDashboard();
    } else if (role === 'donor') {
        document.getElementById('donorSection').classList.remove('hidden');
        renderDonorDashboard();
    } else if (role === 'impact') {
        document.getElementById('impactSection').classList.remove('hidden');
        renderImpactCharts();
    }
}

// Event Listeners for UI
function setupEventListeners() {
    // View mode switch (List vs Map)
    document.getElementById('viewListBtn')?.addEventListener('click', () => setViewMode('list'));
    document.getElementById('viewMapBtn')?.addEventListener('click', () => setViewMode('map'));

    // Category filter buttons
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-filter-btn').forEach(b => {
                b.classList.remove('bg-emerald-600', 'text-white', 'shadow-sm');
                b.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
            });
            btn.classList.add('bg-emerald-600', 'text-white', 'shadow-sm');
            btn.classList.remove('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');

            AppState.activeCategory = btn.dataset.category;
            renderListings();
        });
    });

    // Search bar input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AppState.searchQuery = e.target.value.toLowerCase().trim();
            renderListings();
        });
    }

    // Dietary filter
    const dietaryFilter = document.getElementById('dietaryFilter');
    if (dietaryFilter) {
        dietaryFilter.addEventListener('change', (e) => {
            AppState.selectedDietary = e.target.value;
            renderListings();
        });
    }

    // Distance filter
    const distanceFilter = document.getElementById('distanceFilter');
    if (distanceFilter) {
        distanceFilter.addEventListener('change', (e) => {
            AppState.selectedDistance = e.target.value;
            renderListings();
        });
    }

    // Pickup time filter
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) {
        timeFilter.addEventListener('change', (e) => {
            AppState.selectedTime = e.target.value;
            renderListings();
        });
    }

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            AppState.soundEnabled = !AppState.soundEnabled;
            soundToggle.innerHTML = AppState.soundEnabled 
                ? '<i class="fa-solid fa-volume-high text-emerald-600"></i>' 
                : '<i class="fa-solid fa-volume-xmark text-slate-400"></i>';
            showToast('Audio Notifications', AppState.soundEnabled ? 'Alert chimes enabled' : 'Alert chimes muted');
        });
    }

    // Notifications drawer toggle
    const notifBtn = document.getElementById('notificationBtn');
    const notifDrawer = document.getElementById('notificationDrawer');
    const closeNotifBtn = document.getElementById('closeNotifDrawer');
    if (notifBtn && notifDrawer) {
        notifBtn.addEventListener('click', () => {
            notifDrawer.classList.toggle('hidden');
            AppState.unreadCount = 0;
            updateNotifBadge();
        });
    }
    if (closeNotifBtn && notifDrawer) {
        closeNotifBtn.addEventListener('click', () => notifDrawer.classList.add('hidden'));
    }

    // Simulate Urgent Alert button (for hackathon judges demo)
    document.getElementById('simAlertBtn')?.addEventListener('click', simulateUrgentListing);

    // Reset Seed Data button
    document.getElementById('resetSeedBtn')?.addEventListener('click', resetDemoData);

    // Post Food Modal triggers
    document.getElementById('openPostModalBtn')?.addEventListener('click', openPostFoodModal);
    document.getElementById('closePostModalBtn')?.addEventListener('click', () => {
        document.getElementById('postFoodModal').classList.add('hidden');
    });

    // Listing Details Modal close trigger
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => {
        document.getElementById('listingDetailModal').classList.add('hidden');
    });

    // Post Food Form submission
    const postFoodForm = document.getElementById('postFoodForm');
    if (postFoodForm) {
        postFoodForm.addEventListener('submit', handlePostFoodSubmit);
    }

    // Preset photo selection
    document.querySelectorAll('.preset-photo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-photo-btn').forEach(b => b.classList.remove('ring-4', 'ring-emerald-500'));
            btn.classList.add('ring-4', 'ring-emerald-500');
            document.getElementById('postImageUrl').value = btn.dataset.url;
        });
    });

    // Weight input auto-calculates meals
    const weightInput = document.getElementById('postWeight');
    const mealsInput = document.getElementById('postMeals');
    if (weightInput && mealsInput) {
        weightInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            mealsInput.value = Math.max(1, Math.round(val * 2.2));
        });
    }

    // Preset deadline buttons (+2h, +4h, tonight 9pm)
    document.querySelectorAll('.deadline-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hours = parseFloat(btn.dataset.hours);
            const now = new Date();
            let target;
            if (hours === 9) {
                target = new Date();
                target.setHours(21, 0, 0, 0);
                if (target <= now) target.setDate(target.getDate() + 1);
            } else {
                target = new Date(now.getTime() + hours * 60 * 60 * 1000);
            }
            const formatted = target.toISOString().slice(0, 16);
            document.getElementById('postDeadline').value = formatted;
        });
    });

    // Claim Modal
    document.getElementById('closeClaimModalBtn')?.addEventListener('click', () => {
        document.getElementById('claimModal').classList.add('hidden');
    });
    document.getElementById('claimFoodForm')?.addEventListener('submit', handleClaimFoodSubmit);

    // Ticket Modal close
    document.getElementById('closeTicketModalBtn')?.addEventListener('click', () => {
        document.getElementById('ticketModal').classList.add('hidden');
    });

    // Print certificate button
    document.getElementById('printCertBtn')?.addEventListener('click', () => {
        window.print();
    });
    document.getElementById('closeCertBtn')?.addEventListener('click', () => {
        document.getElementById('certificateModal').classList.add('hidden');
    });
    document.getElementById('openCertBtn')?.addEventListener('click', openCertificateModal);

    // Close modals on Esc key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('postFoodModal')?.classList.add('hidden');
            document.getElementById('claimModal')?.classList.add('hidden');
            document.getElementById('ticketModal')?.classList.add('hidden');
            document.getElementById('listingDetailModal')?.classList.add('hidden');
            document.getElementById('certificateModal')?.classList.add('hidden');
            document.getElementById('notificationDrawer')?.classList.add('hidden');
        }
    });
}

// Switch between List and Map view
function setViewMode(mode) {
    AppState.viewMode = mode;
    const listBtn = document.getElementById('viewListBtn');
    const mapBtn = document.getElementById('viewMapBtn');
    const listView = document.getElementById('listingsListView');
    const mapView = document.getElementById('listingsMapView');

    if (mode === 'list') {
        listBtn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
        listBtn.classList.remove('text-slate-600');
        mapBtn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        mapBtn.classList.add('text-slate-600');

        listView.classList.remove('hidden');
        mapView.classList.add('hidden');
    } else {
        mapBtn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
        mapBtn.classList.remove('text-slate-600');
        listBtn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        listBtn.classList.add('text-slate-600');

        listView.classList.add('hidden');
        mapView.classList.remove('hidden');

        setTimeout(initOrUpdateMap, 200);
    }
}

// Fetch Listings from Backend
async function fetchListings() {
    try {
        const res = await fetch(`/api/listings?lat=${AppState.userLocation.lat}&lon=${AppState.userLocation.lng}`);
        const data = await res.json();
        AppState.listings = data;
        renderListings();
        updateRecipientBadge();
        if (AppState.viewMode === 'map') {
            initOrUpdateMap();
        }
    } catch (e) {
        console.error('Error fetching listings:', e);
    }
}

// Update badge showing active reservations count
function updateRecipientBadge() {
    const badge = document.getElementById('recipientBadgeCount');
    if (!badge) return;
    const reservedCount = AppState.listings.filter(l => l.status === 'reserved').length;
    if (reservedCount > 0) {
        badge.innerText = reservedCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Render Listings in List View with full search & filters
function renderListings() {
    const container = document.getElementById('listingsGrid');
    if (!container) return;

    // Filter listings
    let filtered = AppState.listings.filter(item => {
        const matchesCategory = AppState.activeCategory === 'all' || item.category === AppState.activeCategory;
        
        const matchesSearch = !AppState.searchQuery || 
            item.title.toLowerCase().includes(AppState.searchQuery) ||
            item.business_name.toLowerCase().includes(AppState.searchQuery) ||
            item.description.toLowerCase().includes(AppState.searchQuery) ||
            item.pickup_address.toLowerCase().includes(AppState.searchQuery) ||
            (item.dietary_tags && item.dietary_tags.toLowerCase().includes(AppState.searchQuery));

        const matchesDietary = !AppState.selectedDietary || 
            (item.dietary_tags && item.dietary_tags.includes(AppState.selectedDietary));

        let matchesDistance = true;
        if (AppState.selectedDistance) {
            matchesDistance = item.distance_km <= parseFloat(AppState.selectedDistance);
        }

        let matchesTime = true;
        if (AppState.selectedTime === 'urgent') {
            matchesTime = item.minutes_left <= 120;
        } else if (AppState.selectedTime === 'today') {
            matchesTime = item.minutes_left <= 360;
        }

        return matchesCategory && matchesSearch && matchesDietary && matchesDistance && matchesTime;
    });

    document.getElementById('listingsCountBadge').innerText = `${filtered.length} surplus food listings found`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
                <div class="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl">
                    <i class="fa-solid fa-utensils"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800">No surplus food listings match your criteria</h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">Try broadening your distance or dietary filters, or check back shortly as restaurants post fresh batches.</p>
                <button onclick="clearFilters()" class="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-smooth shadow">
                    Reset All Filters
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isUrgent = item.urgency === 'critical' || item.urgency === 'urgent';
        const isAvailable = item.status === 'available';
        const isReserved = item.status === 'reserved';
        const isCollected = item.status === 'collected';

        let statusBadge = '';
        if (isAvailable) {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Available
            </span>`;
        } else if (isReserved) {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                <i class="fa-solid fa-lock text-[9px]"></i> Reserved
            </span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                <i class="fa-solid fa-check text-[9px]"></i> Rescued
            </span>`;
        }

        const urgencyBadge = isUrgent && isAvailable
            ? `<div class="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 badge-urgent">
                <i class="fa-solid fa-fire text-amber-300"></i> ${item.urgency_label}
               </div>`
            : `<div class="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow">
                <i class="fa-regular fa-clock text-emerald-400 mr-1"></i> ${item.urgency_label}
               </div>`;

        return `
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-smooth overflow-hidden flex flex-col group">
                <!-- Food Photo -->
                <div class="relative h-44 w-full bg-slate-100 overflow-hidden cursor-pointer" onclick="openListingDetailModal(${item.id})">
                    <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" 
                         class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                         onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'">
                    ${urgencyBadge}
                    <div class="absolute bottom-2.5 left-2.5 flex gap-1.5">
                        <span class="bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow">
                            ${escapeHtml(item.category)}
                        </span>
                        <span class="bg-white/95 backdrop-blur-sm text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md shadow">
                            <i class="fa-solid fa-location-dot text-rose-500 mr-0.5"></i> ${item.distance_km} km
                        </span>
                    </div>
                </div>

                <!-- Card Content -->
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1.5">
                            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">
                                <i class="fa-solid fa-store text-slate-400 mr-1"></i> ${escapeHtml(item.business_name)}
                            </span>
                            ${statusBadge}
                        </div>

                        <h3 class="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1 cursor-pointer" onclick="openListingDetailModal(${item.id})">
                            ${escapeHtml(item.title)}
                        </h3>
                        <p class="text-xs text-slate-600 line-clamp-2 mb-3">
                            ${escapeHtml(item.description)}
                        </p>

                        <!-- Highlights: Quantity, Meals, Tags -->
                        <div class="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                            <span class="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                                <i class="fa-solid fa-box text-emerald-600"></i> ${escapeHtml(item.quantity)}
                            </span>
                            <span class="bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                                <i class="fa-solid fa-utensils text-amber-600"></i> ~${item.estimated_meals} meals
                            </span>
                            ${item.dietary_tags ? `<span class="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                                ${escapeHtml(item.dietary_tags)}
                            </span>` : ''}
                        </div>
                    </div>

                    <div class="pt-2.5 border-t border-slate-100 mt-1">
                        <div class="flex items-start gap-1.5 text-[11px] text-slate-500 mb-3">
                            <i class="fa-solid fa-map-pin text-slate-400 mt-0.5"></i>
                            <span class="truncate">${escapeHtml(item.pickup_address)}</span>
                        </div>

                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="openListingDetailModal(${item.id})" 
                                    class="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-smooth flex items-center justify-center gap-1">
                                <i class="fa-solid fa-circle-info"></i> Details
                            </button>

                            ${isAvailable ? `
                                <button onclick="openClaimModal(${item.id})" 
                                        class="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow transition-smooth flex items-center justify-center gap-1">
                                    <i class="fa-solid fa-hand-holding-heart"></i> Reserve
                                </button>
                            ` : isReserved ? `
                                <button onclick="viewReservationTicket(${item.id})" 
                                        class="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-smooth flex items-center justify-center gap-1">
                                    <i class="fa-solid fa-ticket"></i> View Pass
                                </button>
                            ` : `
                                <div class="py-2 px-2 text-center text-[10px] text-slate-500 font-bold bg-slate-100 rounded-xl flex items-center justify-center gap-1">
                                    <i class="fa-solid fa-check text-emerald-600"></i> Rescued
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function clearFilters() {
    AppState.activeCategory = 'all';
    AppState.searchQuery = '';
    AppState.selectedDietary = '';
    AppState.selectedDistance = '';
    AppState.selectedTime = '';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const dietaryFilter = document.getElementById('dietaryFilter');
    if (dietaryFilter) dietaryFilter.value = '';
    const distanceFilter = document.getElementById('distanceFilter');
    if (distanceFilter) distanceFilter.value = '';
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) timeFilter.value = '';

    document.querySelectorAll('.category-filter-btn').forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'shadow-sm');
        b.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
    });
    const allBtn = document.querySelector('.category-filter-btn[data-category="all"]');
    if (allBtn) {
        allBtn.classList.add('bg-emerald-600', 'text-white', 'shadow-sm');
        allBtn.classList.remove('bg-slate-100', 'text-slate-700');
    }

    renderListings();
}

// Leaflet Map Initialization & Markers
function initOrUpdateMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (!AppState.map) {
        AppState.map = L.map('map').setView([AppState.userLocation.lat, AppState.userLocation.lng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(AppState.map);

        // User center marker
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="background-color: #0f172a; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        L.marker([AppState.userLocation.lat, AppState.userLocation.lng], { icon: userIcon })
            .addTo(AppState.map)
            .bindPopup("<b>Your Current Location</b><br>Surplus food radius search center.");
    }

    // Clear previous listing markers
    AppState.markers.forEach(m => AppState.map.removeLayer(m));
    AppState.markers = [];

    // Add markers for current listings
    AppState.listings.forEach(item => {
        const isUrgent = item.urgency === 'critical' || item.urgency === 'urgent';
        let pinClass = 'pin-available';
        let iconHtml = '<i class="fa-solid fa-utensils"></i>';

        if (item.status === 'reserved') {
            pinClass = 'pin-reserved';
            iconHtml = '<i class="fa-solid fa-lock"></i>';
        } else if (isUrgent) {
            pinClass = 'pin-urgent';
            iconHtml = '<i class="fa-solid fa-fire"></i>';
        }

        const customMarkerIcon = L.divIcon({
            className: 'custom-pin-wrapper',
            html: `<div class="custom-pin ${pinClass}">${iconHtml}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });

        const popupContent = `
            <div style="width: 250px; font-family: sans-serif; padding: 10px;">
                <img src="${escapeHtml(item.image_url)}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: bold; color: #059669; text-transform: uppercase;">${escapeHtml(item.business_name)}</span>
                <h4 style="font-size: 13px; font-weight: bold; margin: 2px 0 4px; color: #0f172a;">${escapeHtml(item.title)}</h4>
                <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
                    <div><b>Qty:</b> ${escapeHtml(item.quantity)} (~${item.estimated_meals} meals)</div>
                    <div><b>Deadline:</b> ${item.deadline_time}</div>
                    <div><b>Distance:</b> ${item.distance_km} km away</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="openListingDetailModal(${item.id})" style="flex: 1; padding: 6px; background-color: #f1f5f9; color: #334155; border: none; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        Details
                    </button>
                    ${item.status === 'available' ? `
                        <button onclick="openClaimModal(${item.id})" style="flex: 1; padding: 6px; background-color: #10b981; color: white; border: none; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                            Reserve
                        </button>
                    ` : `
                        <button onclick="viewReservationTicket(${item.id})" style="flex: 1; padding: 6px; background-color: #3b82f6; color: white; border: none; font-size: 11px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                            View Pass
                        </button>
                    `}
                </div>
            </div>
        `;

        const marker = L.marker([item.latitude, item.longitude], { icon: customMarkerIcon })
            .addTo(AppState.map)
            .bindPopup(popupContent);

        AppState.markers.push(marker);
    });

    AppState.map.invalidateSize();
}

// Listing Details Modal (Full View)
function openListingDetailModal(listingId) {
    const item = AppState.listings.find(l => l.id === listingId);
    if (!item) return;

    AppState.selectedListing = item;

    document.getElementById('detailImage').src = item.image_url;
    document.getElementById('detailTitle').innerText = item.title;
    document.getElementById('detailBusinessName').innerText = `${item.business_name} • ${item.business_type || 'Food Partner'}`;
    document.getElementById('detailDescription').innerText = item.description;
    document.getElementById('detailCategoryBadge').innerText = item.category;
    document.getElementById('detailDistance').innerText = `${item.distance_km} km away`;
    document.getElementById('detailUrgencyBadge').innerText = item.urgency_label;

    document.getElementById('detailQuantity').innerText = item.quantity;
    document.getElementById('detailMeals').innerText = `~${item.estimated_meals} meals`;
    document.getElementById('detailWeight').innerText = `${item.weight_kg} kg`;

    document.getElementById('detailDietaryTags').innerText = item.dietary_tags || 'Vegetarian';
    document.getElementById('detailAllergenInfo').innerText = item.allergen_info || 'No major allergens declared';
    document.getElementById('detailHandling').innerText = item.handling_instructions || 'Safe food handling: Keep chilled or insulated until delivery.';

    document.getElementById('detailAddress').innerText = item.pickup_address;
    document.getElementById('detailInstructions').innerText = item.pickup_instructions || 'Ring bell at entrance.';
    document.getElementById('detailDeadline').innerText = item.deadline_time;

    const actionContainer = document.getElementById('detailActionContainer');
    if (item.status === 'available') {
        document.getElementById('detailStatusBadge').innerText = 'Available Now';
        document.getElementById('detailStatusBadge').className = 'bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-sm shadow';
        actionContainer.innerHTML = `
            <button onclick="document.getElementById('listingDetailModal').classList.add('hidden'); openClaimModal(${item.id});" 
                    class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-smooth flex items-center justify-center gap-2">
                <i class="fa-solid fa-hand-holding-heart"></i> Reserve This Surplus Food Now
            </button>
        `;
    } else if (item.status === 'reserved') {
        document.getElementById('detailStatusBadge').innerText = `Reserved by ${item.claimed_by_org || 'Charity'}`;
        document.getElementById('detailStatusBadge').className = 'bg-blue-600/90 text-white text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-sm shadow';
        actionContainer.innerHTML = `
            <button onclick="document.getElementById('listingDetailModal').classList.add('hidden'); viewReservationTicket(${item.id});" 
                    class="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow transition-smooth flex items-center justify-center gap-2">
                <i class="fa-solid fa-ticket"></i> View Pickup Pass & Verification PIN
            </button>
        `;
    } else {
        document.getElementById('detailStatusBadge').innerText = 'Rescued & Delivered';
        document.getElementById('detailStatusBadge').className = 'bg-slate-700/90 text-white text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-sm shadow';
        actionContainer.innerHTML = `
            <div class="w-full py-3 text-center text-xs text-slate-500 font-bold bg-slate-100 rounded-xl">
                <i class="fa-solid fa-check-circle text-emerald-600 mr-1"></i> Food successfully rescued and diverted from waste!
            </div>
        `;
    }

    document.getElementById('listingDetailModal').classList.remove('hidden');
}

// Claim Modal Flow
function openClaimModal(listingId) {
    const item = AppState.listings.find(l => l.id === listingId);
    if (!item) return;

    AppState.selectedListing = item;
    
    document.getElementById('claimFoodTitle').innerText = item.title;
    document.getElementById('claimBusinessName').innerText = item.business_name;
    document.getElementById('claimQuantity').innerText = item.quantity;
    document.getElementById('claimMeals').innerText = `~${item.estimated_meals} meals (${item.weight_kg} kg)`;
    document.getElementById('claimAddress').innerText = item.pickup_address;
    document.getElementById('claimDeadline').innerText = item.deadline_time;

    document.getElementById('claimModal').classList.remove('hidden');
}

async function handleClaimFoodSubmit(e) {
    e.preventDefault();
    if (!AppState.selectedListing) return;

    const name = document.getElementById('claimVolunteerName').value;
    const org = document.getElementById('claimOrgName').value;
    const phone = document.getElementById('claimPhone').value;

    const submitBtn = document.getElementById('claimSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Reserving...`;

    try {
        const res = await fetch(`/api/listings/${AppState.selectedListing.id}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, org, phone })
        });
        const result = await res.json();

        if (res.ok) {
            document.getElementById('claimModal').classList.add('hidden');
            
            // Show ticket pass modal
            showPickupTicket(AppState.selectedListing, result);
            
            // Confetti celebration
            triggerConfetti();
            playChime('success');

            // Refresh data
            await fetchListings();
            await fetchStats();
            await fetchNotifications();
        } else {
            alert(result.error || 'Failed to claim listing.');
        }
    } catch (err) {
        console.error('Error claiming food:', err);
        alert('An error occurred while reserving the food. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Confirm & Lock Reservation`;
    }
}

// Display scannable pickup pass ticket
function showPickupTicket(listing, claimData) {
    document.getElementById('ticketModal').classList.remove('hidden');
    document.getElementById('ticketPin').innerText = claimData.pickup_pin;
    document.getElementById('ticketTitle').innerText = listing.title;
    document.getElementById('ticketBusiness').innerText = listing.business_name;
    document.getElementById('ticketOrg').innerText = `${claimData.claimed_by_org} (${claimData.claimed_by_name})`;
    document.getElementById('ticketQuantity').innerText = `${listing.quantity} (~${listing.estimated_meals} meals)`;
    document.getElementById('ticketAddress').innerText = claimData.pickup_address;
    document.getElementById('ticketInstructions').innerText = claimData.pickup_instructions || 'Ring bell at entrance.';
    document.getElementById('ticketDeadline').innerText = claimData.deadline_time;

    // Google Maps directions link
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(claimData.pickup_address)}`;
    document.getElementById('ticketDirectionsLink').href = directionsUrl;

    // Generate QR Code
    const qrContainer = document.getElementById('ticketQRCode');
    qrContainer.innerHTML = '';
    if (window.QRCode) {
        new QRCode(qrContainer, {
            text: `FOODLINK-PASS:${listing.id}:${claimData.pickup_pin}`,
            width: 140,
            height: 140,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    showToast('Reservation Locked! 🎟️', `Your pickup PIN is ${claimData.pickup_pin}. Complete pickup by ${claimData.deadline_time.slice(-5)}.`);
}

function viewReservationTicket(listingId) {
    const listing = AppState.listings.find(l => l.id === listingId);
    if (!listing) return;

    showPickupTicket(listing, {
        pickup_pin: listing.pickup_pin || '482-910',
        claimed_by_name: listing.claimed_by_name || 'Volunteer',
        claimed_by_org: listing.claimed_by_org || 'Registered Charity',
        pickup_address: listing.pickup_address,
        pickup_instructions: listing.pickup_instructions,
        deadline_time: listing.deadline_time
    });
}

// Recipient Dashboard Rendering
function renderRecipientDashboard() {
    const activeContainer = document.getElementById('recipientActiveListings');
    const historyContainer = document.getElementById('recipientHistoryListings');

    const reserved = AppState.listings.filter(l => l.status === 'reserved');
    const collected = AppState.listings.filter(l => l.status === 'collected');

    // Calculate metrics
    const totalMealsRescued = collected.reduce((acc, cur) => acc + (cur.estimated_meals || 0), 0) + 120;
    const totalKgRescued = collected.reduce((acc, cur) => acc + (cur.weight_kg || 0), 0) + 55.0;

    document.getElementById('recipientActiveCount').innerText = reserved.length;
    document.getElementById('recipientMealsCount').innerText = totalMealsRescued;
    document.getElementById('recipientWeightCount').innerText = `${Math.round(totalKgRescued)} kg`;

    // Active Reservations to Collect
    if (activeContainer) {
        if (reserved.length === 0) {
            activeContainer.innerHTML = `
                <div class="py-12 text-center text-slate-400">
                    <div class="w-14 h-14 mx-auto mb-3 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl">
                        <i class="fa-solid fa-basket-shopping"></i>
                    </div>
                    <h4 class="font-bold text-slate-700 text-sm">No Active Food Reservations</h4>
                    <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">You have not claimed any surplus food batches right now. Browse nearby listings to reserve food.</p>
                    <button onclick="switchRole('recipient')" class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-smooth">
                        Browse Available Food
                    </button>
                </div>
            `;
        } else {
            activeContainer.innerHTML = reserved.map(item => {
                const isConfirmed = item.donor_confirmed === 1;
                return `
                    <div class="p-5 bg-white border border-slate-200 rounded-2xl mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <img src="${escapeHtml(item.image_url)}" class="w-20 h-20 rounded-xl object-cover shrink-0" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-bold text-slate-900 text-base">${escapeHtml(item.title)}</h4>
                                    ${isConfirmed ? `
                                        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <i class="fa-solid fa-check-circle text-emerald-600"></i> Donor Confirmed Ready
                                        </span>
                                    ` : `
                                        <span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <i class="fa-solid fa-clock text-amber-600"></i> Awaiting Donor Confirmation
                                        </span>
                                    `}
                                </div>
                                <p class="text-xs text-slate-600">
                                    From: <strong class="text-slate-800">${escapeHtml(item.business_name)}</strong> • ${escapeHtml(item.quantity)} (~${item.estimated_meals} meals)
                                </p>
                                <p class="text-xs text-slate-500 mt-1">
                                    <i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> ${escapeHtml(item.pickup_address)}
                                    <span class="mx-2">•</span>
                                    <i class="fa-regular fa-clock text-slate-400 mr-1"></i> Deadline: <strong class="text-rose-600">${item.deadline_time}</strong>
                                </p>
                            </div>
                        </div>

                        <!-- Pass & Actions -->
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                            <div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-center">
                                <span class="text-[9px] uppercase font-bold text-slate-400 block">Pickup PIN</span>
                                <span class="font-mono font-black text-sm text-slate-900">${item.pickup_pin || '482-910'}</span>
                            </div>
                            <button onclick="viewReservationTicket(${item.id})" 
                                    class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-smooth flex items-center justify-center gap-1.5">
                                <i class="fa-solid fa-qrcode"></i> View Pass Ticket
                            </button>
                            <button onclick="cancelClaimReservation(${item.id})" 
                                    class="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 transition-smooth">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Past Pickups History
    if (historyContainer) {
        historyContainer.innerHTML = collected.map(item => `
            <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl mb-2 flex items-center justify-between text-xs">
                <div>
                    <h5 class="font-bold text-slate-800">${escapeHtml(item.title)}</h5>
                    <p class="text-slate-500">Collected from ${escapeHtml(item.business_name)} • Rescued ${item.estimated_meals} meals (${item.weight_kg} kg)</p>
                </div>
                <span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <i class="fa-solid fa-check"></i> Rescued & Distributed
                </span>
            </div>
        `).join('');
    }
}

// Donor Mode Dashboard & Posting
function renderDonorDashboard() {
    const activeContainer = document.getElementById('donorActiveListings');
    const reservedContainer = document.getElementById('donorReservedListings');
    const completedContainer = document.getElementById('donorCompletedListings');

    const available = AppState.listings.filter(l => l.status === 'available');
    const reserved = AppState.listings.filter(l => l.status === 'reserved');
    const collected = AppState.listings.filter(l => l.status === 'collected');

    // Counters
    document.getElementById('donorAvailableCount').innerText = available.length;
    document.getElementById('donorReservedCount').innerText = reserved.length;
    document.getElementById('donorCollectedCount').innerText = collected.length;
    document.getElementById('donorTotalListingsCount').innerText = AppState.listings.length;

    // Render Pending Pickups (Step 3: Confirm & Step 4: Verify PIN Handover)
    if (reservedContainer) {
        if (reserved.length === 0) {
            reservedContainer.innerHTML = `
                <div class="py-8 text-center text-slate-400 text-sm">
                    <i class="fa-solid fa-clipboard-check text-2xl mb-2 text-slate-300"></i>
                    <p>No pending pickups awaiting collection right now.</p>
                </div>
            `;
        } else {
            reservedContainer.innerHTML = reserved.map(item => {
                const isConfirmed = item.donor_confirmed === 1;
                return `
                    <div class="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl mb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex items-start gap-3">
                            <img src="${escapeHtml(item.image_url)}" class="w-16 h-16 rounded-xl object-cover shrink-0" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">Reserved</span>
                                    <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(item.title)}</h4>
                                </div>
                                <p class="text-xs text-slate-600 mt-0.5">
                                    Reserving Recipient: <strong class="text-slate-800">${escapeHtml(item.claimed_by_org || 'Charity')}</strong> (${escapeHtml(item.claimed_by_name || 'Volunteer')})
                                </p>
                                <p class="text-xs text-slate-500">
                                    <i class="fa-solid fa-phone text-slate-400 mr-1"></i> ${escapeHtml(item.claimed_by_phone || 'N/A')}
                                    <span class="mx-2">•</span>
                                    <i class="fa-regular fa-clock text-slate-400 mr-1"></i> Deadline: ${item.deadline_time}
                                </p>
                            </div>
                        </div>

                        <!-- 2-Step Actions: Step 3 Confirm + Step 4 Verify PIN -->
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-amber-200 shrink-0">
                            <!-- Step 3: Confirm Reservation -->
                            <div class="flex flex-col justify-center">
                                ${isConfirmed ? `
                                    <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-check-circle text-emerald-600"></i> Packed & Ready
                                    </span>
                                ` : `
                                    <button onclick="confirmReservationReady(${item.id})" 
                                            class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-smooth flex items-center justify-center gap-1.5">
                                        <i class="fa-solid fa-check"></i> Step 3: Confirm Ready
                                    </button>
                                `}
                            </div>

                            <div class="h-8 w-px bg-slate-200 hidden sm:block"></div>

                            <!-- Step 4: PIN Handover Verification -->
                            <div class="flex items-center gap-2">
                                <div class="flex flex-col">
                                    <label class="text-[10px] uppercase font-bold text-slate-500">Recipient PIN</label>
                                    <input type="text" id="verifyPinInput_${item.id}" placeholder="${item.pickup_pin || '482-910'}" 
                                           value="${item.pickup_pin || ''}"
                                           class="w-24 text-center font-mono font-bold text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                </div>
                                <button onclick="confirmFoodCollected(${item.id})" 
                                        class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-smooth flex items-center justify-center gap-1.5 self-end">
                                    <i class="fa-solid fa-award"></i> Step 4: Verify Handover
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Active listings
    if (activeContainer) {
        if (available.length === 0) {
            activeContainer.innerHTML = `
                <div class="py-8 text-center text-slate-400 text-sm">
                    <p>No active listings. Click "+ Post Surplus Food Now" above to share meals.</p>
                </div>
            `;
        } else {
            activeContainer.innerHTML = available.map(item => `
                <div class="p-3.5 bg-white border border-slate-200 rounded-xl mb-2.5 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <img src="${escapeHtml(item.image_url)}" class="w-12 h-12 rounded-lg object-cover" onerror="this.src='https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'">
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm">${escapeHtml(item.title)}</h4>
                            <p class="text-xs text-slate-500">${escapeHtml(item.quantity)} • ~${item.estimated_meals} meals • Expires in ${item.urgency_label}</p>
                        </div>
                    </div>
                    <span class="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        Live on Map
                    </span>
                </div>
            `).join('');
        }
    }

    // Render Completed
    if (completedContainer) {
        completedContainer.innerHTML = collected.slice(0, 5).map(item => `
            <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-2 flex items-center justify-between text-xs">
                <div>
                    <h5 class="font-bold text-slate-700">${escapeHtml(item.title)}</h5>
                    <p class="text-slate-500">${item.estimated_meals} meals rescued by ${escapeHtml(item.claimed_by_org || 'Local Charity')}</p>
                </div>
                <span class="text-emerald-600 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-circle-check"></i> Rescued
                </span>
            </div>
        `).join('');
    }
}

// Step 3 in Journey: Donor confirms reservation readiness
async function confirmReservationReady(listingId) {
    try {
        const res = await fetch(`/api/listings/${listingId}/confirm_reservation`, {
            method: 'POST'
        });
        const result = await res.json();

        if (res.ok) {
            playChime('alert');
            showToast('Reservation Confirmed! ✅', result.message);
            await fetchListings();
            await fetchStats();
            await fetchNotifications();
            renderDonorDashboard();
        } else {
            alert(result.error || 'Failed to confirm reservation.');
        }
    } catch (e) {
        console.error('Error confirming reservation:', e);
        alert('Failed to confirm reservation.');
    }
}

// Step 4 in Journey: Business verifies recipient PIN & confirms handover
async function confirmFoodCollected(listingId) {
    const pinInput = document.getElementById(`verifyPinInput_${listingId}`);
    const pin = pinInput ? pinInput.value.trim() : '';

    try {
        const res = await fetch(`/api/listings/${listingId}/collect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const result = await res.json();

        if (res.ok) {
            triggerConfetti();
            playChime('success');
            showToast('Food Rescued! 🎉', `Handover verified. ${result.meals_saved} meals saved from waste!`);
            
            await fetchListings();
            await fetchStats();
            await fetchNotifications();
            renderDonorDashboard();
        } else {
            alert(result.error || 'Verification failed. Please check the PIN.');
        }
    } catch (e) {
        console.error('Error confirming handover:', e);
        alert('Failed to verify handover.');
    }
}

// Cancel a claim reservation
async function cancelClaimReservation(listingId) {
    if (!confirm('Cancel this reservation? The food will become available again for others.')) return;
    try {
        const res = await fetch(`/api/listings/${listingId}/cancel`, { method: 'POST' });
        if (res.ok) {
            showToast('Reservation Released', 'Surplus food batch made available again.');
            await fetchListings();
            await fetchStats();
            await fetchNotifications();
            renderRecipientDashboard();
        }
    } catch (e) {
        alert('Failed to cancel reservation.');
    }
}

// Open Post Food Modal
function openPostFoodModal() {
    // Set default deadline to 3 hours from now
    const now = new Date();
    const target = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    document.getElementById('postDeadline').value = target.toISOString().slice(0, 16);
    document.getElementById('postFoodModal').classList.remove('hidden');
}

// Handle Post Food Form Submission
async function handlePostFoodSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('postFoodForm');
    const formData = new FormData(form);

    const submitBtn = document.getElementById('postSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Publishing Alert...`;

    try {
        const res = await fetch('/api/listings', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();

        if (res.ok) {
            document.getElementById('postFoodModal').classList.add('hidden');
            form.reset();
            
            triggerConfetti();
            playChime('alert');
            showToast('Surplus Food Published! 🚀', 'Nearby charities have been alerted.');

            await fetchListings();
            await fetchStats();
            await fetchNotifications();
            renderDonorDashboard();
        } else {
            alert(result.error || 'Failed to post surplus food.');
        }
    } catch (err) {
        console.error('Error posting surplus food:', err);
        alert('An error occurred while publishing the listing.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane mr-2"></i> Post Listing & Alert Charities`;
    }
}

// Fetch & Render Stats
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        AppState.stats = data;
        renderHeroStats(data);
    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

function renderHeroStats(data) {
    animateCounter('statMealsSaved', data.total_meals_saved);
    animateCounter('statKgDiverted', data.total_kg_diverted);
    animateCounter('statCo2Prevented', data.co2_kg_prevented);
    animateCounter('statWaterSaved', data.water_liters_saved);
    animateCounter('statTotalListings', data.total_listings_shared || 50);

    // Cert stats
    const certMeals = document.getElementById('certMeals');
    if (certMeals) certMeals.innerText = `${data.total_meals_saved.toLocaleString()}+`;
    const certKg = document.getElementById('certKg');
    if (certKg) certKg.innerText = `${data.total_kg_diverted.toLocaleString()} kg`;
    const certCo2 = document.getElementById('certCo2');
    if (certCo2) certCo2.innerText = `${data.co2_kg_prevented.toLocaleString()} kg`;

    // Render Recent Activity Feed
    const activityFeed = document.getElementById('activityFeedList');
    if (activityFeed && data.recent_activities) {
        activityFeed.innerHTML = data.recent_activities.map(act => `
            <div class="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div class="w-8 h-8 rounded-full bg-${act.badge_color}-100 text-${act.badge_color}-600 flex items-center justify-center text-xs shrink-0">
                    <i class="fa-solid fa-${act.icon}"></i>
                </div>
                <div class="flex-1 text-xs">
                    <p class="font-medium text-slate-800">${escapeHtml(act.action_text)}</p>
                    <span class="text-[10px] text-slate-400">${act.created_at}</span>
                </div>
            </div>
        `).join('');
    }

    // Render Donor Leaderboard
    const donorLb = document.getElementById('donorLeaderboardList');
    if (donorLb && data.leaderboard_donors) {
        const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
        donorLb.innerHTML = data.leaderboard_donors.map((d, i) => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-500 w-5">${medals[i] || (i+1)+'.'}</span>
                    <div>
                        <strong class="text-slate-800">${escapeHtml(d.business_name)}</strong>
                        <span class="text-slate-400 block text-[10px]">${escapeHtml(d.business_type)}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-bold text-emerald-600">${d.total_meals} meals</span>
                    <span class="text-slate-400 block text-[10px]">${d.total_kg} kg saved</span>
                </div>
            </div>
        `).join('');
    }

    // Render Charity Leaderboard
    const charityLb = document.getElementById('charityLeaderboardList');
    if (charityLb && data.leaderboard_charities) {
        charityLb.innerHTML = data.leaderboard_charities.map((c, i) => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                <div>
                    <strong class="text-slate-800">${escapeHtml(c.name)}</strong>
                    <span class="text-slate-400 block text-[10px]">${escapeHtml(c.type)}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold text-blue-600">${c.rescued_meals} meals</span>
                    <span class="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-semibold">${c.impact_badge}</span>
                </div>
            </div>
        `).join('');
    }
}

// Chart.js Impact Charts
let categoryChartInstance = null;
let trendChartInstance = null;

function renderImpactCharts() {
    if (!AppState.stats) return;

    // Categories Donut Chart
    const catCanvas = document.getElementById('categoryImpactChart');
    if (catCanvas && window.Chart) {
        if (categoryChartInstance) categoryChartInstance.destroy();

        const labels = AppState.stats.categories.map(c => c.category);
        const meals = AppState.stats.categories.map(c => c.meals);

        categoryChartInstance = new Chart(catCanvas, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Cooked Meals', 'Bakery', 'Fresh Produce', 'Dairy', 'Pantry'],
                datasets: [{
                    data: meals.length ? meals : [40, 28, 55, 35, 70],
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                cutout: '65%'
            }
        });
    }

    // Diversion Trend Bar Chart
    const trendCanvas = document.getElementById('trendImpactChart');
    if (trendCanvas && window.Chart) {
        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(trendCanvas, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
                datasets: [{
                    label: 'Kg Food Rescued',
                    data: [65, 82, 110, 94, 135, 160, Math.round(AppState.stats.total_kg_diverted % 200 + 40)],
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// Notifications handling
async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        AppState.notifications = data;
        AppState.unreadCount = data.filter(n => !n.is_read).length;
        updateNotifBadge();
        renderNotificationDrawer();
    } catch (e) {
        console.error('Error fetching notifications:', e);
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (AppState.unreadCount > 0) {
        badge.innerText = AppState.unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotificationDrawer() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    if (AppState.notifications.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No notifications yet</div>`;
        return;
    }

    container.innerHTML = AppState.notifications.map(n => {
        let icon = 'bell';
        let bg = 'bg-slate-100 text-slate-600';
        if (n.type === 'new_listing') { icon = 'plus'; bg = 'bg-emerald-100 text-emerald-600'; }
        else if (n.type === 'urgent') { icon = 'fire'; bg = 'bg-rose-100 text-rose-600'; }
        else if (n.type === 'claimed') { icon = 'hand-holding-heart'; bg = 'bg-blue-100 text-blue-600'; }
        else if (n.type === 'confirmed') { icon = 'clipboard-check'; bg = 'bg-blue-100 text-blue-600'; }
        else if (n.type === 'collected') { icon = 'award'; bg = 'bg-amber-100 text-amber-600'; }

        return `
            <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start gap-3 text-xs">
                <div class="w-7 h-7 rounded-full ${bg} flex items-center justify-center shrink-0 text-xs">
                    <i class="fa-solid fa-${icon}"></i>
                </div>
                <div class="flex-1">
                    <h5 class="font-bold text-slate-800">${escapeHtml(n.title)}</h5>
                    <p class="text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(n.message)}</p>
                    <span class="text-[10px] text-slate-400 mt-1 block">${n.created_at}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Floating Toast Notification
function showToast(title, message) {
    const toast = document.getElementById('floatingToast');
    if (!toast) return;

    document.getElementById('toastTitle').innerText = title;
    document.getElementById('toastMessage').innerText = message;
    toast.classList.remove('hidden');
    toast.classList.add('toast-animate');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4500);
}

// Simulate urgent listing alert (judge demo button)
function simulateUrgentListing() {
    playChime('alert');
    const demoListing = {
        title: "Freshly Baked Artisanal Croissants & Focaccia",
        business: "Le Petit Paris Bakery",
        qty: "24 items",
        time: "1 hour"
    };

    showToast(
        "🚨 URGENT SURPLUS FOOD ALERT!",
        `${demoListing.business} posted ${demoListing.qty}! Collection deadline in ${demoListing.time}.`
    );

    // Add to notification list
    AppState.notifications.unshift({
        title: "🚨 Urgent Alert: Fresh Croissants & Focaccia",
        message: `${demoListing.business} has 24 items ready for immediate rescue (expires in 1h).`,
        type: "urgent",
        created_at: "Just now"
    });
    AppState.unreadCount++;
    updateNotifBadge();
    renderNotificationDrawer();
}

// Reset seed data
async function resetDemoData() {
    if (!confirm("Reset demo data and restore sample community listings?")) return;
    try {
        await fetch('/api/seed', { method: 'POST' });
        showToast('Demo Reset', 'Sample food listings and community data restored.');
        await fetchListings();
        await fetchStats();
        await fetchNotifications();
        if (AppState.role === 'donor') renderDonorDashboard();
        if (AppState.role === 'my-pickups') renderRecipientDashboard();
    } catch (e) {
        alert('Failed to reset data.');
    }
}

// Impact Certificate Modal
function openCertificateModal() {
    const modal = document.getElementById('certificateModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.getElementById('certDate').innerText = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Helper: Confetti explosion
function triggerConfetti() {
    if (window.confetti) {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Helper: Number Counter Animation
function animateCounter(elemId, targetVal) {
    const elem = document.getElementById(elemId);
    if (!elem) return;

    const startVal = 0;
    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(startVal + (targetVal - startVal) * progress);
        elem.innerText = current.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Periodic simulator: ping notifications every 30s
function setupRealtimeSimulators() {
    setInterval(() => {
        fetchNotifications();
    }, 30000);
}
