from django.urls import reverse
from rest_framework import serializers


class STLModelSerializer(serializers.Serializer):
    id = serializers.SlugField()
    name = serializers.CharField()
    category = serializers.CharField()
    description = serializers.CharField()
    color = serializers.CharField()
    stl_url = serializers.SerializerMethodField()

    def get_stl_url(self, model):
        return reverse('stl-file', kwargs={'name': model['file'].removesuffix('.stl')})
