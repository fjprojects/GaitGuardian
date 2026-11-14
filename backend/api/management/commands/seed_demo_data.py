from django.core.management.base import BaseCommand
from api.models import Measurement


ROWS = [
    ("Sample 01", "0.600", "0.620", "0.780", "76.00"),
    ("Sample 02", "0.590", "0.610", "0.830", "78.00"),
    ("Sample 03", "0.580", "0.600", "0.910", "80.00"),
    ("Sample 04", "0.610", "0.600", "0.880", "79.00"),
    ("Sample 05", "0.570", "0.590", "1.020", "83.00"),
    ("Sample 06", "0.560", "0.580", "1.080", "86.00"),
]


class Command(BaseCommand):
    help = "Load fictional GaitGuardian demonstration measurements."

    def handle(self, *args, **options):
        for index, row in enumerate(ROWS, start=1):
            Measurement.objects.update_or_create(
                date=row[0],
                defaults={
                    "left_step_time": row[1],
                    "right_step_time": row[2],
                    "walking_speed": row[3],
                    "balance_score": row[4],
                    "sort_order": index,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(ROWS)} fictional sample measurements."))
