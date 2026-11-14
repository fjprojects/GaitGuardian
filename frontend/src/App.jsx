import { useEffect, useMemo, useState } from "react";
import { getJson } from "./lib/api.js";
import { parseMeasurementCsv, toMeasurementCsv } from "./lib/csv.js";

function mean(rows, key) {
  return rows.length ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length : 0;
}

function Chart({ rows }) {
  if (!rows.length) return <div className="chart-empty">Load measurements to display the trend.</div>;
  const width = 640;
  const height = 220;
  const plot = { left: 42, right: 610, top: 22, bottom: 174 };
  const values = rows.map((row) => Number(row.walking_speed));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 0.1);
  const points = values.map((value, index) => ({
    x: plot.left + (rows.length === 1 ? 0 : index * (plot.right - plot.left) / (rows.length - 1)),
    y: plot.bottom - ((value - minimum) / range) * (plot.bottom - plot.top),
    value,
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Descriptive walking-speed values across the imported sessions">
      {[0, 1, 2, 3].map((step) => {
        const y = plot.top + step * ((plot.bottom - plot.top) / 3);
        return <g key={step}><line x1={plot.left} x2={plot.right} y1={y} y2={y} className="chart-grid" /><text x="7" y={y + 4} className="chart-axis">{(maximum - step * range / 3).toFixed(2)}</text></g>;
      })}
      <path d={path} className="chart-line" />
      {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4.5" className="chart-point"><title>{rows[index].date}: {point.value.toFixed(2)} m/s</title></circle>)}
      <text x={plot.left} y="204" className="chart-axis">{rows[0].date}</text>
      <text x={plot.right} y="204" textAnchor="end" className="chart-axis">{rows[rows.length - 1].date}</text>
    </svg>
  );
}

export default function App() {
  const [apiRows, setApiRows] = useState([]);
  const [localRows, setLocalRows] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [sourceName, setSourceName] = useState("Illustrative sample dataset");

  async function loadSample() {
    setStatus("loading");
    setError("");
    try {
      const [health, data] = await Promise.all([
        getJson("/api/health/"),
        getJson("/api/measurements/"),
      ]);
      if (health.status !== "ok") throw new Error("The API health check did not pass.");
      setApiRows(data.items ?? []);
      setLocalRows(null);
      setSourceName("Illustrative sample dataset");
      setImportMessage("");
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Unable to load sample measurements.");
      setStatus("error");
    }
  }

  useEffect(() => { loadSample(); }, []);

  const rows = localRows ?? apiRows;
  const averageSpeed = mean(rows, "walking_speed");
  const averageLeft = mean(rows, "left_step_time");
  const averageRight = mean(rows, "right_step_time");
  const averageStep = (averageLeft + averageRight) / 2;
  const timingDifference = averageStep > 0 ? Math.abs(averageLeft - averageRight) / averageStep * 100 : 0;
  const symmetry = Math.max(0, 100 - timingDifference);
  const averageScore = mean(rows, "balance_score");

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("The CSV is larger than the 5 MB import limit.");
      const parsed = parseMeasurementCsv(await file.text());
      setLocalRows(parsed);
      setSourceName(file.name);
      setImportMessage(`Loaded ${parsed.length} rows locally. The file was not uploaded.`);
    } catch (err) {
      setImportMessage(err.message || "Unable to parse this CSV file.");
    } finally {
      event.target.value = "";
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const blob = new Blob([toMeasurementCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gaitguardian-measurements.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="GaitGuardian home"><span className="brand-symbol">⌁</span><span>GaitGuardian<span className="brand-sub"> / mobility insights</span></span></a>
        <div className="header-right">
          <span className={`system-status ${status}`}><i />{status === "ready" ? "API connected" : status === "loading" ? "Connecting" : "API unavailable"}</span>
          <a className="header-link" href="/prototype.html" target="_blank" rel="noreferrer">Original dashboard ↗</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MOBILITY DATA · DESCRIPTIVE ANALYTICS</p>
          <h1>See the pattern.<br /><em>Understand the context.</em></h1>
          <p className="hero-description">A clean workspace for reviewing walking-measurement datasets over time. Explore the numbers, inspect each session and keep the data source visible.</p>
          <div className="hero-foot"><span className="pulse-dot" /> {sourceName}</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-circle circle-one" /><div className="art-circle circle-two" /><span>↗</span><small>MEASURE / REVIEW / CONTEXT</small></div>
      </section>

      <section className="toolbar-card">
        <div><p className="eyebrow">DATA WORKSPACE</p><h2>Measurement overview</h2><p>Import a CSV for local review or restore the server's fictional sample dataset.</p></div>
        <div className="toolbar-actions">
          <label className="upload-button">＋ Import CSV<input type="file" accept=".csv,text/csv" onChange={handleImport} /></label>
          <button className="outline-button" onClick={loadSample}>Restore sample</button>
          <button className="dark-button" onClick={exportCsv} disabled={!rows.length}>Export CSV ↗</button>
        </div>
      </section>
      {importMessage && <div className="import-message" role="status">{importMessage}</div>}
      {status === "error" && <div className="state-card error-state"><strong>Sample data could not be loaded.</strong><p>{error}</p><button className="outline-button" onClick={loadSample}>Try again</button></div>}

      <section className="metrics-grid" aria-label="Descriptive dataset summary">
        <article className="metric-card"><span className="metric-label">AVERAGE WALKING SPEED</span><strong>{rows.length ? averageSpeed.toFixed(2) : "—"}<small> m/s</small></strong><span className="metric-foot">Mean of {rows.length} records</span><span className="metric-icon">↗</span></article>
        <article className="metric-card"><span className="metric-label">LEFT / RIGHT TIMING MATCH</span><strong>{rows.length ? symmetry.toFixed(1) : "—"}<small>%</small></strong><span className="metric-foot">Descriptive comparison only</span><span className="metric-icon">⇄</span></article>
        <article className="metric-card"><span className="metric-label">AVERAGE STEP TIME</span><strong>{rows.length ? averageStep.toFixed(2) : "—"}<small> s</small></strong><span className="metric-foot">Mean of left and right values</span><span className="metric-icon">◷</span></article>
        <article className="metric-card"><span className="metric-label">DATASET BALANCE VALUE</span><strong>{rows.length ? averageScore.toFixed(1) : "—"}</strong><span className="metric-foot">Source-provided scale; not clinical</span><span className="metric-icon">◈</span></article>
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">TREND EXPLORER</p><h2>Walking-speed measurements</h2><p>Each point represents one row in the current dataset.</p></div><span className="panel-tag">{rows.length} RECORDS</span></div>
          {status === "loading" ? <div className="chart-empty">Loading data…</div> : <Chart rows={rows} />}
        </article>
        <aside className="panel dataset-panel">
          <p className="eyebrow">DATASET DETAILS</p><h2>Know what you are viewing.</h2>
          <div className="dataset-item"><span>Source</span><strong>{localRows ? "Local CSV" : "Django API sample"}</strong></div>
          <div className="dataset-item"><span>Records</span><strong>{rows.length}</strong></div>
          <div className="dataset-item"><span>File / dataset</span><strong className="dataset-filename">{sourceName}</strong></div>
          <div className="dataset-callout"><strong>Interpret with care</strong><p>The indicators are descriptive calculations over the supplied data. They are not fall-risk estimates, diagnoses, clinical scores or predictions.</p></div>
        </aside>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading"><div><p className="eyebrow">SESSION REGISTER</p><h2>Measurement records</h2><p>Review the exact values included in the current dataset.</p></div><span className="panel-tag">READ ONLY</span></div>
        <div className="table-scroll"><table><thead><tr><th>SESSION</th><th>LEFT STEP</th><th>RIGHT STEP</th><th>WALKING SPEED</th><th>BALANCE VALUE</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.date + index}><td><strong>{row.date}</strong></td><td>{Number(row.left_step_time).toFixed(2)} s</td><td>{Number(row.right_step_time).toFixed(2)} s</td><td><strong>{Number(row.walking_speed).toFixed(2)} m/s</strong></td><td>{Number(row.balance_score).toFixed(1)}</td></tr>)}</tbody></table>{!rows.length && <div className="empty-table">No measurement rows are available.</div>}</div>
      </section>
      <section className="boundary-panel"><span>i</span><div><strong>Data handling and clinical boundary</strong><p>CSV files are parsed locally in this browser and are not sent to the Django API. The included server dataset is fictional. This project is a descriptive data-visualisation prototype, not a fall-risk detector or medical assessment.</p></div></section>
      <footer className="site-footer"><span>GAITGUARDIAN <i>·</i> MOBILITY DATA WORKSPACE</span><span>React + Django <b>·</b> Descriptive analytics only</span></footer>
    </main>
  );
}
