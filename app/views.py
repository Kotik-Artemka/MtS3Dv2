from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .catalog import MODELS
from .serializers import STLModelSerializer


class STLModelViewSet(ViewSet):
    def list(self, request):
        return Response(STLModelSerializer(MODELS, many=True).data)

    def retrieve(self, request, pk=None):
        for model in MODELS:
            if model['id'] == pk:
                return Response(STLModelSerializer(model).data)
        raise NotFound()
