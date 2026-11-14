from django.urls import path
from . import views
urlpatterns=[path("health/",views.health),path("measurements/",views.measurements)]
