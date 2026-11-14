from decimal import Decimal

from django import get_version
from django.conf import settings
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Measurement
from .pagination import (
    decimal_parameter,
    error_response,
    paginate_items,
    text_parameter,
)

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

SORT_FIELDS = {
    "date": "date",
    "walking_speed": "walking_speed",
    "left_step_time": "left_step_time",
    "right_step_time": "right_step_time",
}


def _database_ready():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except DatabaseError:
        return False


def _measurement_records():
    if settings.DEMO_DATA_MODE:
        return [dict(item) for item in DEMO_MEASUREMENTS]

    return [
        {
            "date": item.date,
            "left_step_time": float(item.left_step_time),
            "right_step_time": float(item.right_step_time),
            "walking_speed": float(item.walking_speed),
            "balance_score": float(item.balance_score),
        }
        for item in Measurement.objects.all()
    ]


@require_GET
def health(request):
    database = "not-required" if settings.DEMO_DATA_MODE else (
        "connected" if _database_ready() else "unavailable"
    )
    if database == "unavailable":
        return JsonResponse({
            "status": "degraded",
            "project": PROJECT,
            "database": database,
            "data_mode": "database",
        }, status=503)

    return JsonResponse({
        "status": "ok",
        "project": PROJECT,
        "framework": "Django",
        "django_version": get_version(),
        "database": database,
        "services": ["measurements"],
        "data_mode": "static-demo" if settings.DEMO_DATA_MODE else "database",
    })


@require_GET
def measurements(request):
    query, error = text_parameter(request, "q", max_length=100)
    if error:
        return error
    sort, error = text_parameter(request, "sort", max_length=30)
    if error:
        return error
    order, error = text_parameter(request, "order", max_length=10)
    if error:
        return error
    minimum_speed, error = decimal_parameter(request, "min_walking_speed")
    if error:
        return error
    maximum_speed, error = decimal_parameter(request, "max_walking_speed")
    if error:
        return error

    sort = sort or "default"
    order = order or "asc"
    if sort not in {"default", *SORT_FIELDS.keys()}:
        return error_response(
            "Use one of: default, date, walking_speed, left_step_time, right_step_time.",
            parameter="sort",
        )
    if order not in {"asc", "desc"}:
        return error_response("Use 'asc' or 'desc'.", parameter="order")
    if (
        minimum_speed is not None
        and maximum_speed is not None
        and minimum_speed > maximum_speed
    ):
        return error_response(
            "'min_walking_speed' cannot be greater than 'max_walking_speed'.",
            parameter="min_walking_speed",
        )

    records = _measurement_records()
    if query:
        term = query.casefold()
        records = [item for item in records if term in item["date"].casefold()]

    if minimum_speed is not None:
        records = [
            item for item in records
            if Decimal(str(item["walking_speed"])) >= minimum_speed
        ]
    if maximum_speed is not None:
        records = [
            item for item in records
            if Decimal(str(item["walking_speed"])) <= maximum_speed
        ]

    if sort != "default":
        sort_field = SORT_FIELDS[sort]
        records.sort(
            key=lambda item: (
                item[sort_field].casefold()
                if sort_field == "date"
                else Decimal(str(item[sort_field]))
            ),
            reverse=(order == "desc"),
        )

    page_items, pagination, error = paginate_items(request, records)
    if error:
        return error

    return JsonResponse({
        "project": PROJECT,
        "count": len(records),
        "items": page_items,
        "pagination": pagination,
        "filters": {
            "q": query or None,
            "min_walking_speed": str(minimum_speed) if minimum_speed is not None else None,
            "max_walking_speed": str(maximum_speed) if maximum_speed is not None else None,
        },
        "sort": {"by": sort, "order": order},
        "source": "fictional demonstration dataset",
        "disclaimer": DISCLAIMER,
    })
