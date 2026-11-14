from django import get_version
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Measurement

PROJECT = "GaitGuardian"
DISCLAIMER = (
    "These are fictional example measurements. This API is descriptive only: "
    "it does not calculate fall risk, make predictions, diagnose conditions or provide a medical assessment."
)


@require_GET
def health(request):
    return JsonResponse({
        "status": "ok",
        "project": PROJECT,
        "framework": "Django",
        "django_version": get_version(),
        "services": ["measurements"],
    })


@require_GET
def measurements(request):
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
