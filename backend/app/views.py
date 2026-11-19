from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import STLModel
from .serializers import STLModelSerializer


class STLModelViewSet(ReadOnlyModelViewSet):
    queryset = STLModel.objects.all()
    serializer_class = STLModelSerializer
    lookup_field = 'slug'


def stl_file(request, name):
    try:
        file = (settings.BASE_DIR / 'stl' / f'{name}.stl').open('rb')
    except FileNotFoundError as error:
        raise Http404() from error
    return FileResponse(file, content_type='model/stl')
