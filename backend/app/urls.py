from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import STLModelViewSet, register, session

router = DefaultRouter()
router.register('models', STLModelViewSet, basename='stl-model')
urlpatterns = [
    path('session/', session, name='session'),
    path('register/', register, name='register'),
    *router.urls,
]
