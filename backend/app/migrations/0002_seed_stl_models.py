from django.db import migrations


MODELS = [
    {
        'name': 'Деталь №15',
        'category': 'Инженерия',
        'description': 'Техническая деталь. Поверните модель, чтобы рассмотреть её форму со всех сторон.',
        'color': '#9f90ff',
        'slug': 'part-15',
    },
    {
        'name': 'Планер',
        'category': 'Транспорт',
        'description': 'Модель планера с широкими крыльями и вытянутым фюзеляжем.',
        'color': '#72b9ff',
        'slug': 'glider',
    },
    {
        'name': 'Шестерня',
        'category': 'Инженерия',
        'description': 'Зубчатое колесо. Приблизьте модель, чтобы рассмотреть профиль зубьев.',
        'color': '#ffb578',
        'slug': 'cog-6-small',
    },
    {
        'name': 'Такса',
        'category': 'Фигурки',
        'description': 'Фигурка таксы с длинным туловищем и короткими лапами.',
        'color': '#ffc0d1',
        'slug': 'sausage-dog',
    },
]


def add_models(apps, schema_editor):
    stl_model = apps.get_model('app', 'STLModel')
    stl_model.objects.using(schema_editor.connection.alias).bulk_create(
        stl_model(**fields) for fields in MODELS
    )


def remove_models(apps, schema_editor):
    stl_models = apps.get_model('app', 'STLModel').objects.using(schema_editor.connection.alias)
    stl_models.filter(slug__in=[fields['slug'] for fields in MODELS]).delete()


class Migration(migrations.Migration):
    dependencies = [('app', '0001_initial')]
    operations = [migrations.RunPython(add_models, remove_models)]
