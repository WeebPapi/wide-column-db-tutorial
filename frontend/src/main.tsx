import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, Check, Database, Play, RefreshCw, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ApiResult } from "./services/api";
import { steps, presenterSteps, sqlComparison, tutorialTimeline } from "./data/workshop";
import { CodeBlock } from "./components/CodeBlock";
import { ResultTable } from "./components/ResultTable";
import "./styles.css";

type Mode = "workshop" | "presenter" | "tutorial";

function useProgress() {
  const [done, setDone] = useState<string[]>(() => JSON.parse(localStorage.getItem("cassandra-progress") || "[]"));
  const toggle = (step: string) => {
    const next = done.includes(step) ? done.filter((s) => s !== step) : [...done, step];
    setDone(next);
    localStorage.setItem("cassandra-progress", JSON.stringify(next));
  };
  const reset = () => {
    setDone([]);
    localStorage.removeItem("cassandra-progress");
  };
  return { done, toggle, reset };
}

function App() {
  const [mode, setMode] = useState<Mode>("workshop");
  const [active, setActive] = useState(0);
  const { done, toggle, reset } = useProgress();

  return (
    <div className={`app ${mode}`}>
      <aside className="sidebar">
        <div className="brand"><Database size={28} /> <span>Cassandra Workshop</span></div>
        <div className="modeSwitch">
          {(["workshop", "presenter", "tutorial"] as Mode[]).map((m) => (
            <button className={mode === m ? "selected" : ""} onClick={() => setMode(m)} key={m}>{m}</button>
          ))}
        </div>
        <div className="progress">{done.length}/{steps.length} complete</div>
        <nav>
          {steps.map((step, index) => (
            <button key={step} className={active === index ? "active" : ""} onClick={() => setActive(index)}>
              <span>{done.includes(step) ? <Check size={16} /> : index + 1}</span>
              {step}
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={reset}><RotateCcw size={16} /> Reset progress</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Wide-column databases using Apache Cassandra</p>
            <h1>{mode === "presenter" ? "Presenter Mode" : mode === "tutorial" ? "Tutorial Mode" : steps[active]}</h1>
          </div>
          <button onClick={() => toggle(steps[active])}><Check size={18} /> Mark step</button>
        </header>
        {mode === "presenter" ? <PresenterMode /> : mode === "tutorial" ? <TutorialMode /> : <Workshop active={active} />}
      </main>
    </div>
  );
}

function Workshop({ active }: { active: number }) {
  if ([5, 6].includes(active)) return <StatusPanel />;
  if (active === 4) return <SchemaExplorer />;
  if ([7, 8, 9, 10].includes(active)) return <GuidedQueries kind={active} />;
  if (active === 13) return <Denormalization />;
  if (active === 14) return <UnsupportedChallenge />;
  if (active === 15) return <DesignExercise />;
  if (active === 16) return <SqlComparison />;
  if (active === 17) return <GenAIExercise />;
  if (active === 18) return <Benchmark />;
  if (active === 19) return <Summary />;
  return <ConceptPage active={active} />;
}

function ConceptPage({ active }: { active: number }) {
  const copy = [
    ["Welcome", "This local app is the live demo, tutorial handout, query runner, schema explorer, and exercise sheet in one place."],
    ["Wide-column database", "A wide-column database stores rows in tables, but it is optimized around partitioned, distributed reads and writes rather than relational joins."],
    ["Cassandra mental model", "Choose a partition key to locate data, clustering columns to order data inside that partition, and duplicate rows when another query needs another shape."],
    ["Use case", "High-volume application activity tracking fits Cassandra because writes are frequent, data is time-oriented, and access patterns are predictable."],
    ["Partition keys", "A partition key decides which node owns the data. Good keys are specific, balanced, and bounded by time buckets when streams can grow forever."],
    ["Clustering columns", "Clustering columns order rows inside one partition. In this project event_time DESC gives newest-first event history."],
  ][active] || ["Workshop", "Use the sidebar to move through the demo. Each step includes a task, expected outcome, and teaching point."];
  return (
    <section className="panel hero">
      <p className="eyebrow">Step {active + 1}</p>
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <div className="callout">Core message: Cassandra tables are designed around the queries the application must answer.</div>
    </section>
  );
}

function StatusPanel() {
  const [status, setStatus] = useState<ApiResult | null>(null);
  const [seed, setSeed] = useState(42);
  const [size, setSize] = useState("small");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const refresh = async () => setStatus(await api.status());
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);
  const run = async (label: string, action: () => Promise<ApiResult>) => {
    setBusy(label); setError("");
    try { setStatus(await action()); await refresh(); } catch (e) { setError((e as Error).message); }
    setBusy("");
  };
  const counts = (status?.rowCounts || {}) as Record<string, number | null>;
  return (
    <section className="grid two">
      <div className="panel">
        <h2>System Status</h2>
        <p>Cassandra may take a minute to accept connections. The backend retries initialization and reports readable errors.</p>
        {error && <div className="error">{error}</div>}
        <div className="statusLine"><span>Backend</span><b>{String(status?.backend || "checking")}</b></div>
        <div className="statusLine"><span>Cassandra</span><b>{String((status?.cassandra as any)?.connected ?? false)}</b></div>
        <div className="statusLine"><span>Keyspace</span><b>{String(status?.keyspace ?? false)}</b></div>
        <div className="actions">
          <button disabled={!!busy} onClick={() => run("init", api.initialize)}><Database size={18} /> Initialize database</button>
          <button disabled={!!busy} onClick={() => run("load", () => api.loadData(seed, size))}><Play size={18} /> Generate and load demo data</button>
          <button className="danger" disabled={!!busy} onClick={() => confirm("Reset Cassandra tutorial schema?") && run("reset", api.reset)}><ShieldAlert size={18} /> Reset database</button>
          <button disabled={!!busy} onClick={() => refresh()}><RefreshCw size={18} /> Refresh</button>
        </div>
        <div className="formRow">
          <label>Seed <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></label>
          <label>Dataset <select value={size} onChange={(e) => setSize(e.target.value)}><option>small</option><option>large</option></select></label>
        </div>
        {busy && <div className="callout">Running {busy}...</div>}
      </div>
      <div className="panel">
        <h2>Row Counts</h2>
        {Object.entries(counts).map(([table, count]) => <div className="statusLine" key={table}><span>{table}</span><b>{count ?? "n/a"}</b></div>)}
        {Boolean(status?.lastLoadedStats) && <Chart data={Object.entries(((status?.lastLoadedStats as any).eventTypes || {})).map(([name, count]) => ({ name, count }))} />}
      </div>
    </section>
  );
}

function Chart({ data }: { data: { name: string; count: unknown }[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" /></BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SchemaExplorer() {
  const [tables, setTables] = useState<Record<string, any>[]>([]);
  useEffect(() => { api.schema().then(setTables); }, []);
  return (
    <section className="grid schemaGrid">
      {tables.map((table) => (
        <article className="panel" key={table.name}>
          <h2>{table.name}</h2>
          <p>{table.purpose}</p>
          <div className="miniTitle">Query</div><p>{table.supportedQuery}</p>
          <Labels title="Partition key" values={table.partitionKey} type="partition" />
          <Labels title="Clustering columns" values={table.clusteringColumns} type="cluster" />
          <Labels title="Regular columns" values={table.regularColumns} type="regular" />
          <div className="sample">{table.sampleRow}</div>
          <div className="callout">{table.partitionShape}</div>
        </article>
      ))}
    </section>
  );
}

function Labels({ title, values, type }: { title: string; values: string[]; type: string }) {
  return <div><div className="miniTitle">{title}</div><div className="labels">{values.map((v) => <span className={type} key={v}>{v}</span>)}</div></div>;
}

function GuidedQueries({ kind }: { kind: number }) {
  const latestDay = new Date().toISOString().slice(0, 10);
  const configs: Record<number, any> = {
    7: { title: "Events by user", endpoint: "/api/events/by-user", params: [["userId", "user_001"], ["eventDate", latestDay]], cql: "SELECT * FROM events_by_user WHERE user_id=? AND event_date=? LIMIT ?;", point: "The full partition key is supplied: user_id and event_date." },
    8: { title: "Events by type", endpoint: "/api/events/by-type", params: [["eventType", "purchase"], ["eventDate", latestDay]], cql: "SELECT * FROM events_by_type WHERE event_type=? AND event_date=? LIMIT ?;", point: "A duplicated table answers type-based reads without scanning users." },
    9: { title: "Errors by service", endpoint: "/api/errors/by-service", params: [["service", "checkout"], ["eventDate", latestDay]], cql: "SELECT * FROM errors_by_service WHERE service=? AND event_date=? LIMIT ?;", point: "The service and day identify a bounded operational partition." },
    10: { title: "Events by device", endpoint: "/api/events/by-device", params: [["deviceId", "device_03"], ["eventDate", latestDay]], cql: "SELECT * FROM events_by_device WHERE device_id=? AND event_date=? LIMIT ?;", point: "Device histories are stored together by day." }
  };
  const cfg = configs[kind];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(cfg.params));
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState<ApiResult>({});
  const [error, setError] = useState("");
  const run = async () => {
    const params = new URLSearchParams({ ...values, limit: String(limit) });
    try { setError(""); setResult(await api.query(`${cfg.endpoint}?${params}`)); } catch (e) { setError((e as Error).message); }
  };
  return (
    <section className="grid two">
      <div className="panel">
        <h2>{cfg.title}</h2>
        <p>Plain-language question: retrieve the latest matching events using a known Cassandra partition.</p>
        <CodeBlock>{cfg.cql}</CodeBlock>
        <div className="formStack">
          {cfg.params.map(([key]: [string, string]) => <label key={key}>{key}<input value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /></label>)}
          <label>limit<input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></label>
        </div>
        <button onClick={run}><Search size={18} /> Run query</button>
        {error && <div className="error">{error}</div>}
        <div className="callout">{cfg.point}</div>
      </div>
      <div className="panel">
        <h2>Result {result.durationMs ? `(${result.durationMs} ms)` : ""}</h2>
        <ResultTable rows={result.rows} />
      </div>
    </section>
  );
}

function Denormalization() {
  const [eventId, setEventId] = useState("");
  const [result, setResult] = useState<ApiResult>({});
  return (
    <section className="grid two">
      <div className="panel">
        <h2>Denormalization Explorer</h2>
        <p>Paste an event_id from any query result to see which query-specific tables contain the same logical event.</p>
        <input placeholder="event UUID" value={eventId} onChange={(e) => setEventId(e.target.value)} />
        <button onClick={() => api.query(`/api/events/${eventId}/copies`).then(setResult)}><Search size={18} /> Find copies</button>
        <div className="callout">Cassandra often duplicates data into multiple tables so each application query can stay simple and fast.</div>
      </div>
      <div className="panel"><ResultTable rows={result.rows} /></div>
    </section>
  );
}

function UnsupportedChallenge() {
  return (
    <section className="panel">
      <h2>Unsupported Query Challenge</h2>
      <p>Challenge: find every purchase over EUR 100 across all users and all dates, ordered globally by amount.</p>
      <div className="choiceGrid">
        {["events_by_user", "events_by_type", "events_by_device", "daily_user_activity"].map((name) => <button key={name}>{name}</button>)}
      </div>
      <div className="error">No existing table naturally supports this query.</div>
      <p>No partition key groups “all purchases over EUR 100”. Cassandra also does not provide arbitrary global cross-partition sorting. ALLOW FILTERING would turn the problem into an expensive scan, not a good design.</p>
      <div className="callout">Better options: create a query-specific table, use an analytics system, or use a relational database if flexible reporting is the primary need.</div>
    </section>
  );
}

function DesignExercise() {
  const [partitionKeys, setPartitionKeys] = useState("device_id,event_date");
  const [clusteringColumns, setClusteringColumns] = useState("event_time,event_id");
  const [clusteringOrder, setClusteringOrder] = useState("DESC");
  const [result, setResult] = useState<ApiResult | null>(null);
  const validate = () => api.validateDesign({
    partitionKeys: partitionKeys.split(",").map((s) => s.trim()).filter(Boolean),
    clusteringColumns: clusteringColumns.split(",").map((s) => s.trim()).filter(Boolean),
    clusteringOrder
  }).then(setResult);
  return (
    <section className="grid two">
      <div className="panel">
        <h2>Design a New Table</h2>
        <p>Requirement: show the latest purchase events for a specific device on a specific day.</p>
        <label>Partition key fields<input value={partitionKeys} onChange={(e) => setPartitionKeys(e.target.value)} /></label>
        <label>Clustering columns<input value={clusteringColumns} onChange={(e) => setClusteringColumns(e.target.value)} /></label>
        <label>Clustering order<select value={clusteringOrder} onChange={(e) => setClusteringOrder(e.target.value)}><option>DESC</option><option>ASC</option></select></label>
        <button onClick={validate}><Check size={18} /> Validate design</button>
      </div>
      <div className="panel">
        <h2>Expected Model</h2>
        <CodeBlock>{`CREATE TABLE purchases_by_device (
  device_id text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  user_id text,
  amount decimal,
  metadata text,
  PRIMARY KEY ((device_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);`}</CodeBlock>
        {result && <div className={result.valid ? "success" : "error"}>{(result.messages as string[]).map((m) => <p key={m}>{m}</p>)}</div>}
      </div>
    </section>
  );
}

function SqlComparison() {
  return (
    <section className="grid two">
      <div className="panel"><h2>Cassandra / CQL</h2><CodeBlock>{sqlComparison.cassandra}</CodeBlock><p>Fast when the query supplies the designed partition key. New access pattern usually means another table.</p></div>
      <div className="panel"><h2>Relational / SQL</h2><CodeBlock>{sqlComparison.sql}</CodeBlock><p>Strong for joins, ad hoc filters, and relational reporting. High-volume distributed writes may need more operational design.</p></div>
    </section>
  );
}

function GenAIExercise() {
  const [text, setText] = useState("");
  const checks = ["Does the query provide the full partition key?", "Is event_date included to bound the partition?", "Does clustering order support newest-first results?", "Could the partition become too large?", "Could the partition key create a hotspot?", "Does the table support the exact query?"];
  return (
    <section className="grid two">
      <div className="panel">
        <h2>GenAI Exercise</h2>
        <CodeBlock>{`I am designing an Apache Cassandra table for this query:
Retrieve the latest purchase events for a specific device and day, ordered by event time descending.
Available fields: event_id, user_id, device_id, event_type, event_date, event_time, amount, metadata.
Propose a Cassandra CREATE TABLE statement and explain the partition key and clustering columns.
Requirements: Avoid ALLOW FILTERING; keep partitions bounded; support newest-first ordering.`}</CodeBlock>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste AI-generated schema here" />
      </div>
      <div className="panel">
        <h2>Critique Checklist</h2>
        {checks.map((check) => <label className="check" key={check}><input type="checkbox" /> {check}</label>)}
        <div className="callout">Basic validation helps discussion, but it does not prove correctness. Students should justify the data model against the query.</div>
      </div>
    </section>
  );
}

function Benchmark() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Local Benchmark</h2>
      <p className="warning">A single local Docker node is not representative of a production Cassandra cluster.</p>
      <button disabled={busy} onClick={async () => { setBusy(true); setResult(await api.benchmark(99, "small")); setBusy(false); }}><BarChart3 size={18} /> Run small benchmark</button>
      {busy && <div className="callout">Running benchmark...</div>}
      {result && <ResultTable rows={[result]} />}
    </section>
  );
}

function PresenterMode() {
  return <section className="grid presenterGrid">{presenterSteps.map(([title, says, point], i) => <article className="panel" key={title}><p className="eyebrow">Demo {i + 1}</p><h2>{title}</h2><p><b>Presenter says:</b> {says}</p><div className="callout">{point}</div></article>)}</section>;
}

function TutorialMode() {
  return <section className="panel"><h2>Two-hour Tutorial Timeline</h2>{tutorialTimeline.map(([time, task, checkpoint]) => <div className="timeline" key={time}><b>{time}</b><span>{task}</span><em>{checkpoint}</em></div>)}</section>;
}

function Summary() {
  return <section className="panel hero"><h2>Summary</h2><p>Cassandra is a strong fit for high-volume event streams with known access patterns, bounded partitions, denormalized query tables, and predictable reads. It is a weaker fit for arbitrary joins, ad hoc global filters, complex relational reporting, and frequently changing query requirements.</p><div className="callout">Final takeaway: model from the query backwards.</div></section>;
}

createRoot(document.getElementById("root")!).render(<App />);
