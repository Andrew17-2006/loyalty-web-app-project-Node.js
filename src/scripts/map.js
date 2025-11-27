let map;
let infoWindow;
let userMarker;
let foundStores = [];

// --- DISTANCE (Haversine) ---
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- LOAD USER CARDS ---
async function loadUserCards() {
  try {
    const resp = await fetch(`${API_URL}/api/loyalty-cards`, {
      credentials: "include"
    });

    const data = await resp.json();
    if (!data.success) return [];

    return data.cards.map(card => ({
      id: card.id,
      store: card.store_name,
      card_name: card.card_name
    }));

  } catch (e) {
    console.log("Load cards error:", e);
    return [];
  }
}

// --- SEARCH STORE ---
function searchStoreLocation(name) {
  return new Promise(resolve => {
    const service = new google.maps.places.PlacesService(map);

    service.textSearch(
      {
        query: `${name} Kyiv`,
        fields: ["name", "geometry", "formatted_address"]
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length)
          resolve(results[0]);
        else resolve(null);
      }
    );
  });
}

// --- SHOW MARKER ---
function showMarker(place, originalCard) {
  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map,
    title: place.name
  });

  const html = `
    <div style="font-family:Orbitron;padding:5px;">
      <h3>${originalCard.card_name}</h3>
      <p><b>Магазин:</b> ${place.name}</p>
      <p><b>Адреса:</b> ${place.formatted_address}</p>
      <button onclick="openRoute(${place.geometry.location.lat()}, ${place.geometry.location.lng()})">
        📍 Маршрут
      </button>
    </div>
  `;

  marker.addListener("click", () => {
    infoWindow.setContent(html);
    infoWindow.open(map, marker);
  });

  return marker;
}

// --- RENDER LIST ---
function renderList(items) {
  const list = document.getElementById("storesList");

  if (!items.length) {
    list.innerHTML = `<p class="loading-text">Нічого не знайдено</p>`;
    return;
  }

  list.innerHTML = items
    .map(
      item => `
      <div class="store-item" onclick="focusPoint(${item.lat}, ${item.lng})">
        <h4>${item.name}</h4>
        <p>${item.address}</p>
        ${item.distance ? `<p style="color:#00d8ff">📍 ${item.distance.toFixed(1)} км</p>` : ""}
      </div>`
    )
    .join("");
}

// --- FOCUS ON POINT ---
function focusPoint(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(16);
}

// --- ROUTE ---
function openRoute(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

// --- INIT MAP ---
async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 50.45, lng: 30.523 },
    zoom: 13,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#e5e7eb" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] }
    ]
  });

  infoWindow = new google.maps.InfoWindow();

  const cards = await loadUserCards();
  foundStores = [];

  for (const card of cards) {
    if (card.store === "Інший") continue;
    const place = await searchStoreLocation(card.store);
    if (!place) continue;

    showMarker(place, card);

    foundStores.push({
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    });
  }

  renderList(foundStores);

  // --- LOCATION BUTTON ---
  document.getElementById("myLocationBtn").onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const userPos = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      if (!userMarker) {
        userMarker = new google.maps.Marker({
          position: userPos,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#00d8ff",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3
          }
        });
      } else userMarker.setPosition(userPos);

      map.setCenter(userPos);
      map.setZoom(15);

      // SORT BY DISTANCE
      foundStores.forEach(store => {
        store.distance = distance(
          userPos.lat, userPos.lng,
          store.lat, store.lng
        );
      });

      foundStores.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      renderList(foundStores);
    });
  };

  // --- SEARCH BUTTON ---
  document.getElementById("searchBtn").onclick = async () => {
    const q = document.getElementById("searchInput").value.trim();
    if (!q) return;

    const place = await searchStoreLocation(q);
    if (!place) return alert("Нічого не знайдено");

    showMarker(place, { card_name: q });
    map.setCenter(place.geometry.location);
    map.setZoom(15);
  };
}

window.initMap = initMap;
window.focusPoint = focusPoint;
window.openRoute = openRoute;

// ======= Fallback if Google API not loaded correctly(reconnecting) =======
window.addEventListener("load", () => {
  if (typeof google === "undefined" || !google.maps) {
    console.warn("Google API не встиг — повторна ініціалізація...");

    setTimeout(() => {
      if (typeof initMap === "function") {
        console.log("🔁 Повторний запуск initMap()");
        initMap();
      }
    }, 500);
  }
});
