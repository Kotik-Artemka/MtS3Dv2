import { createViewer } from './viewer.js';

const page = document.querySelector('main');
const byId = id => document.getElementById(id);
const list = byId('model-list');
const viewerStatus = byId('viewer-status');
const catalogStatus = byId('catalog-status');
const spin = byId('spin');
const reset = byId('reset');
const download = byId('download');
const search = byId('search');
const categoryFilter = byId('category-filter');
const icons = { 'part-15': '⬡', glider: '✈', 'cog-6-small': '⚙', 'sausage-dog': '◇' };

let viewer;
let activeRequest;
let activeButton;
let activeModel;
let catalogRequest;

async function select(model, button) {
    activeButton?.setAttribute('aria-pressed', 'false');
    activeButton = button;
    activeModel = model;
    button.setAttribute('aria-pressed', 'true');
    byId('category').textContent = model.category;
    byId('model-name').textContent = model.name;
    byId('description').textContent = model.description;
    download.href = model.stl_url;
    download.hidden = false;

    activeRequest?.abort();
    spin.disabled = reset.disabled = true;
    spin.setAttribute('aria-pressed', 'false');

    if (!viewer) {
        try {
            viewer = createViewer(byId('stage'));
        } catch {
            viewerStatus.textContent = 'Для 3D-просмотра нужен WebGL 2. Файл можно скачать по ссылке выше.';
            return;
        }
    }

    viewer.clear();
    viewer.setSpin(false);
    viewerStatus.textContent = 'Загружаем STL…';
    const request = new AbortController();
    activeRequest = request;

    try {
        const response = await fetch(model.stl_url, { signal: request.signal });
        if (!response.ok) throw new Error('Ошибка загрузки STL');
        const buffer = await response.arrayBuffer();
        if (request.signal.aborted) return;
        viewer.show(buffer, model.color);
        viewerStatus.textContent = '';
        spin.disabled = reset.disabled = false;
    } catch {
        if (!request.signal.aborted) {
            viewerStatus.textContent = 'Не удалось открыть модель. Выберите её ещё раз, чтобы повторить загрузку.';
        }
    }
}

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

function addModel(model) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'entry';
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'entry-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.setProperty('--model-color', model.color);
    icon.textContent = icons[model.id] || '◇';

    const label = document.createElement('span');
    const name = document.createElement('strong');
    const category = document.createElement('small');
    name.textContent = model.name;
    category.textContent = model.category;
    label.append(name, category);
    button.append(icon, label);
    button.addEventListener('click', () => select(model, button));
    list.append(button);
    return button;
}

let models = [];
let buttons = [];

function filterModels() {
    const query = search.value.trim().toLocaleLowerCase('ru');
    let visible = 0;
    models.forEach((model, index) => {
        const nameMatches = model.name.toLocaleLowerCase('ru').includes(query);
        const categoryMatches = !categoryFilter.value || categoryFilter.value === model.category;
        buttons[index].hidden = !(nameMatches && categoryMatches);
        if (!buttons[index].hidden) visible++;
    });
    byId('count').textContent = visible;
    catalogStatus.hidden = visible > 0;
    catalogStatus.textContent = models.length ? 'Модели не найдены.' : 'В каталоге пока нет моделей.';
}

search.addEventListener('input', filterModels);
categoryFilter.addEventListener('change', filterModels);

async function loadCatalog() {
    catalogRequest?.abort();
    const request = new AbortController();
    catalogRequest = request;

    try {
        const response = await fetch(page.dataset.api, {
            headers: { Accept: 'application/json' },
            signal: request.signal,
        });
        if (!response.ok) throw new Error('Ошибка API');
        const updatedModels = await response.json();
        if (request.signal.aborted) return;
        models = updatedModels;

        list.replaceChildren();
        buttons = models.map(addModel);
        const selectedCategory = categoryFilter.value;
        categoryFilter.replaceChildren(new Option('Все категории', ''));
        for (const category of new Set(models.map(model => model.category))) {
            categoryFilter.add(new Option(category, category));
        }
        categoryFilter.value = selectedCategory;
        if (categoryFilter.selectedIndex === -1) categoryFilter.value = '';

        byId('filters').hidden = !models.length;
        byId('count').hidden = false;
        filterModels();

        const index = models.findIndex(model => model.id === activeModel?.id);
        if (index !== -1 && JSON.stringify(models[index]) === JSON.stringify(activeModel)) {
            activeButton = buttons[index];
            activeButton.setAttribute('aria-pressed', 'true');
        } else if (models.length) {
            await select(models[Math.max(index, 0)], buttons[Math.max(index, 0)]);
        } else {
            activeRequest?.abort();
            activeModel = activeButton = undefined;
            viewer?.clear();
            viewer?.setSpin(false);
            spin.disabled = reset.disabled = true;
            spin.setAttribute('aria-pressed', 'false');
            download.hidden = true;
            byId('category').textContent = 'Просмотр модели';
            byId('model-name').textContent = '3D-просмотр';
            byId('description').textContent = '';
            viewerStatus.textContent = 'Выберите модель';
        }
    } catch {
        if (request.signal.aborted) return;
        catalogStatus.hidden = false;
        catalogStatus.textContent = 'Не удалось загрузить каталог. Обновите страницу, чтобы повторить попытку.';
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
