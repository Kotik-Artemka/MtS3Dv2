import json
from http.cookies import SimpleCookie
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods, require_safe

from .forms import ModelUploadForm


def from_backend(request, path, *, stream=False, data=None, headers=None):
    headers = dict(headers or {})
    cookie_names = ('mts_csrftoken', 'mts_sessionid')
    headers['Cookie'] = '; '.join(
        f'{key}={request.COOKIES[key]}' for key in cookie_names if key in request.COOKIES
    )
    headers.setdefault('Accept', 'application/json')
    if request.META.get('HTTP_X_CSRFTOKEN'):
        headers['X-CSRFToken'] = request.META['HTTP_X_CSRFTOKEN']
    upstream = Request(settings.BACKEND_URL + path, method=request.method, data=data, headers=headers)
    try:
        response = urlopen(upstream, timeout=120 if data is not None else 5)
    except HTTPError as error:
        response = error
    except (URLError, TimeoutError):
        return JsonResponse({'detail': 'Сервер каталога недоступен.'}, status=503)
    if stream and request.method == 'GET' and response.status == 200:
        result = FileResponse(response, content_type=response.headers.get_content_type())
    else:
        with response:
            result = HttpResponse(response.read(), status=response.status, content_type=response.headers.get_content_type())
    for header in response.headers.get_all('Set-Cookie', []):
        cookies = SimpleCookie()
        cookies.load(header)
        for key, morsel in cookies.items():
            if key in cookie_names:
                result.set_cookie(
                    key, morsel.value,
                    max_age=morsel['max-age'] or None,
                    expires=morsel['expires'] or None,
                    path='/',
                    httponly=bool(morsel['httponly']),
                    secure=bool(morsel['secure']),
                    samesite=morsel['samesite'] or 'Lax',
                )
    if 'Content-Length' in response.headers:
        result['Content-Length'] = response.headers['Content-Length']
    if not stream:
        result['Cache-Control'] = 'no-store'
    return result


@require_safe
def api_browser(request):
    return admin_redirect(request, '/api/')


@require_safe
def api_root(request):
    return from_backend(request, '/api/')


@require_http_methods(['GET', 'HEAD', 'POST'])
def catalog_list(request):
    if request.method == 'POST':
        form = ModelUploadForm(request.POST, request.FILES)
        if not form.is_valid():
            return JsonResponse({key: list(messages) for key, messages in form.errors.items()}, status=400)
        boundary = 'mts-' + uuid4().hex
        # Django уже разобрал форму для проверки CSRF. Собираем multipart заново.
        fields = []
        for key in ('name', 'category', 'description', 'color'):
            fields.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{form.cleaned_data[key]}\r\n'.encode('utf-8'))
        file = form.cleaned_data['stl_file']
        fields.append(f'--{boundary}\r\nContent-Disposition: form-data; name="stl_file"; filename="model.stl"\r\nContent-Type: model/stl\r\n\r\n'.encode())
        fields.extend(file.chunks())
        fields.append(f'\r\n--{boundary}--\r\n'.encode())
        headers = {
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'X-CSRFToken': request.META.get('HTTP_X_CSRFTOKEN', request.POST.get('csrfmiddlewaretoken', '')),
        }
        return from_backend(request, '/api/models/', data=b''.join(fields), headers=headers)
    return from_backend(request, '/api/models/')


@require_safe
def catalog_detail(request, pk):
    return from_backend(request, f'/api/models/{pk}/')


@require_safe
def stl_file(request, name):
    return from_backend(request, f'/models/{name}.stl', stream=True)


@require_safe
def scene_file(request, name):
    return from_backend(request, f'/scene/{name}.stl', stream=True)


@require_http_methods(['GET', 'POST', 'DELETE'])
def account_proxy(request, action):
    return from_backend(
        request, f'/api/{action}/',
        data=request.body if request.method != 'GET' else None,
        headers={'Content-Type': 'application/json'},
    )


@require_safe
def admin_browser(request):
    return admin_redirect(request, '/admin/')


def admin_redirect(request, destination):
    cookie_names = ['mts_csrftoken', 'mts_sessionid']
    headers = {'Accept': 'application/json', 'Cookie': '; '.join(f'{key}={request.COOKIES[key]}' for key in cookie_names if key in request.COOKIES)}
    try:
        with urlopen(Request(settings.BACKEND_URL + '/api/session/', headers=headers), timeout=5) as response:
            session = json.load(response)
    except (URLError, TimeoutError, ValueError):
        return JsonResponse({'detail': 'Бэкенд недоступен.'}, status=503)
    if not session.get('is_staff'):
        return JsonResponse({'detail': 'Доступ разрешён только администратору. Войдите на сайте.'}, status=403)
    return redirect(settings.BACKEND_URL + destination)
