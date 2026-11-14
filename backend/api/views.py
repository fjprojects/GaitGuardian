from django import get_version
from django.http import JsonResponse
from django.views.decorators.http import require_GET
PROJECT="GaitGuardian"
DISCLAIMER="These are fictional example measurements. This prototype is descriptive only: it does not calculate fall risk, make predictions, diagnose conditions, or provide a medical assessment."
ITEMS=[
  {
    "date": "Sample 01",
    "left_step_time": 0.6,
    "right_step_time": 0.62,
    "walking_speed": 0.78,
    "balance_score": 76
  },
  {
    "date": "Sample 02",
    "left_step_time": 0.59,
    "right_step_time": 0.61,
    "walking_speed": 0.83,
    "balance_score": 78
  },
  {
    "date": "Sample 03",
    "left_step_time": 0.58,
    "right_step_time": 0.6,
    "walking_speed": 0.91,
    "balance_score": 80
  },
  {
    "date": "Sample 04",
    "left_step_time": 0.61,
    "right_step_time": 0.6,
    "walking_speed": 0.88,
    "balance_score": 79
  },
  {
    "date": "Sample 05",
    "left_step_time": 0.57,
    "right_step_time": 0.59,
    "walking_speed": 1.02,
    "balance_score": 83
  },
  {
    "date": "Sample 06",
    "left_step_time": 0.56,
    "right_step_time": 0.58,
    "walking_speed": 1.08,
    "balance_score": 86
  }
]
@require_GET
def health(request):
    return JsonResponse({"status":"ok","project":PROJECT,"framework":"Django","django_version":get_version()})
@require_GET
def measurements(request):
    return JsonResponse({"project":PROJECT,"items":ITEMS,"source":"fictional starter dataset","disclaimer":DISCLAIMER})
