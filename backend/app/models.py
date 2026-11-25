from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


class STLModel(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='stl_models',
    )
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=100)
    description = models.TextField()
    color = models.CharField(max_length=7, validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$')])

    class Meta:
        ordering = ('pk',)

    def __str__(self):
        return self.name
