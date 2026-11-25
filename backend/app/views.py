from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import IntegrityError, transaction
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.mixins import CreateModelMixin
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import STLModel
from .serializers import RegistrationSerializer, STLModelSerializer, STLModelUploadSerializer


def identity(user):
    authenticated = user.is_authenticated
    administrator = authenticated and user.is_staff
    return {
        'authenticated': authenticated,
        'is_staff': administrator,
        'username': user.get_username() if authenticated else '',
        'email': user.email if authenticated else '',
        'role': 'admin' if administrator else 'user' if authenticated else 'guest',
    }


@ensure_csrf_cookie
@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([AllowAny])
@csrf_protect
def session(request):
    if request.method == 'POST':
        username = request.data.get('username')
        password = request.data.get('password')
        if not isinstance(username, str) or not isinstance(password, str):
            return Response({'detail': 'Введите логин и пароль.'}, status=400)
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({'detail': 'Неверный логин или пароль.'}, status=400)
        login(request, user)
    elif request.method == 'DELETE':
        logout(request)
    return Response(identity(request.user))


@ensure_csrf_cookie
@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
def register(request):
    serializer = RegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        with transaction.atomic():
            user = get_user_model().objects.create_user(**serializer.validated_data)
    except IntegrityError:
        return Response({'username': ['Этот логин уже занят.']}, status=400)
    login(request, user)
    return Response(identity(user), status=201)


@method_decorator(csrf_protect, name='dispatch')
class STLModelViewSet(CreateModelMixin, ReadOnlyModelViewSet):
    queryset = STLModel.objects.all()
    serializer_class = STLModelSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        # JSON нужен всем для галереи, HTML-панель DRF — только администратору.
        if self.request.accepted_renderer.format == 'api':
            return [IsAdminUser()]
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve', 'metadata'):
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return STLModelUploadSerializer
        return STLModelSerializer


def stl_file(request, name):
    try:
        file = (settings.STL_ROOT / f'{name}.stl').open('rb')
    except FileNotFoundError as error:
        raise Http404() from error
    return FileResponse(file, content_type='model/stl')


def scene_file(request, name):
    if name not in {'pedestal', 'pedestal-top'}:
        raise Http404()
    try:
        file = (settings.STL_ROOT / 'environment' / f'{name}.stl').open('rb')
    except FileNotFoundError as error:
        raise Http404() from error
    return FileResponse(file, content_type='model/stl')
