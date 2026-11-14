from django.db import models


class Measurement(models.Model):
    """A demonstration measurement row; not a clinical assessment."""

    date = models.CharField(max_length=80, unique=True)
    left_step_time = models.DecimalField(max_digits=7, decimal_places=3)
    right_step_time = models.DecimalField(max_digits=7, decimal_places=3)
    walking_speed = models.DecimalField(max_digits=7, decimal_places=3)
    balance_score = models.DecimalField(max_digits=7, decimal_places=2)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self):
        return self.date
