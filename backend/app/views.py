from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .catalog import read_catalog
from .serializers import STLModelSerializer


class STLModelViewSet(ViewSet):
    def list(self, request):
        return Response(STLModelSerializer(read_catalog(), many=True).data)

    def retrieve(self, request, pk=None):
        for model in read_catalog():
            if model['id'] == pk:
                return Response(STLModelSerializer(model).data)
        raise NotFound()


def stl_file(request, name):
    try:
        file = (settings.BASE_DIR / 'stl' / f'{name}.stl').open('rb')
    except FileNotFoundError as error:
        raise Http404() from error
    return FileResponse(file, content_type='model/stl')
