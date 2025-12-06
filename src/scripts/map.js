let map;
let infoWindow;
let userMarker;
let foundStores = [];

// Дозволяємо Google викликати initMap()
window.initMap = initMap;

// =========================
//      Haversine
// =========================
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

// =========================
//   LOAD USER CARDS
// =========================
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

// =========================
//   NEW GOOGLE PLACES API
// =========================
async function searchStoreLocation(name) {
  try {
    const { Place } = await google.maps.importLibrary("places");

    const request = {
      textQuery: `${name} Kyiv`,
      fields: ["displayName", "formattedAddress", "location"]
    };

    const { places } = await Place.searchByText(request);

    return places?.length ? places[0] : null;

  } catch (e) {
    console.error("Search error:", e);
    return null;
  }
}

// =========================
//   SHOW MARKER
// =========================
function showMarker(place, card) {
  const marker = new google.maps.Marker({
    position: place.location,
    map,
    title: place.displayName
  });

  const html = `
    <div style="font-family:Orbitron;padding:5px;">
      <h3>${card.card_name}</h3>
      <p><b>Магазин:</b> ${place.displayName}</p>
      <p><b>Адреса:</b> ${place.formattedAddress}</p>
      <button onclick="openRoute(${place.location.lat()}, ${place.location.lng()})">
        📍 Маршрут
      </button>
    </div>
  `;

  marker.addListener("click", () => {
    infoWindow.setContent(html);
    infoWindow.open(map, marker);
  });
}

// =========================
//   RENDER LIST
// =========================
function renderList(items) {
  const list = document.getElementById("storesList");

  if (!items.length) {
    list.innerHTML = `<p class="loading-text">Нічого не знайдено</p>`;
    return;
  }

  list.innerHTML = items.map(i => `
    <div class="store-item" onclick="focusPoint(${i.lat}, ${i.lng})">
      <h4>${i.name}</h4>
      <p>${i.address}</p>
      ${i.distance ? `<p style="color:#00d8ff">📍 ${i.distance.toFixed(1)} км</p>` : ""}
    </div>
  `).join("");
}

// =========================
//   ROUTES + FOCUS
// =========================
function openRoute(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

function focusPoint(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(16);
}

window.openRoute = openRoute;
window.focusPoint = focusPoint;

// =========================
//        INIT MAP
// =========================
async function initMap() {
  console.log("🗺 initMap START");

  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 50.45, lng: 30.523 },
    zoom: 13,
    disableDefaultUI: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0f0f1a" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#eaeaea" }] },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#16213e" }]
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#c9d6df" }]
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#0f3460" }]
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#a7c5eb" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#533483" }]
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#dcd6f7" }]
      }
    ]
  });

  infoWindow = new google.maps.InfoWindow();

  // Load stores
  const cards = await loadUserCards();
  foundStores = [];

  for (const card of cards) {
    if (card.store === "Інший") continue;

    const place = await searchStoreLocation(card.store);
    if (!place) continue;

    showMarker(place, card);

    foundStores.push({
      name: place.displayName,
      address: place.formattedAddress,
      lat: place.location.lat(),
      lng: place.location.lng()
    });
  }

  renderList(foundStores);

  // =========================
  //   LOCATION BUTTON
  // =========================
  document.getElementById("myLocationBtn").onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };

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
      } else {
        userMarker.setPosition(userPos);
      }

      map.setCenter(userPos);
      map.setZoom(15);

      // Сортуємо магазини за відстанню
      foundStores.forEach(store => {
        store.distance = distance(
          userPos.lat,
          userPos.lng,
          store.lat,
          store.lng
        );
      });

      foundStores.sort((a, b) => a.distance - b.distance);
      renderList(foundStores);
    });
  };
}
