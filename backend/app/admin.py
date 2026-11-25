from django.contrib import admin
from .models import STLModel


@admin.register(STLModel)
class STLModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'owner']
    list_filter = ['category']
    search_fields = ['name', 'description']
    readonly_fields = ['slug', 'owner']

    def has_add_permission(self, request):
        return False
