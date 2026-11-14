from django import get_version
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Measurement

PROJECT = "GaitGuardian"
DISCLAIMER = (
    "These are fictional example measurements. This API is descriptive only: "
    "it does not calculate fall risk, make predictions, diagnose conditions or provide a medical assessment."
)

DEMO_MEASUREMENTS = [
    {"date": "Sample 01", "left_step_time": 0.600, "right_step_time": 0.620, "walking_speed": 0.780, "balance_score": 76.0},
    {"date": "Sample 02", "left_step_time": 0.590, "right_step_time": 0.610, "walking_speed": 0.830, "balance_score": 78.0},
    {"date": "Sample 03", "left_step_time": 0.580, "right_step_time": 0.600, "walking_speed": 0.910, "balance_score": 80.0},
    {"date": "Sample 04", "left_step_time": 0.610, "right_step_time": 0.600, "walking_speed": 0.880, "balance_score": 79.0},
    {"date": "Sample 05", "left_step_time": 0.570, "right_step_time": 0.590, "walking_speed": 1.020, "balance_score": 83.0},
    {"date": "Sample 06", "left_step_time": 0.560, "right_step_time": 0.580, "walking_speed": 1.080, "balance_score": 86.0},
]


@require_GET
def health(request):
    return JsonResponse({
        "status": "ok",
        "project": PROJECT,
        "framework": "Django",
        "django_version": get_version(),
        "services": ["measurements"],
        "data_mode": "static-demo" if settings.DEMO_DATA_MODE else "database",
    })


@require_GET
def measurements(request):
    if settings.DEMO_DATA_MODE:
        items = [dict(item) for item in DEMO_MEASUREMENTS]
    else:
        items = [
            {
                "date": item.date,
                "left_step_time": float(item.left_step_time),
                "right_step_time": float(item.right_step_time),
                "walking_speed": float(item.walking_speed),
                "balance_score": float(item.balance_score),
            }
            for item in Measurement.objects.all()
        ]

    return JsonResponse({
        "project": PROJECT,
        "count": len(items),
        "items": items,
        "source": "fictional demonstration dataset",
        "disclaimer": DISCLAIMER,
    })
