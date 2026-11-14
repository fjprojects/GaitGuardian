import { useEffect, useMemo, useState } from "react";
import { getJson } from "./lib/api.js";
import { parseMeasurementCsv, toMeasurementCsv } from "./lib/csv.js";
import { compareMeasurementSessions, filterAndSortMeasurements, summarizeMeasurements } from "./lib/analysis.js";

function formatValue(value, decimals = 2) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toFixed(decimals);
}

function Chart({ rows }) {
  if (!rows.length) return <div className="chart-empty">No records match the current filters.</div>;
  const width = 640;
  const height = 220;
  const plot = { left: 42, right: 610, top: 22, bottom: 174 };
  const values = rows.map((row) => Number(row.walking_speed)).filter(Number.isFinite);
  if (!values.length) return <div className="chart-empty">The current dataset has no valid walking-speed values.</div>;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 0.1);
  const points = rows.map((row, index) => ({
    x: plot.left + (rows.length === 1 ? 0 : index * (plot.right - plot.left) / (rows.length - 1)),
    y: plot.bottom - ((Number(row.walking_speed) - minimum) / range) * (plot.bottom - plot.top),
    value: Number(row.walking_speed),
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Descriptive walking-speed values across the filtered sessions">
      {[0, 1, 2, 3].map((step) => {
        const y = plot.top + step * ((plot.bottom - plot.top) / 3);
        return <g key={step}><line x1={plot.left} x2={plot.right} y1={y} y2={y} className="chart-grid" /><text x="7" y={y + 4} className="chart-axis">{(maximum - step * range / 3).toFixed(2)}</text></g>;
      })}
      <path d={path} className="chart-line" />
      {points.map((point, index) => <circle key={rows[index].date + index} cx={point.x} cy={point.y} r="4.5" className="chart-point"><title>{rows[index].date}: {point.value.toFixed(2)} m/s</title></circle>)}
      <text x={plot.left} y="204" className="chart-axis">{rows[0].date}</text>
      <text x={plot.right} y="204" textAnchor="end" className="chart-axis">{rows[rows.length - 1].date}</text>
    </svg>
  );
}

export default function App() {
  const [apiRows, setApiRows] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [localRows, setLocalRows] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [sourceName, setSourceName] = useState("Illustrative sample dataset");
  const [query, setQuery] = useState("");
  const [minimumSpeed, setMinimumSpeed] = useState("");
  const [maximumSpeed, setMaximumSpeed] = useState("");
  const [sort, setSort] = useState("default");
  const [order, setOrder] = useState("asc");
  const [firstSessionId, setFirstSessionId] = useState("");
  const [secondSessionId, setSecondSessionId] = useState("");

  async function loadSample() {
    setStatus("loading");
    setError("");
    try {
      const [health, data, summaryData] = await Promise.all([
        getJson("/api/health/"),
        getJson("/api/measurements/?page_size=100"),
        getJson("/api/measurements/summary/").catch(() => null),
      ]);
      if (health.status !== "ok") throw new Error("The measurement API health check did not pass.");
      const items = Array.isArray(data.items) ? data.items : [];
      setApiRows(items);
      setApiSummary(summaryData?.statistics ? summaryData : summarizeMeasurements(items));
      setLocalRows(null);
      setSourceName("Illustrative sample dataset");
      setImportMessage("");
      setQuery("");
      setMinimumSpeed("");
      setMaximumSpeed("");
      setSort("default");
      setOrder("asc");
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Unable to load sample measurements.");
      setStatus("error");
    }
  }

  useEffect(() => { loadSample(); }, []);

  const rows = localRows ?? apiRows;
  const visibleRows = useMemo(
    () => filterAndSortMeasurements(rows, {
      query,
      minWalkingSpeed: minimumSpeed,
      maxWalkingSpeed: maximumSpeed,
      sort,
      order,
    }),
    [rows, query, minimumSpeed, maximumSpeed, sort, order],
  );
  const invalidRange = minimumSpeed !== "" && maximumSpeed !== ""
    && Number.isFinite(Number(minimumSpeed)) && Number.isFinite(Number(maximumSpeed))
    && Number(minimumSpeed) > Number(maximumSpeed);
  const hasDataFilters = Boolean(query || minimumSpeed !== "" || maximumSpeed !== "");
  const summary = !localRows && !hasDataFilters && apiSummary
    ? apiSummary
    : summarizeMeasurements(visibleRows);
  const statistics = summary.statistics;
  const comparisonFirst = rows.find((row) => row.date === firstSessionId) ?? rows[0] ?? null;
  const comparisonSecond = rows.find((row) => row.date === secondSessionId && row.date !== comparisonFirst?.date)
    ?? rows.find((row) => row.date !== comparisonFirst?.date)
    ?? null;
  const sessionComparison = compareMeasurementSessions(rows, comparisonFirst?.date, comparisonSecond?.date);
  const averageLeft = statistics.left_step_time.average;
  const averageRight = statistics.right_step_time.average;
  const averageStep = averageLeft === null || averageRight === null
    ? null
    : (averageLeft + averageRight) / 2;
  const timingGap = averageLeft === null || averageRight === null
    ? null
    : Math.abs(averageLeft - averageRight);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("The CSV is larger than the 5 MB import limit.");
      const parsed = parseMeasurementCsv(await file.text());
      setLocalRows(parsed);
      setSourceName(file.name);
      setImportMessage(`Loaded ${parsed.length} rows locally. The file was not uploaded.`);
      setError("");
    } catch (err) {
      setImportMessage(err.message || "Unable to parse this CSV file.");
    } finally {
      event.target.value = "";
    }
  }

  function exportCsv() {
    if (!visibleRows.length) return;
    const blob = new Blob([toMeasurementCsv(visibleRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gaitguardian-current-view.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setQuery("");
    setMinimumSpeed("");
    setMaximumSpeed("");
    setSort("default");
    setOrder("asc");
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
          <button className="dark-button" onClick={exportCsv} disabled={!visibleRows.length}>Export current view ↗</button>
        </div>
      </section>
      {importMessage && <div className="import-message" role="status">{importMessage}</div>}
      {status === "error" && <div className="state-card error-state"><strong>Sample data could not be loaded.</strong><p>{error}</p><button className="outline-button" onClick={loadSample}>Try again</button></div>}

      <section className="analysis-toolbar" aria-label="Measurement filters">
        <label className="analysis-field"><span>SEARCH SESSION</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Sample 03" /></label>
        <label className="analysis-field"><span>MIN SPEED (m/s)</span><input type="number" min="0" step="0.01" value={minimumSpeed} onChange={(event) => setMinimumSpeed(event.target.value)} placeholder="No minimum" /></label>
        <label className="analysis-field"><span>MAX SPEED (m/s)</span><input type="number" min="0" step="0.01" value={maximumSpeed} onChange={(event) => setMaximumSpeed(event.target.value)} placeholder="No maximum" /></label>
        <label className="analysis-field"><span>SORT RECORDS</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Source order</option><option value="date">Session label</option><option value="walking_speed">Walking speed</option><option value="left_step_time">Left step time</option><option value="right_step_time">Right step time</option></select></label>
        <label className="analysis-field"><span>ORDER</span><select value={order} onChange={(event) => setOrder(event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
        <button className="outline-button clear-analysis" type="button" onClick={clearFilters}>Clear</button>
      </section>
      {invalidRange && <div className="filter-warning" role="alert">Minimum walking speed must not exceed maximum walking speed.</div>}

      <section className="metrics-grid" aria-label="Descriptive dataset summary">
        <article className="metric-card"><span className="metric-label">AVERAGE WALKING SPEED</span><strong>{formatValue(statistics.walking_speed.average)}<small> m/s</small></strong><span className="metric-foot">Mean of {summary.measurement_count} visible records</span><span className="metric-icon">↗</span></article>
        <article className="metric-card"><span className="metric-label">LEFT / RIGHT STEP-TIME GAP</span><strong>{formatValue(timingGap, 3)}<small> s</small></strong><span className="metric-foot">Difference between dataset means</span><span className="metric-icon">⇄</span></article>
        <article className="metric-card"><span className="metric-label">AVERAGE STEP TIME</span><strong>{formatValue(averageStep)}<small> s</small></strong><span className="metric-foot">Mean of left/right averages</span><span className="metric-icon">◷</span></article>
        <article className="metric-card"><span className="metric-label">DATASET BALANCE VALUE</span><strong>{formatValue(statistics.balance_score.average, 1)}</strong><span className="metric-foot">Source-provided scale; not clinical</span><span className="metric-icon">◈</span></article>
      </section>

      <section className="panel session-comparison" aria-label="Compare two measurement sessions">
        <div className="panel-heading"><div><p className="eyebrow">SESSION COMPARISON</p><h2>Compare two sessions</h2><p>Review source values side by side and see the arithmetic difference.</p></div><span className="panel-tag">B − A</span></div>
        <div className="session-selects">
          <label className="analysis-field"><span>SESSION A</span><select value={comparisonFirst?.date ?? ""} onChange={(event) => setFirstSessionId(event.target.value)} disabled={!rows.length}><option value="" disabled>Select a session</option>{rows.map((row) => <option key={row.date} value={row.date}>{row.date}</option>)}</select></label>
          <label className="analysis-field"><span>SESSION B</span><select value={comparisonSecond?.date ?? ""} onChange={(event) => setSecondSessionId(event.target.value)} disabled={rows.length < 2}><option value="" disabled>Select another session</option>{rows.filter((row) => row.date !== comparisonFirst?.date).map((row) => <option key={row.date} value={row.date}>{row.date}</option>)}</select></label>
        </div>
        {sessionComparison ? <div className="table-scroll comparison-table"><table><thead><tr><th>MEASUREMENT</th><th>SESSION A</th><th>SESSION B</th><th>DIFFERENCE (B − A)</th></tr></thead><tbody>
          <tr><td>Left step time</td><td>{formatValue(sessionComparison.first.left_step_time, 3)} s</td><td>{formatValue(sessionComparison.second.left_step_time, 3)} s</td><td>{formatValue(sessionComparison.differences.left_step_time, 3)} s</td></tr>
          <tr><td>Right step time</td><td>{formatValue(sessionComparison.first.right_step_time, 3)} s</td><td>{formatValue(sessionComparison.second.right_step_time, 3)} s</td><td>{formatValue(sessionComparison.differences.right_step_time, 3)} s</td></tr>
          <tr><td>Walking speed</td><td>{formatValue(sessionComparison.first.walking_speed, 3)} m/s</td><td>{formatValue(sessionComparison.second.walking_speed, 3)} m/s</td><td>{formatValue(sessionComparison.differences.walking_speed, 3)} m/s</td></tr>
          <tr><td>Balance value</td><td>{formatValue(sessionComparison.first.balance_score, 1)}</td><td>{formatValue(sessionComparison.second.balance_score, 1)}</td><td>{formatValue(sessionComparison.differences.balance_score, 2)}</td></tr>
        </tbody></table></div> : <div className="chart-empty comparison-empty">Load at least two measurement sessions to compare them.</div>}
        <p className="comparison-note">Differences are calculated as Session B minus Session A. They are descriptive arithmetic only and do not indicate improvement, deterioration or clinical meaning.</p>
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">TREND EXPLORER</p><h2>Walking-speed measurements</h2><p>Each point represents one row in the current filtered view.</p></div><span className="panel-tag">{visibleRows.length} / {rows.length} RECORDS</span></div>
          {status === "loading" ? <div className="chart-empty">Loading data…</div> : <Chart rows={visibleRows} />}
        </article>
        <aside className="panel dataset-panel">
          <p className="eyebrow">DATASET DETAILS</p><h2>Know what you are viewing.</h2>
          <div className="dataset-item"><span>Source</span><strong>{localRows ? "Local CSV" : "Django API sample"}</strong></div>
          <div className="dataset-item"><span>Records in source</span><strong>{rows.length}</strong></div>
          <div className="dataset-item"><span>Records in view</span><strong>{visibleRows.length}</strong></div>
          <div className="dataset-item"><span>File / dataset</span><strong className="dataset-filename">{sourceName}</strong></div>
          <div className="dataset-callout"><strong>Interpret with care</strong><p>All displayed values are descriptive calculations over the supplied data. They are not fall-risk estimates, diagnoses, clinical scores or predictions.</p></div>
        </aside>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading"><div><p className="eyebrow">SESSION REGISTER</p><h2>Measurement records</h2><p>Review the exact values included in the current view.</p></div><span className="panel-tag">READ ONLY</span></div>
        <div className="table-scroll"><table><thead><tr><th>SESSION</th><th>LEFT STEP</th><th>RIGHT STEP</th><th>WALKING SPEED</th><th>BALANCE VALUE</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.date + index}><td><strong>{row.date}</strong></td><td>{formatValue(row.left_step_time)} s</td><td>{formatValue(row.right_step_time)} s</td><td><strong>{formatValue(row.walking_speed)} m/s</strong></td><td>{formatValue(row.balance_score, 1)}</td></tr>)}</tbody></table>{!visibleRows.length && <div className="empty-table">No measurement rows match the current filters.</div>}</div>
      </section>
      <section className="boundary-panel"><span>i</span><div><strong>Data handling and clinical boundary</strong><p>CSV files are parsed locally in this browser and are not sent to the Django API. The included server dataset is fictional. This project is a descriptive data-visualisation prototype, not a fall-risk detector or medical assessment.</p></div></section>
      <footer className="site-footer"><span>GAITGUARDIAN <i>·</i> MOBILITY DATA WORKSPACE</span><span>React + Django <b>·</b> Descriptive analytics only</span></footer>
    </main>
  );
}
