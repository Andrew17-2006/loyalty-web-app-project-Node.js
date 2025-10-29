let map;
let userMarker;
let storeMarkers = [];
let infoWindow;

// Тестові дані магазинів (потім замінити на API)
const testStores = [
  { id: 1, name: 'АТБ', lat: 50.4501, lng: 30.5234, category: 'food', cashback: 2, address: 'вул. Хрещатик, 1' },
  { id: 2, name: 'OKKO', lat: 50.4515, lng: 30.5245, category: 'fuel', cashback: 3, address: 'вул. Велика Васильківська, 10' },
  { id: 3, name: 'Rozetka', lat: 50.4490, lng: 30.5220, category: 'electronics', cashback: 1.5, address: 'вул. Шевченка, 5' },
  { id: 4, name: 'Сільпо', lat: 50.4505, lng: 30.5260, category: 'food', cashback: 2.5, address: 'вул. Саксаганського, 15' },
  { id: 5, name: 'Аптека 911', lat: 50.4485, lng: 30.5210, category: 'pharmacy', cashback: 1, address: 'вул. Горького, 8' }
];

// Ініціалізація карти
function initMap() {
  console.log('Initializing map...');
  
  // Київ за замовчуванням
  const defaultLocation = { lat: 50.4501, lng: 30.5234 };

  // Створити карту
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center: defaultLocation,
    styles: [
      {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [{ "color": "#242f3e" }]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#242f3e" }]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#746855" }]
      }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true
  });

  infoWindow = new google.maps.InfoWindow();

  // Визначити місцезнаходження користувача
  getUserLocation();

  // Додати магазини на карту
  addStoreMarkers(testStores);

  // Відобразити список магазинів
  displayStoresList(testStores);

  // Обробники подій
  setupEventListeners();
}

// Отримати місцезнаходження користувача
function getUserLocation() {
  const myLocationBtn = document.getElementById('myLocationBtn');

  if (navigator.geolocation) {
    myLocationBtn.addEventListener('click', () => {
      myLocationBtn.textContent = '⏳ Визначення...';
      myLocationBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Центрувати карту
          map.setCenter(userPos);
          map.setZoom(15);

          // Додати або оновити маркер користувача
          if (userMarker) {
            userMarker.setPosition(userPos);
          } else {
            userMarker = new google.maps.Marker({
              position: userPos,
              map: map,
              title: 'Ви тут',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3
              }
            });
          }

          myLocationBtn.textContent = '📍 Моє місцезнаходження';
          myLocationBtn.disabled = false;

          // Відсортувати магазини за відстанню
          const sortedStores = calculateDistances(testStores, userPos);
          displayStoresList(sortedStores);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Не вдалося визначити ваше місцезнаходження. Перевірте дозволи браузера.');
          myLocationBtn.textContent = '📍 Моє місцезнаходження';
          myLocationBtn.disabled = false;
        }
      );
    });
  } else {
    alert('Геолокація не підтримується вашим браузером');
  }
}

// Додати маркери магазинів
function addStoreMarkers(stores) {
  // Очистити попередні маркери
  storeMarkers.forEach(marker => marker.setMap(null));
  storeMarkers = [];

  stores.forEach(store => {
    const marker = new google.maps.Marker({
      position: { lat: store.lat, lng: store.lng },
      map: map,
      title: store.name,
      icon: {
        url: getMarkerIcon(store.category),
        scaledSize: new google.maps.Size(40, 40)
      }
    });

    marker.addListener('click', () => {
      showStoreInfo(store, marker);
    });

    storeMarkers.push(marker);
  });
}

// Отримати іконку маркера за категорією
function getMarkerIcon(category) {
  const icons = {
    food: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%2316a34a" stroke="white" stroke-width="2"/><text x="20" y="26" font-size="20" text-anchor="middle" fill="white">🛒</text></svg>'),
    fuel: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23ea580c" stroke="white" stroke-width="2"/><text x="20" y="26" font-size="20" text-anchor="middle" fill="white">⛽</text></svg>'),
    electronics: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%232563eb" stroke="white" stroke-width="2"/><text x="20" y="26" font-size="20" text-anchor="middle" fill="white">💻</text></svg>'),
    pharmacy: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23dc2626" stroke="white" stroke-width="2"/><text x="20" y="26" font-size="20" text-anchor="middle" fill="white">💊</text></svg>'),
    clothes: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%239333ea" stroke="white" stroke-width="2"/><text x="20" y="26" font-size="20" text-anchor="middle" fill="white">👕</text></svg>')
  };
  return icons[category] || icons.food;
}

// Показати інформацію про магазин
function showStoreInfo(store, marker) {
  const content = `
    <div style="padding: 10px; font-family: 'Orbitron', sans-serif;">
      <h3 style="margin: 0 0 10px 0; color: #1e293b;">${store.name}</h3>
      <p style="margin: 5px 0;"><strong>Адреса:</strong> ${store.address}</p>
      <p style="margin: 5px 0;"><strong>Cashback:</strong> <span style="color: #16a34a;">${store.cashback}%</span></p>
      <button onclick="openDirections(${store.lat}, ${store.lng})" 
        style="margin-top: 10px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Orbitron', sans-serif;">
        🗺️ Побудувати маршрут
      </button>
    </div>
  `;
  infoWindow.setContent(content);
  infoWindow.open(map, marker);
}

// Відкрити маршрут в Google Maps
function openDirections(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
}

// Розрахувати відстані
function calculateDistances(stores, userPos) {
  return stores.map(store => {
    const distance = getDistance(userPos.lat, userPos.lng, store.lat, store.lng);
    return { ...store, distance };
  }).sort((a, b) => a.distance - b.distance);
}

// Обчислити відстань (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Відобразити список магазинів
function displayStoresList(stores) {
  const storesList = document.getElementById('storesList');
  storesList.innerHTML = stores.map(store => `
    <div class="store-item" onclick="focusStore(${store.lat}, ${store.lng})">
      <h4>${store.name}</h4>
      <p>${store.address}</p>
      <p class="cashback">💰 ${store.cashback}% cashback</p>
      ${store.distance ? `<p class="distance">📍 ${store.distance.toFixed(1)} км</p>` : ''}
    </div>
  `).join('');
}

// Фокус на магазині
function focusStore(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(16);
}

// Налаштувати обробники подій
function setupEventListeners() {
  // Пошук
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value;
    if (query) {
      searchStores(query);
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });

  // Фільтри
  const filterCheckboxes = document.querySelectorAll('.filters input[type="checkbox"]');
  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      filterStores();
    });
  });
}

// Пошук магазинів
function searchStores(query) {
  const filtered = testStores.filter(store => 
    store.name.toLowerCase().includes(query.toLowerCase()) ||
    store.address.toLowerCase().includes(query.toLowerCase())
  );
  addStoreMarkers(filtered);
  displayStoresList(filtered);
}

// Фільтрація магазинів
function filterStores() {
  const checkboxes = document.querySelectorAll('.filters input[type="checkbox"]:checked');
  const categories = Array.from(checkboxes).map(cb => cb.value);
  
  if (categories.includes('all') || categories.length === 0) {
    addStoreMarkers(testStores);
    displayStoresList(testStores);
  } else {
    const filtered = testStores.filter(store => categories.includes(store.category));
    addStoreMarkers(filtered);
    displayStoresList(filtered);
  }
}

// Зробити функцію глобальною для onclick
window.openDirections = openDirections;
window.focusStore = focusStore;