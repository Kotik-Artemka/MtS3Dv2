import math
import struct
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.urls import reverse
from rest_framework import serializers

from .models import STLModel
from rest_framework.exceptions import ValidationError


def validate_stl(upload):
    if Path(upload.name).suffix.lower() != '.stl':
        raise ValidationError('Выберите файл с расширением .stl.')
    if upload.size > settings.STL_MAX_UPLOAD_BYTES:
        raise ValidationError('Размер STL не должен превышать 100 МБ.')
    try:
        data = upload.read(settings.STL_MAX_UPLOAD_BYTES + 1)
    finally:
        upload.seek(0)
    if len(data) != upload.size or not data:
        raise ValidationError('STL-файл пуст или передан не полностью.')

    minimum = [math.inf] * 3
    maximum = [-math.inf] * 3
    triangles = 0
    has_surface = False

    def triangle(vertices):
        nonlocal triangles, has_surface
        triangles += 1
        if triangles > settings.STL_MAX_TRIANGLES:
            raise ValueError('В модели слишком много треугольников (максимум 2 100 000).')
        for vertex in vertices:
            for axis, value in enumerate(vertex):
                if not math.isfinite(value) or abs(value) > 3.402823466e38:
                    raise ValueError('Координаты STL должны быть конечными числами.')
                minimum[axis] = min(minimum[axis], value)
                maximum[axis] = max(maximum[axis], value)
        a, b, c = vertices
        u = [b[i] - a[i] for i in range(3)]
        v = [c[i] - a[i] for i in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        has_surface |= any(value != 0 for value in cross)

    try:
        count = struct.unpack_from('<I', data, 80)[0] if len(data) >= 84 else 0
        if count and len(data) == 84 + count * 50:
            if count > settings.STL_MAX_TRIANGLES:
                raise ValueError('В модели слишком много треугольников (максимум 2 100 000).')
            for values in struct.iter_unpack('<12fH', memoryview(data)[84:]):
                if not all(math.isfinite(value) for value in values[:3]):
                    raise ValueError('Некорректные нормали STL.')
                triangle([values[3:6], values[6:9], values[9:12]])
        else:
            lines = iter(line.strip() for line in data.decode('utf-8-sig').splitlines() if line.strip())
            line = next(lines)
            while True:
                if line.split()[0] != 'solid':
                    raise ValueError('Не найден заголовок solid.')
                line = next(lines)
                while line.split()[0] != 'endsolid':
                    parts = line.split()
                    if parts[:2] != ['facet', 'normal'] or len(parts) != 5:
                        raise ValueError('Некорректная грань STL.')
                    if not all(math.isfinite(float(v)) and abs(float(v)) <= 3.402823466e38 for v in parts[2:]):
                        raise ValueError('Некорректные нормали STL.')
                    if next(lines).split() != ['outer', 'loop']:
                        raise ValueError('Некорректный контур STL.')
                    vertices = []
                    for _ in range(3):
                        parts = next(lines).split()
                        if len(parts) != 4 or parts[0] != 'vertex':
                            raise ValueError('У грани STL должно быть три вершины.')
                        vertices.append(tuple(float(v) for v in parts[1:]))
                    if next(lines) != 'endloop' or next(lines) != 'endfacet':
                        raise ValueError('Грань STL не завершена.')
                    triangle(vertices)
                    line = next(lines)
                line = next(lines, None)
                if line is None:
                    break
        if not triangles or not has_surface or not math.isfinite(max(maximum[i] - minimum[i] for i in range(3))):
            raise ValueError('В STL нет корректной поверхности.')
    except (ValueError, StopIteration, OverflowError) as error:
        detail = str(error) if isinstance(error, ValueError) and not isinstance(error, UnicodeError) else ''
        raise ValidationError(detail or 'Не удалось прочитать STL. Поддерживаются бинарный и текстовый STL.') from error
    return upload


class STLModelSerializer(serializers.ModelSerializer):
    id = serializers.SlugField(source='slug', read_only=True)
    stl_url = serializers.SerializerMethodField()

    class Meta:
        model = STLModel
        fields = ('id', 'name', 'category', 'description', 'color', 'stl_url')

    def get_stl_url(self, model):
        return reverse('stl-file', kwargs={'name': model.slug})


class STLModelUploadSerializer(STLModelSerializer):
    description = serializers.CharField(max_length=5000)
    stl_file = serializers.FileField(write_only=True, validators=[validate_stl])

    class Meta(STLModelSerializer.Meta):
        fields = (*STLModelSerializer.Meta.fields, 'stl_file')

    def create(self, validated_data):
        upload = validated_data.pop('stl_file')
        slug = 'user-' + uuid4().hex
        settings.STL_ROOT.mkdir(parents=True, exist_ok=True)
        path = settings.STL_ROOT / f'{slug}.stl'
        # Уникальное имя и режим xb не позволяют перезаписать чужой STL.
        with path.open('xb') as destination:
            try:
                for chunk in upload.chunks():
                    destination.write(chunk)
                destination.close()
                with transaction.atomic():
                    return STLModel.objects.create(slug=slug, **validated_data)
            except Exception:
                destination.close()
                path.unlink(missing_ok=True)
                raise


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, min_length=3)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, data):
        User = get_user_model()
        try:
            User._meta.get_field('username').run_validators(data['username'])
        except DjangoValidationError as error:
            raise serializers.ValidationError({'username': error.messages})
        if User.objects.filter(username__iexact=data['username']).exists():
            raise serializers.ValidationError({'username': 'Этот логин уже занят.'})
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают.'})
        user = User(username=data['username'], email=data.get('email', ''))
        try:
            validate_password(data['password'], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages})
        return data
