from django.templatetags.static import static
from rest_framework import serializers


class STLModelSerializer(serializers.Serializer):
    id = serializers.SlugField()
    name = serializers.CharField()
    category = serializers.CharField()
    description = serializers.CharField()
    color = serializers.CharField()
    stl_url = serializers.SerializerMethodField()

    def get_stl_url(self, model):
        return static(f"frontend/models/{model['file']}")
