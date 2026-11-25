from django.contrib import admin
from django.urls import include, path

from app.views import scene_file, stl_file

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.urls')),
    path('models/<slug:name>.stl', stl_file, name='stl-file'),
    path('scene/<slug:name>.stl', scene_file, name='scene-file'),
]
