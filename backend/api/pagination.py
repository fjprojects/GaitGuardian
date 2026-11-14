from django.http import JsonResponse

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


def error_response(message, *, parameter=None, code="invalid_request", status=400):
    error = {"code": code, "message": message}
    if parameter:
        error["parameter"] = parameter
    return JsonResponse({"error": error}, status=status)


def text_parameter(request, name, *, max_length=100):
    value = request.GET.get(name, "").strip()
    if len(value) > max_length:
        return "", error_response(
            f"'{name}' must be at most {max_length} characters.",
            parameter=name,
        )
    return value, None


def decimal_parameter(request, name):
    from decimal import Decimal, InvalidOperation

    raw_value = request.GET.get(name)
    if raw_value is None or not raw_value.strip():
        return None, None

    try:
        value = Decimal(raw_value.strip())
    except (InvalidOperation, AttributeError):
        return None, error_response(
            f"'{name}' must be a valid number.",
            parameter=name,
        )

    if not value.is_finite():
        return None, error_response(
            f"'{name}' must be a finite number.",
            parameter=name,
        )
    return value, None


def paginate_items(request, items):
    """Return a page of an already-filtered sequence and stable pagination metadata."""
    raw_page = request.GET.get("page", "1").strip()
    raw_page_size = request.GET.get("page_size", str(DEFAULT_PAGE_SIZE)).strip()

    try:
        page = int(raw_page)
    except (TypeError, ValueError):
        return None, None, error_response(
            "'page' must be a positive integer.", parameter="page"
        )

    try:
        page_size = int(raw_page_size)
    except (TypeError, ValueError):
        return None, None, error_response(
            "'page_size' must be an integer.", parameter="page_size"
        )

    if page < 1:
        return None, None, error_response(
            "'page' must be at least 1.", parameter="page"
        )
    if page_size < 1 or page_size > MAX_PAGE_SIZE:
        return None, None, error_response(
            f"'page_size' must be between 1 and {MAX_PAGE_SIZE}.",
            parameter="page_size",
        )

    total = len(items)
    total_pages = (total + page_size - 1) // page_size
    if page > max(1, total_pages):
        return None, None, error_response(
            f"Page {page} is out of range; the result contains {total} item(s).",
            parameter="page",
            code="page_out_of_range",
        )

    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]
    metadata = {
        "page": page,
        "page_size": page_size,
        "total_items": total,
        "total_pages": total_pages,
        "has_next": end < total,
        "has_previous": page > 1,
    }
    return page_items, metadata, None
