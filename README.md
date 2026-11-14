# GaitGuardian

A mobility-monitoring dashboard concept for exploring walking-pattern measurements over time.

## Current prototype

- Display a small set of fictional walking-session measurements.
- Calculate descriptive averages for speed, step time, and left/right timing similarity.
- Visualise walking-speed values across sessions.
- Load a CSV file locally in the browser and review its measurements.

## CSV format

The uploaded file should include these columns:

`date,left_step_time,right_step_time,walking_speed,balance_score`

The prototype parses the selected file locally in the browser. It does not upload the file to a server.

## Important scope note

This is a **descriptive visualisation prototype**, not a fall-risk detector, diagnosis, prediction system, or medical assessment. The built-in dataset is fictional, and values such as the balance score use a dataset-provided scale rather than a clinical standard.

## Run locally

No build tools or dependencies are required. Open `index.html` in a modern browser, or serve this folder with any static web server.

## Roadmap

- Document measurement definitions and provenance.
- Validate data quality and measurement reliability before drawing conclusions.
- Evaluate with appropriate domain experts and ethical safeguards.
- Add securely managed data import only after defining consent and privacy requirements.
