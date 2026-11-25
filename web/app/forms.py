from django import forms
from django.conf import settings
from django.core.validators import FileExtensionValidator, RegexValidator


class ModelUploadForm(forms.Form):
    name = forms.CharField(max_length=150)
    category = forms.CharField(max_length=100)
    description = forms.CharField(max_length=5000)
    color = forms.CharField(validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$')])
    stl_file = forms.FileField(validators=[FileExtensionValidator(['stl'])])

    def clean_stl_file(self):
        file = self.cleaned_data['stl_file']
        if file.size > settings.STL_MAX_UPLOAD_BYTES:
            raise forms.ValidationError('Размер STL не должен превышать 100 МБ.')
        return file
