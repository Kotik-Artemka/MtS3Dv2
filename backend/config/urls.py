from django.urls import include, path

from app.views import stl_file

urlpatterns = [
    path('api/', include('app.urls')),
    path('models/<slug:name>.stl', stl_file, name='stl-file'),
]
