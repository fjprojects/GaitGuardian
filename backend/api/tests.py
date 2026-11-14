from django.test import TestCase
from api.models import Measurement


class MeasurementApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        Measurement.objects.create(
            date="Sample 01",
            left_step_time="0.600",
            right_step_time="0.620",
            walking_speed="0.780",
            balance_score="76.00",
            sort_order=1,
        )
        Measurement.objects.create(
            date="Sample 02",
            left_step_time="0.590",
            right_step_time="0.610",
            walking_speed="0.830",
            balance_score="78.00",
            sort_order=2,
        )

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_measurement_endpoint_returns_numeric_values(self):
        response = self.client.get("/api/measurements/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertIsInstance(data["items"][0]["walking_speed"], float)
        self.assertIn("disclaimer", data)

    def test_measurement_endpoint_rejects_post(self):
        response = self.client.post("/api/measurements/", data={})
        self.assertEqual(response.status_code, 405)
