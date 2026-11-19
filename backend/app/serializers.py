from django.urls import reverse
from rest_framework import serializers

from .models import STLModel


class STLModelSerializer(serializers.ModelSerializer):
    id = serializers.SlugField(source='slug', read_only=True)
    stl_url = serializers.SerializerMethodField()

    class Meta:
        model = STLModel
        fields = ('id', 'name', 'category', 'description', 'color', 'stl_url')

    def get_stl_url(self, model):
        return reverse('stl-file', kwargs={'name': model.slug})
