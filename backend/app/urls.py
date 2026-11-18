from rest_framework.routers import DefaultRouter

from .views import STLModelViewSet

router = DefaultRouter()
router.register('models', STLModelViewSet, basename='stl-model')
urlpatterns = router.urls
