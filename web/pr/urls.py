from django.urls import path
from django.views.generic import TemplateView

from app import views

urlpatterns = [
    path('admin-panel/', views.admin_browser, name='admin-browser'),
    path('', TemplateView.as_view(template_name='app/index.html'), name='catalog'),
    path('api/session/', views.account_proxy, {'action': 'session'}),
    path('api/register/', views.account_proxy, {'action': 'register'}),
    path('api/', views.api_root, name='api-root'),
    path('api/browser/', views.api_browser, name='api-browser'),
    path('api/models/', views.catalog_list, name='stl-model-list'),
    path('api/models/<slug:pk>/', views.catalog_detail, name='stl-model-detail'),
    path('models/<slug:name>.stl', views.stl_file, name='stl-file'),
    path('scene/<slug:name>.stl', views.scene_file, name='scene-file'),
]
