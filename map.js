// Mappa Leaflet — luoghi guida Cork
const CATEGORY_META = {
  culture: { label: 'Cultura', color: '#588157', emoji: '🏛️' },
  food: { label: 'Ristoranti', color: '#D97757', emoji: '🍽️' },
  nightlife: { label: 'Pub', color: '#344E41', emoji: '🍻' },
  shopping: { label: 'Shopping', color: '#7A8B5E', emoji: '🛍️' },
  excursions: { label: 'Gite', color: '#3B6EA8', emoji: '🚂' }
};

let mapInstance = null;
let markersLayer = null;
let mapFilters = new Set(Object.keys(CATEGORY_META));

function emojiIcon(emoji, color, planned) {
  const border = planned ? '#E67E22' : color;
  const size = planned ? 38 : 34;
  return L.divIcon({
    className: 'map-pin-custom',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${planned ? '#FFF3E0' : '#fff'};
      border:3px solid ${border};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.2);
    "><span style="transform:rotate(45deg);font-size:${planned ? 16 : 14}px">${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4]
  });
}

function renderMapFilters(container, onChange) {
  if (!container) return;
  container.innerHTML = Object.entries(CATEGORY_META).map(([id, m]) => `
    <button type="button" data-map-cat="${id}" class="map-filter-btn active px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
      style="border-color:${m.color};color:${m.color};background:${m.color}18">
      ${m.emoji} ${m.label}
    </button>
  `).join('') + `
    <button type="button" id="map-filter-all" class="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-gray-300 text-gray-600">Tutti</button>
  `;

  container.querySelectorAll('[data-map-cat]').forEach(btn => {
    btn.onclick = () => {
      const cat = btn.dataset.mapCat;
      if (mapFilters.has(cat)) {
        mapFilters.delete(cat);
        btn.classList.remove('active');
        btn.style.background = 'transparent';
      } else {
        mapFilters.add(cat);
        btn.classList.add('active');
        btn.style.background = `${CATEGORY_META[cat].color}18`;
      }
      onChange();
    };
  });
  document.getElementById('map-filter-all')?.addEventListener('click', () => {
    mapFilters = new Set(Object.keys(CATEGORY_META));
    container.querySelectorAll('[data-map-cat]').forEach(btn => {
      btn.classList.add('active');
      btn.style.background = `${CATEGORY_META[btn.dataset.mapCat].color}18`;
    });
    onChange();
  });
}

function initCorkMap(places, options = {}) {
  const el = document.getElementById('cork-map');
  if (!el || typeof L === 'undefined') return;

  const plannedIds = new Set(
    (options.plans || []).map(p => p.placeId).filter(Boolean)
  );

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markersLayer = null;
  }

  mapInstance = L.map('cork-map', { scrollWheelZoom: true }).setView([51.8985, -8.4756], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
  const bounds = [];
  let shown = 0;

  places.filter(p => p.lat != null && p.lng != null && mapFilters.has(p.category)).forEach(place => {
    const meta = CATEGORY_META[place.category] || { color: '#588157', emoji: '📍' };
    const planned = plannedIds.has(place.id);
    const marker = L.marker([place.lat, place.lng], {
      icon: emojiIcon(place.icon || meta.emoji, meta.color, planned)
    });

    const popup = `
      <div class="map-popup" style="min-width:180px;font-family:Nunito,sans-serif">
        <div style="font-weight:700;color:#344E41;margin-bottom:4px">${place.icon || ''} ${place.title}</div>
        <div style="font-size:11px;color:#588157;margin-bottom:6px">${meta.label}${planned ? ' · 📌 In planner' : ''}</div>
        <p style="font-size:12px;color:#555;margin:0 0 8px;line-height:1.4">${(place.desc || '').slice(0, 120)}${place.desc?.length > 120 ? '…' : ''}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${place.url ? `<a href="${place.url}" target="_blank" rel="noopener" style="font-size:11px;font-weight:600;color:#588157">Sito ↗</a>` : ''}
          <button type="button" data-map-plan="${place.id}" style="font-size:11px;font-weight:600;color:#fff;background:#344E41;border:none;padding:4px 10px;border-radius:999px;cursor:pointer">+ Planner</button>
        </div>
      </div>
    `;
    marker.bindPopup(popup);
    marker.on('popupopen', () => {
      document.querySelector(`[data-map-plan="${place.id}"]`)?.addEventListener('click', () => {
        options.onAddToPlanner?.(place);
        mapInstance.closePopup();
      });
    });
    markersLayer.addLayer(marker);
    bounds.push([place.lat, place.lng]);
    shown++;
  });

  const countEl = document.getElementById('map-count');
  if (countEl) countEl.textContent = `${shown} luoghi sulla mappa`;

  if (bounds.length > 1) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: options.fitZoom || 14 });
  } else if (bounds.length === 1) {
    mapInstance.setView(bounds[0], 15);
  }

  setTimeout(() => mapInstance?.invalidateSize(), 200);
}

function destroyCorkMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markersLayer = null;
  }
}

window.CorkMap = {
  CATEGORY_META,
  renderMapFilters,
  initCorkMap,
  destroyCorkMap,
  get mapFilters() { return mapFilters; },
  setMapFilters(cats) { mapFilters = new Set(cats); }
};
