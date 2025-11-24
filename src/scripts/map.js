let map;
let infoWindow;
let userMarker;

// == LOAD USER CARDS ==
async function loadUserCards() {
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
}

// == GOOGLE PLACES SEARCH ==
function searchStoreLocation(name) {
  return new Promise(resolve => {
    const service = new google.maps.places.PlacesService(map);

    const request = {
      query: `${name} Kyiv`,
      fields: ["name", "geometry", "formatted_address"]
    };

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results.length) {
        resolve(results[0]);
      } else {
        resolve(null);
      }
    });
  });
}

// == SHOW MARKER ==
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

// == ROUTE ==
function openRoute(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

// == LIST ==
function renderList(items) {
  const list = document.getElementById("storesList");
  list.innerHTML = items
    .map(
      item => `
      <div class="store-item" onclick="focusPoint(${item.lat}, ${item.lng})">
        <h4>${item.name}</h4>
        <p>${item.address}</p>
      </div>
    `
    )
    .join("");
}

function focusPoint(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(16);
}

// == INIT ==
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
  const foundStores = [];

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

  document.getElementById("myLocationBtn").onclick = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
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
              strokeColor: "#ffffff",
              strokeWeight: 3
            }
          });
        } else {
          userMarker.setPosition(userPos);
        }

        map.setCenter(userPos);
        map.setZoom(15);
      },
      err => alert("Не вдалося визначити місцезнаходження.")
    );
  };

  document.getElementById("searchBtn").onclick = async () => {
    const q = document.getElementById("searchInput").value;
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
