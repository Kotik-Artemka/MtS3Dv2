from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.http import require_safe


def from_backend(request, path, *, stream=False):
    upstream = Request(settings.BACKEND_URL + path, method=request.method)
    try:
        response = urlopen(upstream, timeout=5)
    except HTTPError as error:
        with error:
            status = error.code
        if status == 404:
            return JsonResponse({'detail': 'Не найдено.'}, status=404)
        return JsonResponse({'detail': 'Ошибка сервера каталога.'}, status=502)
    except (URLError, TimeoutError):
        return JsonResponse({'detail': 'Сервер каталога недоступен.'}, status=503)

    content_type = response.headers.get_content_type()
    if stream and request.method == 'GET':
        result = FileResponse(response, content_type=content_type)
        if 'Content-Length' in response.headers:
            result['Content-Length'] = response.headers['Content-Length']
        return result

    with response:
        result = HttpResponse(response.read(), content_type=content_type)
        if request.method == 'HEAD' and 'Content-Length' in response.headers:
            result['Content-Length'] = response.headers['Content-Length']
        return result


@require_safe
def api_root(request):
    from django.urls import reverse

    return JsonResponse({'models': reverse('stl-model-list')})


@require_safe
def catalog_list(request):
    return from_backend(request, '/api/models/')


@require_safe
def catalog_detail(request, pk):
    return from_backend(request, f'/api/models/{pk}/')


@require_safe
def stl_file(request, name):
    return from_backend(request, f'/models/{name}.stl', stream=True)
