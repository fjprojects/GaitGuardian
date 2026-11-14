from django.test import TestCase, override_settings

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

    def test_health_endpoint_reports_database_mode(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["project"], "GaitGuardian")
        self.assertEqual(response.json()["database"], "connected")
        self.assertIn("descriptive-summary", response.json()["services"])

    def test_descriptive_summary_returns_min_max_and_average(self):
        response = self.client.get("/api/measurements/summary/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["measurement_count"], 2)
        self.assertEqual(
            payload["statistics"]["walking_speed"],
            {"minimum": 0.78, "maximum": 0.83, "average": 0.805},
        )
        self.assertIn("Descriptive statistics only", payload["interpretation"])
        self.assertIn("does not calculate fall risk", payload["disclaimer"])

    def test_summary_handles_empty_database(self):
        Measurement.objects.all().delete()
        response = self.client.get("/api/measurements/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["measurement_count"], 0)
        self.assertEqual(
            response.json()["statistics"]["walking_speed"],
            {"minimum": None, "maximum": None, "average": None},
        )

    def test_measurement_endpoint_returns_numeric_values_and_metadata(self):
        response = self.client.get("/api/measurements/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["pagination"]["total_items"], 2)
        self.assertIsInstance(data["items"][0]["walking_speed"], float)
        self.assertIn("disclaimer", data)

    def test_search_filters_by_sample_label(self):
        response = self.client.get("/api/measurements/?q=sample%2002")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["date"] for item in response.json()["items"]], ["Sample 02"])

    def test_walking_speed_range_filters_records(self):
        response = self.client.get(
            "/api/measurements/?min_walking_speed=0.80&max_walking_speed=0.90"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["date"] for item in response.json()["items"]], ["Sample 02"])

    def test_speed_sort_and_pagination(self):
        response = self.client.get(
            "/api/measurements/?sort=walking_speed&order=desc&page_size=1"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 2)
        self.assertEqual(payload["items"][0]["date"], "Sample 02")
        self.assertTrue(payload["pagination"]["has_next"])

    def test_invalid_numeric_filter_returns_structured_error(self):
        response = self.client.get("/api/measurements/?min_walking_speed=fast")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["parameter"], "min_walking_speed")

    def test_inverted_speed_range_is_rejected(self):
        response = self.client.get(
            "/api/measurements/?min_walking_speed=1.0&max_walking_speed=0.5"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot be greater", response.json()["error"]["message"])

    def test_measurement_endpoint_rejects_post(self):
        response = self.client.post("/api/measurements/", data={})
        self.assertEqual(response.status_code, 405)


class MeasurementStaticDemoModeTests(TestCase):
    @override_settings(DEMO_DATA_MODE=True)
    def test_dataset_is_available_without_database_seed(self):
        response = self.client.get("/api/measurements/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 6)
        self.assertEqual(payload["pagination"]["total_items"], 6)
        self.assertIsInstance(payload["items"][0]["walking_speed"], float)

    @override_settings(DEMO_DATA_MODE=True)
    def test_static_demo_mode_is_reported_by_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data_mode"], "static-demo")
        self.assertEqual(response.json()["database"], "not-required")

    @override_settings(DEMO_DATA_MODE=True)
    def test_static_demo_mode_uses_the_same_speed_filters(self):
        response = self.client.get("/api/measurements/?min_walking_speed=1.0")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["date"] for item in response.json()["items"]],
            ["Sample 05", "Sample 06"],
        )

    @override_settings(DEMO_DATA_MODE=True)
    def test_static_demo_mode_calculates_descriptive_summary(self):
        response = self.client.get("/api/measurements/summary/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["measurement_count"], 6)
        self.assertGreater(
            payload["statistics"]["walking_speed"]["maximum"],
            payload["statistics"]["walking_speed"]["minimum"],
        )
