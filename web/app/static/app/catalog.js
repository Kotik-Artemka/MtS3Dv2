import { createGallery } from './gallery.js?v=3';
import { loadGeometry } from './model.js';
import { createViewer } from './viewer.js?v=3';

const page = document.querySelector('main');
const byId = id => document.getElementById(id);
const panel = byId('catalog-panel');
const menu = byId('menu');
const list = byId('model-list');
const search = byId('search');
const categoryFilter = byId('category-filter');
const catalogStatus = byId('catalog-status');
const worldStatus = byId('world-status');
const detail = byId('detail');
const viewerStatus = byId('viewer-status');
const spin = byId('spin');
const reset = byId('reset');
const fly = byId('fly');
const home = byId('home');
let gallery;
let viewer;
let models = [];
let catalogRequest;
let activeModel;
let inspection = 0;
let loadError = false;
let catalogLoaded = false;

function showMenu(open) {
    panel.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
}

function matchingModels() {
    const query = search.value.trim().toLocaleLowerCase('ru');
    return models.filter(model =>
        (!categoryFilter.value || categoryFilter.value === model.category)
        && model.name.toLocaleLowerCase('ru').includes(query)
    );
}

function renderList() {
    const matches = matchingModels();
    list.replaceChildren();
    for (const model of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'entry';
        button.style.setProperty('--exhibit-color', model.color);
        const name = document.createElement('strong');
        const category = document.createElement('small');
        name.textContent = model.name;
        category.textContent = model.category;
        button.append(name, category);
        button.addEventListener('click', () => inspect(model.id));
        list.append(button);
    }

    byId('count').textContent = catalogLoaded ? matches.length : '';
    catalogStatus.hidden = matches.length > 0 && !loadError;
    if (loadError) catalogStatus.textContent = 'Не удалось обновить каталог.';
    else if (!catalogLoaded) catalogStatus.textContent = 'Загружаем каталог…';
    else catalogStatus.textContent = models.length ? 'Модели не найдены.' : 'В каталоге пока нет моделей.';
}

async function inspect(id) {
    const model = models.find(candidate => candidate.id === id);
    if (!model) return;
    activeModel = model;
    const ticket = ++inspection;

    byId('category').textContent = model.category;
    byId('model-name').textContent = model.name;
    byId('description').textContent = model.description;
    byId('download').href = model.stl_url;
    byId('mesh-info').hidden = true;
    spin.disabled = reset.disabled = true;
    spin.setAttribute('aria-pressed', 'false');
    viewer?.clear();
    viewer?.setSpin(false);

    if (!detail.open) {
        gallery?.setActive(false);
        detail.showModal();
    }
    viewerStatus.textContent = 'Загружаем STL…';

    try {
        viewer ??= createViewer(byId('stage'));
    } catch {
        viewerStatus.textContent = 'Для 3D-просмотра нужен WebGL 2. STL можно скачать.';
        return;
    }

    viewer.setActive(true);
    try {
        const geometry = await loadGeometry(model.stl_url);
        if (ticket !== inspection || !detail.open) return;
        await viewer.show(geometry, model.color);
        if (ticket !== inspection || !detail.open) return;
        byId('triangles').textContent = (geometry.attributes.position.count / 3).toLocaleString('ru');
        byId('mesh-info').hidden = false;
        viewerStatus.textContent = '';
        spin.disabled = reset.disabled = false;
    } catch {
        if (ticket === inspection && detail.open) viewerStatus.textContent = 'Не удалось открыть STL.';
    }
}

function lockChanged(locked) {
    if (locked) showMenu(false);
    byId('crosshair').hidden = !locked;
    fly.setAttribute('aria-pressed', String(locked));
    byId('fly-label').textContent = locked ? 'Освободить курсор' : 'Управление мышью';
    byId('mouse-guide').textContent = locked ? 'Мышь — обзор, клик — выбор, Esc — курсор' : 'Потяните мышью для обзора';
}

try {
    gallery = createGallery(byId('world'), byId('exhibit-labels'), inspect, lockChanged);
    fly.hidden = !byId('world').querySelector('canvas').requestPointerLock;
    home.disabled = false;
    document.querySelector('.touch-controls').hidden = false;
} catch {
    worldStatus.textContent = 'Для полёта нужен WebGL 2. Модели доступны в каталоге.';
    showMenu(true);
}

fly.addEventListener('click', async () => {
    try {
        await gallery.flight.lock();
    } catch {
        byId('mouse-guide').textContent = 'Потяните мышью по сцене для обзора';
    }
});

home.addEventListener('click', () => {
    gallery.flight.reset();
    byId('world').querySelector('canvas').focus();
});

for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        gallery?.flight.setPressed(button.dataset.key, true);
    });
    button.addEventListener('lostpointercapture', () => gallery?.flight.setPressed(button.dataset.key, false));
}

byId('close-detail').addEventListener('click', () => detail.close());
detail.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        event.preventDefault();
        detail.close();
    }
});
detail.addEventListener('close', () => {
    inspection++;
    activeModel = undefined;
    viewer?.setSpin(false);
    viewer?.setActive(false);
    gallery?.setActive(true);
});
spin.addEventListener('click', () => {
    const enabled = spin.getAttribute('aria-pressed') !== 'true';
    spin.setAttribute('aria-pressed', String(enabled));
    viewer.setSpin(enabled);
});
reset.addEventListener('click', () => {
    viewer.setSpin(false);
    spin.setAttribute('aria-pressed', 'false');
    viewer.reset();
});

menu.addEventListener('click', () => showMenu(panel.hidden));
search.addEventListener('focus', () => showMenu(true));
search.addEventListener('input', () => {
    showMenu(true);
    renderList();
});
categoryFilter.addEventListener('change', renderList);
byId('search-form').addEventListener('submit', event => {
    event.preventDefault();
    const match = matchingModels()[0];
    if (match) inspect(match.id);
});
window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !detail.open && !panel.hidden) {
        showMenu(false);
        if (panel.contains(document.activeElement) || document.activeElement === search) menu.focus();
    }
});

async function loadCatalog() {
    catalogRequest?.abort();
    const request = new AbortController();
    catalogRequest = request;
    try {
        const response = await fetch(page.dataset.api, { signal: request.signal });
        if (!response.ok) throw new Error('Ошибка каталога');
        const updated = await response.json();
        if (request.signal.aborted) return;
        catalogLoaded = true;
        loadError = false;
        models = updated;

        const selectedCategory = categoryFilter.value;
        categoryFilter.replaceChildren(new Option('Все категории', ''));
        for (const category of new Set(models.map(model => model.category))) {
            categoryFilter.add(new Option(category, category));
        }
        byId('upload-categories').replaceChildren(...Array.from(new Set(models.map(model => model.category)), category => {
            const option = document.createElement('option');
            option.value = category;
            return option;
        }));
        categoryFilter.value = selectedCategory;
        if (categoryFilter.selectedIndex === -1) categoryFilter.value = '';
        renderList();

        if (detail.open && activeModel) {
            const revised = models.find(model => model.id === activeModel.id);
            if (!revised) detail.close();
            else if (JSON.stringify(revised) !== JSON.stringify(activeModel)) inspect(revised.id);
        }

        if (gallery) {
            const results = await gallery.setModels(models);
            if (request.signal.aborted) return;
            worldStatus.textContent = results.some(result => result.status === 'rejected')
                ? 'Не удалось загрузить часть STL.' : '';
        }
    } catch {
        if (request.signal.aborted) return;
        loadError = true;
        renderList();
        worldStatus.textContent = 'Не удалось загрузить каталог.';
    }
}

function watchCatalog() {
    const url = new URL(page.dataset.ws, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    socket.addEventListener('message', event => {
        const update = JSON.parse(event.data);
        if (update.type === 'catalog.changed') loadCatalog();
    });
    socket.addEventListener('close', () => setTimeout(watchCatalog, 3000));
}

loadCatalog();
watchCatalog();

const uploadDialog = byId('upload-dialog');
const uploadForm = byId('upload-form');
const uploadFile = byId('upload-file');
const uploadStatus = byId('upload-status');
const uploadSubmit = byId('upload-submit');
let uploading = false;

byId('add-model').addEventListener('click', () => {
    if (!window.SiteAccount?.state.authenticated) { window.SiteAccount?.open(); return; }
    gallery?.setActive(false);
    uploadStatus.textContent = '';
    uploadDialog.showModal();
});
byId('close-upload').addEventListener('click', () => uploadDialog.close());
uploadDialog.addEventListener('close', () => gallery?.setActive(!detail.open));
// Keep the response attached to the visible form while a file is being sent.
uploadDialog.addEventListener('cancel', event => {
    if (uploading) event.preventDefault();
});
uploadFile.addEventListener('change', () => {
    const file = uploadFile.files[0];
    let error = '';
    if (file && !file.name.toLowerCase().endsWith('.stl')) error = 'Выберите файл с расширением .stl.';
    else if (file && file.size > 100 * 1024 * 1024) error = 'Размер STL не должен превышать 100 МБ.';
    uploadFile.setCustomValidity(error);
    uploadStatus.textContent = error;
    byId('upload-file-info').textContent = file ? `${file.name} · ${(file.size / (1024 * 1024)).toLocaleString('ru', { maximumFractionDigits: 2 })} МБ` : '';
});
uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (uploading || !uploadForm.reportValidity()) return;
    uploading = true;
    uploadSubmit.disabled = true;
    byId('close-upload').disabled = true;
    uploadForm.setAttribute('aria-busy', 'true');
    uploadStatus.textContent = 'Загружаем и проверяем STL…';
    try {
        const response = await fetch(page.dataset.api, {
            method: 'POST',
            headers: { 'X-CSRFToken': window.SiteAccount.csrf() },
            body: new FormData(uploadForm),
        });
        const json = response.headers.get('content-type')?.includes('application/json');
        const result = json ? await response.json() : null;
        if (!response.ok) {
            const labels = { name: 'Название', category: 'Категория', description: 'Описание', color: 'Цвет', stl_file: 'STL' };
            const errors = result && Object.entries(result).map(([key, messages]) =>
                `${labels[key] ? labels[key] + ': ' : ''}${Array.isArray(messages) ? messages.join(' ') : messages}`);
            throw new Error(errors?.join(' ') || 'Не удалось загрузить модель. Обновите страницу и попробуйте снова.');
        }
        uploadForm.reset();
        uploadFile.setCustomValidity('');
        byId('upload-file-info').textContent = '';
        search.value = '';
        categoryFilter.value = '';
        await loadCatalog();
        byId('catalog-notice').textContent = `Модель «${result.name}» добавлена.`;
        uploadDialog.close();
        showMenu(true);
    } catch (error) {
        uploadStatus.textContent = error.message || 'Нет связи с сервером. Попробуйте ещё раз.';
    } finally {
        uploading = false;
        uploadSubmit.disabled = false;
        byId('close-upload').disabled = false;
        uploadForm.removeAttribute('aria-busy');
    }
});

window.addEventListener('account:opened', () => gallery?.setActive(false));
window.addEventListener('account:closed', () => gallery?.setActive(!detail.open && !uploadDialog.open));
