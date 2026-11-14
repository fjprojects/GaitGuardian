from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Measurement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.CharField(max_length=80)),
                ("left_step_time", models.DecimalField(decimal_places=3, max_digits=7)),
                ("right_step_time", models.DecimalField(decimal_places=3, max_digits=7)),
                ("walking_speed", models.DecimalField(decimal_places=3, max_digits=7)),
                ("balance_score", models.DecimalField(decimal_places=2, max_digits=7)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ("sort_order", "id")},
        ),
    ]
