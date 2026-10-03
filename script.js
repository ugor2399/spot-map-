// ============================================================
// КОНСТАНТЫ
// ============================================================
const DEV_PASSWORD = 'MAMAS';

// Список городов (для сортировки в панели)
const KNOWN_CITIES = [
    "Волжский",
    "Москва",
    "Санкт-Петербург",
    "Казань",
    "Сочи"
];

// Иконки городов
const CITY_ICONS = {
    'Волжский': '🏙️',
    'Москва': '🏛️',
    'Санкт-Петербург': '🌉',
    'Казань': '🕌',
    'Сочи': '🌴',
    'Другой': '📍'
};

// ============================================================
// ПОСТОЯННЫЕ МЕСТА (прописаны в коде — не пропадают)
// ============================================================
const PERMANENT_PLACES = [
    // ============ ВОЛЖСКИЙ ============
    {
        city: "Волжский",
        name: "Спот на БирМастер",
        description: "Спот в стили КК, можно залезть на крышу с боку здания. Могут быстро прогнать.",
        coords: [48.7850, 44.7828],
        photos: [
            "images/BirMaster1.jpg",
            "images/BirMaster2.jpg",
            "images/BirMaster3.jpg"
        ]
    },
    {
        city: "Волжский",
        name: "Квадрат",
        description: "Квадрат менул перед дом с гисомом",
        coords: [48.7736, 44.8010],
        photos: [
            "images/Kvadrat1.jpg",
            "images/Kvadrat2.jpg"
        ]
    },
    {
        city: "Волжский",
        name: "Спот на 10 ступенях",
        description: "Классический волжский спот — лестница из 10 ступеней. Отличное место для трюков.",
        coords: [48.77724, 44.79851],
        photos: [
            "images/tenStairs1.jpg",
            "images/tenStairs2.jpg",
            "images/tenStairs3.jpg"
        ]
    },
    {
        city: "Москва",
        name: "Красная площадь",
        description: "Главная площадь Москвы. Красивое место, но много полиции — будь осторожен.",
        coords: [55.7539, 37.6208],
        photos: []
    },
    {
        city: "Москва",
        name: "Парк Горького",
        description: "Большой парк с фонтанами и удобными спотами для катания.",
        coords: [55.7300, 37.6010],
        photos: []
    }
];

// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let myMap;
let placesData = [];
let selectedCoords = null;
let currentPhotos = [];
let editingPhotos = [];
let deleteMode = false;
let editMode = false;
let editingPlaceId = null;
let selectedForDelete = new Set();
let isDevUnlocked = false;

let currentSpot = null;
let currentPhotoIndex = 0;
let lightboxIndex = 0;

// DOM-элементы
const placesListEl = document.getElementById('places-list');
const modal = document.getElementById('placeModal');
const editModal = document.getElementById('editModal');
const passwordModal = document.getElementById('passwordModal');
const spotModal = document.getElementById('spotModal');
const devPanel = document.getElementById('dev-panel');
const devToggleBtn = document.getElementById('dev-toggle-btn');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const placeNameInput = document.getElementById('placeName');
const placeDescInput = document.getElementById('placeDesc');
const placeCitySelect = document.getElementById('placeCity');
const photoInput = document.getElementById('photoInput');
const photosPreview = document.getElementById('photosPreview');
const editNameInput = document.getElementById('editPlaceName');
const editDescInput = document.getElementById('editPlaceDesc');
const editCitySelect = document.getElementById('editPlaceCity');
const editPhotoInput = document.getElementById('editPhotoInput');
const editPhotosPreview = document.getElementById('editPhotosPreview');

// Сайдбар
const sidebar = document.getElementById('sidebar');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');

// ============================================================
// ИНИЦИАЛИЗАЦИЯ КАРТЫ
// ============================================================
ymaps.ready(init);
function init() {
    myMap = new ymaps.Map('map', {
        center: [58.0, 60.0],
        zoom: 4,
        controls: ['zoomControl', 'fullscreenControl']
    });

    myMap.events.add('click', function(e) {
        if (deleteMode || editMode) {
            alert('Выйди из режима редактирования');
            return;
        }
        selectedCoords = e.get('coords');
        openModal();
    });

    loadPermanentPlaces();
    loadFromStorage();

    // Загрузка фото при создании
    photoInput.addEventListener('change', function(e) {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                currentPhotos.push(ev.target.result);
                renderPhotosPreview();
            };
            reader.readAsDataURL(file);
        });
        photoInput.value = '';
    });

    // Загрузка фото при редактировании
    editPhotoInput.addEventListener('change', function(e) {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                editingPhotos.push(ev.target.result);
                renderEditPhotosPreview();
            };
            reader.readAsDataURL(file);
        });
        editPhotoInput.value = '';
    });

    // Кнопка DEV
    devToggleBtn.addEventListener('click', function() {
        if (isDevUnlocked) {
            devPanel.classList.toggle('active');
            if (!devPanel.classList.contains('active')) {
                exitDeleteMode();
                exitEditMode();
            }
        } else {
            openPasswordModal();
        }
    });

    // Enter в поле пароля
    passwordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') checkPassword();
    });

    // Закрыть панель разработчика
    document.getElementById('dev-close-btn').addEventListener('click', () => {
        devPanel.classList.remove('active');
        exitDeleteMode();
        exitEditMode();
    });

    // Кнопка "Удалить" в панели
    document.getElementById('dev-delete-btn').addEventListener('click', () => {
        if (!isDevUnlocked) return;
        if (editMode) exitEditMode();
        deleteMode = !deleteMode;
        if (deleteMode) {
            selectedForDelete.clear();
            alert('🔴 Режим удаления ВКЛЮЧЁН.\nКликай по спотам в списке, чтобы отметить.');
        } else if (selectedForDelete.size > 0) {
            confirmDeleteSelected();
        }
        renderPlacesList();
    });

    // Кнопка "Редактировать" в панели
    document.getElementById('dev-edit-btn').addEventListener('click', () => {
        if (!isDevUnlocked) return;
        if (deleteMode) exitDeleteMode();
        editMode = !editMode;
        alert(editMode ? '✏️ Режим редактирования ВКЛЮЧЁН.' : 'Режим редактирования ВЫКЛЮЧЕН');
        renderPlacesList();
    });

    // Кнопка "Очистить всё"
    document.getElementById('dev-clear-btn').addEventListener('click', () => {
        if (!isDevUnlocked) return;
        const userCount = placesData.filter(p => !p.permanent).length;
        if (userCount === 0) {
            alert('Нет пользовательских мест.');
            return;
        }
        if (confirm(`Удалить ВСЕ ${userCount} пользовательских мест?`)) {
            placesData = placesData.filter(p => p.permanent);
            myMap.geoObjects.removeAll();
            placesData.forEach(p => createPlacemark(p));
            renderPlacesList();
            saveToStorage();
        }
    });

    // Закрытие большого окна по клику на фон
    spotModal.addEventListener('click', e => {
        if (e.target === spotModal) closeSpotModal();
    });

    // ============================================================
    // УПРАВЛЕНИЕ САЙДБАРОМ НА ТЕЛЕФОНЕ
    // ============================================================
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            }
        });
    }

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('hidden');
            }
        });
    }

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('hidden');
        }
    });
}

// ============================================================
// ПРЕВЬЮ ФОТО
// ============================================================
function renderPhotosPreview() {
    photosPreview.innerHTML = '';
    currentPhotos.forEach((photo, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        thumb.innerHTML = `<img src="${photo}"><button class="remove-photo" data-index="${index}">×</button>`;
        thumb.querySelector('.remove-photo').addEventListener('click', e => {
            e.stopPropagation();
            currentPhotos.splice(index, 1);
            renderPhotosPreview();
        });
        photosPreview.appendChild(thumb);
    });
}

function renderEditPhotosPreview() {
    editPhotosPreview.innerHTML = '';
    editingPhotos.forEach((photo, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        thumb.innerHTML = `<img src="${photo}"><button class="remove-photo" data-index="${index}">×</button>`;
        thumb.querySelector('.remove-photo').addEventListener('click', e => {
            e.stopPropagation();
            editingPhotos.splice(index, 1);
            renderEditPhotosPreview();
        });
        editPhotosPreview.appendChild(thumb);
    });
}

// ============================================================
// ПАРОЛЬ
// ============================================================
function openPasswordModal() {
    passwordInput.value = '';
    passwordError.classList.remove('show');
    passwordModal.classList.add('active');
    setTimeout(() => passwordInput.focus(), 100);
}

function closePasswordModal() {
    passwordModal.classList.remove('active');
    passwordError.classList.remove('show');
}

function checkPassword() {
    if (passwordInput.value.trim() === DEV_PASSWORD) {
        isDevUnlocked = true;
        closePasswordModal();
        devPanel.classList.add('active');
        alert('🔓 Панель разблокирована!');
    } else {
        passwordError.classList.add('show');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// ============================================================
// ЗАГРУЗКА ПОСТОЯННЫХ МЕСТ
// ============================================================
function loadPermanentPlaces() {
    PERMANENT_PLACES.forEach(data => {
        const exists = placesData.some(p =>
            p.coords[0] === data.coords[0] && p.coords[1] === data.coords[1]
        );
        if (!exists) {
            const place = {
                id: Date.now() + Math.random() * 1000,
                city: data.city || 'Другой',
                name: data.name,
                description: data.description || 'Без описания',
                coords: data.coords,
                photos: data.photos || [],
                _placemark: null,
                permanent: true
            };
            placesData.push(place);
            createPlacemark(place);
        }
    });
    renderPlacesList();
}

// ============================================================
// МОДАЛКИ
// ============================================================
function openModal() {
    placeNameInput.value = '';
    placeDescInput.value = '';
    photoInput.value = '';
    currentPhotos = [];
    photosPreview.innerHTML = '';
    placeCitySelect.value = 'Волжский';
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    selectedCoords = null;
}

function closeEditModal() {
    editModal.classList.remove('active');
    editingPlaceId = null;
    editingPhotos = [];
    editPhotosPreview.innerHTML = '';
    exitEditMode();
}

// ============================================================
// СОХРАНЕНИЕ МЕСТА
// ============================================================
function savePlace() {
    const name = placeNameInput.value.trim();
    if (!name) {
        alert('Введите название');
        return;
    }
    if (!selectedCoords) {
        alert('Кликните по карте');
        return;
    }

    const newPlace = {
        id: Date.now(),
        city: placeCitySelect.value,
        name: name,
        description: placeDescInput.value.trim() || 'Без описания',
        coords: selectedCoords,
        photos: currentPhotos.slice(),
        permanent: false
    };

    placesData.push(newPlace);
    createPlacemark(newPlace);
    renderPlacesList();
    saveToStorage();
    closeModal();
}

// ============================================================
// СОЗДАНИЕ МЕТКИ С ПРЕВЬЮ
// ============================================================
function createPlacemark(place) {
    const previewPhoto = place.photos && place.photos.length > 0
        ? `<img class="preview-photo" src="${place.photos[0]}">`
        : `<div class="no-photo">📷</div>`;

    const photoCountText = place.photos && place.photos.length > 1
        ? ` · 📷 ${place.photos.length} фото`
        : '';

    const balloonHtml = `
        <div class="place-preview">
            ${previewPhoto}
            <div class="city-tag">🏙️ ${place.city || 'Другой'}</div>
            <h2>${place.name}</h2>
            <div class="desc">${place.description}</div>
            <div class="coords-line">
                📍 ${place.coords[0].toFixed(5)}, ${place.coords[1].toFixed(5)}${photoCountText}
            </div>
            <button class="btn-more" onclick="openSpotModal(${place.id})">
                📖 Подробнее
            </button>
        </div>
    `;

    const placemark = new ymaps.Placemark(place.coords, {
        balloonContent: balloonHtml,
        hintContent: `${place.city || ''}: ${place.name}`
    }, {
        preset: place.permanent ? 'islands#greenDotIconWithCaption' : 'islands#redDotIconWithCaption',
        iconCaption: place.name,
        balloonMaxWidth: 320
    });

    myMap.geoObjects.add(placemark);
    place._placemark = placemark;
}

// ============================================================
// БОЛЬШОЕ ОКНО СПОТА
// ============================================================
window.openSpotModal = function(placeId) {
    const place = placesData.find(p => p.id === placeId);
    if (!place) return;

    currentSpot = place;
    currentPhotoIndex = 0;

    document.getElementById('spotTitle').textContent = place.name;

    const gallery = document.getElementById('spotGallery');
    if (place.photos && place.photos.length > 0) {
        gallery.innerHTML = `
            <img id="spotMainImg" src="${place.photos[0]}" onclick="openLightbox(${currentPhotoIndex})">
            ${place.photos.length > 1 ? `
                <button class="nav-btn nav-prev" onclick="spotNav(-1)">‹</button>
                <button class="nav-btn nav-next" onclick="spotNav(1)">›</button>
                <div class="counter"><span id="spotCounter">1</span> / ${place.photos.length}</div>
            ` : ''}
        `;
    } else {
        gallery.innerHTML = `<div class="no-photo-big">📷</div>`;
    }

    const info = document.getElementById('spotInfo');
    const photosCount = place.photos ? place.photos.length : 0;
    info.innerHTML = `
        <h3>🏙️ ${place.city || 'Другой'}</h3>
        <div class="info-row">
            <strong>📝 Описание:</strong><br>
            <div class="full-desc">${place.description}</div>
        </div>
        <div class="info-row">
            <strong>📍 Координаты:</strong><br>
            ${place.coords[0].toFixed(6)}, ${place.coords[1].toFixed(6)}
        </div>
        ${photosCount > 0 ? `
        <div class="info-row">
            <strong>📷 Фотографий:</strong> ${photosCount}
        </div>
        ` : ''}
        ${place.permanent ? `
        <div class="info-row" style="color:#27ae60;">
            🔒 Постоянное место
        </div>
        ` : ''}
    `;

    spotModal.classList.add('active');
};

window.closeSpotModal = function() {
    spotModal.classList.remove('active');
    currentSpot = null;
    currentPhotoIndex = 0;
};

window.spotNav = function(direction) {
    if (!currentSpot || !currentSpot.photos || currentSpot.photos.length < 2) return;
    currentPhotoIndex = (currentPhotoIndex + direction + currentSpot.photos.length) % currentSpot.photos.length;
    const img = document.getElementById('spotMainImg');
    if (img) img.src = currentSpot.photos[currentPhotoIndex];
    const counter = document.getElementById('spotCounter');
    if (counter) counter.textContent = currentPhotoIndex + 1;
};

// ============================================================
// ЛАЙТБОКС
// ============================================================
window.openLightbox = function(index) {
    if (!currentSpot || !currentSpot.photos || currentSpot.photos.length === 0) return;
    lightboxIndex = index;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
};

window.closeLightbox = function() {
    document.getElementById('lightbox').classList.remove('active');
};

window.lightboxNav = function(direction) {
    if (!currentSpot || !currentSpot.photos) return;
    lightboxIndex = (lightboxIndex + direction + currentSpot.photos.length) % currentSpot.photos.length;
    updateLightbox();
};

function updateLightbox() {
    const img = document.getElementById('lightboxImg');
    img.src = currentSpot.photos[lightboxIndex];
    img.style.transform = 'scale(1)';
    document.getElementById('lightboxCounter').textContent =
        (lightboxIndex + 1) + ' / ' + currentSpot.photos.length;
}

document.getElementById('lightboxImg').addEventListener('click', function() {
    const currentScale = this.style.transform.includes('scale(2)') ? 2 : 1;
    this.style.transform = currentScale === 2 ? 'scale(1)' : 'scale(2)';
});

// Клавиатура
document.addEventListener('keydown', function(e) {
    if (document.getElementById('lightbox').classList.contains('active')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxNav(-1);
        if (e.key === 'ArrowRight') lightboxNav(1);
        return;
    }
    if (spotModal.classList.contains('active')) {
        if (e.key === 'Escape') closeSpotModal();
        if (e.key === 'ArrowLeft') spotNav(-1);
        if (e.key === 'ArrowRight') spotNav(1);
    }
});

// ============================================================
// СПИСОК С ГОРОДАМИ И СПОТАМИ
// ============================================================
function renderPlacesList() {
    placesListEl.innerHTML = '';

    if (placesData.length === 0 && KNOWN_CITIES.length === 0) {
        placesListEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Пока нет мест.</div>';
        return;
    }

    const grouped = {};
    KNOWN_CITIES.forEach(city => {
        grouped[city] = [];
    });
    placesData.forEach(place => {
        const city = place.city || 'Другой';
        if (!grouped[city]) grouped[city] = [];
        grouped[city].push(place);
    });

    const cityKeys = Object.keys(grouped).sort((a, b) => {
        const ia = KNOWN_CITIES.indexOf(a);
        const ib = KNOWN_CITIES.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    cityKeys.forEach(cityName => {
        const spots = grouped[cityName];
        const cityGroup = document.createElement('div');
        cityGroup.className = 'city-group';
        cityGroup.dataset.city = cityName;

        const icon = CITY_ICONS[cityName] || '📍';

        const header = document.createElement('div');
        header.className = 'city-header';
        header.innerHTML = `
            <span class="arrow">▼</span>
            <span class="city-icon">${icon}</span>
            <span class="city-name">${cityName}</span>
            <span class="city-count">${spots.length}</span>
        `;
        header.addEventListener('click', () => {
            cityGroup.classList.toggle('collapsed');
        });
        cityGroup.appendChild(header);

        const spotsContainer = document.createElement('div');
        spotsContainer.className = 'city-spots';

        if (spots.length === 0) {
            spotsContainer.innerHTML = '<div class="empty-city">Нет спотов</div>';
        } else {
            spots.forEach(place => {
                const item = document.createElement('div');
                item.className = 'place-item';
                if (place.permanent) item.style.borderLeftColor = '#27ae60';
                if (selectedForDelete.has(place.id)) item.style.opacity = '0.5';

                item.innerHTML = `
                    <h4>${place.name} ${place.permanent ? '🔒' : ''}</h4>
                    <p>${place.description}</p>
                    <div class="coords">
                        ${place.coords[0].toFixed(4)}, ${place.coords[1].toFixed(4)}
                        ${place.photos && place.photos.length ? ' · 📷 ' + place.photos.length : ''}
                    </div>
                `;

                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (deleteMode && !place.permanent && isDevUnlocked) {
                        if (selectedForDelete.has(place.id)) selectedForDelete.delete(place.id);
                        else selectedForDelete.add(place.id);
                        renderPlacesList();
                        return;
                    }
                    if (editMode && !place.permanent && isDevUnlocked) {
                        openEditModal(place);
                        return;
                    }
                    if (place._placemark) {
                        myMap.setCenter(place.coords, 15, { duration: 500, checkZoomRange: true });
                        place._placemark.balloon.open();
                    }
                });

                spotsContainer.appendChild(item);
            });
        }

        cityGroup.appendChild(spotsContainer);
        placesListEl.appendChild(cityGroup);
    });
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================
function confirmDeleteSelected() {
    if (!confirm(`Удалить ${selectedForDelete.size} спот(а)?`)) return;
    const toRemove = new Set(selectedForDelete);
    selectedForDelete.clear();
    placesData = placesData.filter(p => !toRemove.has(p.id));
    myMap.geoObjects.removeAll();
    placesData.forEach(p => createPlacemark(p));
    renderPlacesList();
    saveToStorage();
    exitDeleteMode();
}

function exitDeleteMode() {
    deleteMode = false;
    selectedForDelete.clear();
    renderPlacesList();
}

// ============================================================
// РЕДАКТИРОВАНИЕ
// ============================================================
function openEditModal(place) {
    editingPlaceId = place.id;
    editNameInput.value = place.name;
    editDescInput.value = place.description;
    editCitySelect.value = place.city || 'Другой';
    editingPhotos = (place.photos || []).slice();
    renderEditPhotosPreview();
    editModal.classList.add('active');
}

function saveEditPlace() {
    const name = editNameInput.value.trim();
    if (!name) {
        alert('Введите название');
        return;
    }
    const place = placesData.find(p => p.id === editingPlaceId);
    if (!place) return;
    place.name = name;
    place.description = editDescInput.value.trim() || 'Без описания';
    place.city = editCitySelect.value;
    place.photos = editingPhotos.slice();
    myMap.geoObjects.remove(place._placemark);
    createPlacemark(place);
    renderPlacesList();
    saveToStorage();
    closeEditModal();
}

function exitEditMode() {
    editMode = false;
    editingPlaceId = null;
    renderPlacesList();
}

// ============================================================
// СОХРАНЕНИЕ (FIREBASE + LOCALSTORAGE как резерв)
// ============================================================
function saveToStorage() {
    // Если Firebase не подключён — сохраняем в localStorage
    if (!window.fbDB) {
        console.warn('Firebase не подключён — сохраняем локально');
        const dataToSave = placesData.filter(p => !p.permanent).map(p => ({
            id: p.id, city: p.city, name: p.name, description: p.description,
            coords: p.coords, photos: p.photos || []
        }));
        localStorage.setItem('myPlaces', JSON.stringify(dataToSave));
        return;
    }

    // Сохраняем ВСЕ пользовательские места в Firebase
    const dataToSave = {};
    placesData.filter(p => !p.permanent).forEach(p => {
        dataToSave[p.id] = {
            city: p.city,
            name: p.name,
            description: p.description,
            coords: p.coords,
            photos: p.photos || []
        };
    });

    const placesRef = window.fbRef(window.fbDB, 'places');
    window.fbSet(placesRef, dataToSave);
}

// ============================================================
// ЗАГРУЗКА (FIREBASE
