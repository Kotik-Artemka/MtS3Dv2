# MtS 3D

Учебный сайт-агрегатор 3D-моделей. В каталоге четыре STL-файла из задания. Модели можно искать по названию, фильтровать по категории, вращать, приближать и скачивать.

## Запуск

Нужен Python 3.12 и браузер с WebGL 2.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

На Windows для активации среды в PowerShell используйте `.venv\Scripts\Activate.ps1`.

Откройте `http://127.0.0.1:8000/`. Для работы просмотра доступ к CDN не нужен: Three.js лежит в проекте.

## Как устроен проект

- `frontend/templates/frontend/index.html` — Django-шаблон страницы.
- `frontend/static/frontend/catalog.js` — запрашивает каталог, рисует список и загружает выбранный STL.
- `frontend/static/frontend/viewer.js` — передаёт геометрию в Three.js и управляет камерой.
- `app/catalog.py` — названия, описания, категории и имена файлов. Для добавления записи положите STL в `frontend/static/frontend/models/` и добавьте словарь в каталог.
- `app/views.py` и `app/serializers.py` — бэкенд на Django REST Framework. `GET /api/models/` возвращает список, а `GET /api/models/glider/` — одну запись.

Django отдаёт HTML, браузер запрашивает JSON у API по тому же адресу и берёт ссылку на STL из ответа. Оба слоя запускаются одной командой.
