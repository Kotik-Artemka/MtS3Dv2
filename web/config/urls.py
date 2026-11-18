from django.urls import path
from django.views.generic import TemplateView

from frontend import views

urlpatterns = [
    path('', TemplateView.as_view(template_name='frontend/index.html'), name='catalog'),
    path('api/', views.api_root, name='api-root'),
    path('api/models/', views.catalog_list, name='stl-model-list'),
    path('api/models/<slug:pk>/', views.catalog_detail, name='stl-model-detail'),
    path('models/<slug:name>.stl', views.stl_file, name='stl-file'),
]
