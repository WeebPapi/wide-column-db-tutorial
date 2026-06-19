import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clipboard, Database, RotateCcw, Terminal } from "lucide-react";
import { api, ApiResult } from "./services/api";
import { LabStep, presenterSteps, projectTopic, sqlComparison, steps, tutorialTimeline } from "./data/workshop";
import { CodeBlock } from "./components/CodeBlock";
import { ResultTable } from "./components/ResultTable";
import "./styles.css";

type Mode = "lab" | "presenter" | "timeline";

function useProgress() {
  const [done, setDone] = useState<string[]>(() => JSON.parse(localStorage.getItem("cassandra-progress-v2") || "[]"));
  const toggle = (step: string) => {
    const next = done.includes(step) ? done.filter((s) => s !== step) : [...done, step];
    setDone(next);
    localStorage.setItem("cassandra-progress-v2", JSON.stringify(next));
  };
  const reset = () => {
    setDone([]);
    localStorage.removeItem("cassandra-progress-v2");
  };
  return { done, toggle, reset };
}

function App() {
  const [mode, setMode] = useState<Mode>("lab");
  const [active, setActive] = useState(0);
  const { done, toggle, reset } = useProgress();
  const step = steps[active];

  return (
    <div className={`app ${mode}`}>
      <aside className="sidebar">
        <div className="brand"><Database size={26} /> <span>Cassandra Lab Guide</span></div>
        <div className="modeSwitch">
          {(["lab", "presenter", "timeline"] as Mode[]).map((item) => (
            <button className={mode === item ? "selected" : ""} onClick={() => setMode(item)} key={item}>{item}</button>
          ))}
        </div>
        <div className="progress">{done.length}/{steps.length} steps checked off</div>
        <nav>
          {steps.map((item, index) => (
            <button key={item.title} className={active === index ? "active" : ""} onClick={() => { setActive(index); setMode("lab"); }}>
              <span>{done.includes(item.title) ? <Check size={16} /> : index + 1}</span>
              {item.title}
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={reset}><RotateCcw size={16} /> Reset progress</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Wide-column databases with Apache Cassandra</p>
            <h1>{mode === "lab" ? step.title : mode === "presenter" ? "Presenter Notes" : "Two-hour Timeline"}</h1>
            <p className="topic">{projectTopic}</p>
          </div>
          {mode === "lab" && <button onClick={() => toggle(step.title)}><Check size={18} /> Mark done</button>}
        </header>
        {mode === "presenter" ? <PresenterMode /> : mode === "timeline" ? <TimelineMode /> : <LabPage step={step} index={active} />}
      </main>
    </div>
  );
}

function LabPage({ step, index }: { step: LabStep; index: number }) {
  if (index === 4) return <SchemaStep step={step} />;
  if (index >= 6 && index <= 9) return <QueryStep step={step} index={index} />;
  if (index === 10) return <BadQueryStep step={step} />;
  if (index === 11) return <DesignStep step={step} />;
  if (index === 12) return <SqlStep step={step} />;
  if (index === 13) return <GenAIStep step={step} />;
  return <GuideStep step={step} />;
}

function GuideStep({ step }: { step: LabStep }) {
  return (
    <section className="grid two">
      <article className="panel">
        <p className="eyebrow">Goal</p>
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        {step.commands?.map((command) => <Snippet key={command} title="Terminal" value={command} />)}
        {step.cql?.map((query) => <Snippet key={query} title="CQL" value={query} />)}
      </article>
      <aside className="panel">
        <h2>Expected Result</h2>
        <p>{step.expected}</p>
        {step.check && <div className="callout">{step.check}</div>}
        {step.discussion && <div className="note">{step.discussion}</div>}
        <StatusMini />
      </aside>
    </section>
  );
}

function Snippet({ title, value }: { title: string; value: string }) {
  const copy = async () => navigator.clipboard?.writeText(value);
  return (
    <div className="snippet">
      <div className="snippetHeader"><span><Terminal size={15} /> {title}</span><button onClick={copy}><Clipboard size={15} /> Copy</button></div>
      <CodeBlock>{value}</CodeBlock>
    </div>
  );
}

function StatusMini() {
  const [status, setStatus] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.status().then(setStatus).catch((e) => setError((e as Error).message));
  }, []);
  return (
    <div className="miniStatus">
      <p className="eyebrow">Optional app check</p>
      {error ? <p className="error">{error}</p> : (
        <>
          <div className="statusLine"><span>Backend</span><b>{String(status?.backend || "checking")}</b></div>
          <div className="statusLine"><span>Cassandra</span><b>{String((status?.cassandra as any)?.connected ?? false)}</b></div>
        </>
      )}
    </div>
  );
}

function SchemaStep({ step }: { step: LabStep }) {
  const [tables, setTables] = useState<Record<string, any>[]>([]);
  useEffect(() => { api.schema().then(setTables); }, []);
  return (
    <section className="grid">
      <GuideIntro step={step} />
      <div className="schemaGrid">
        {tables.map((table) => (
          <article className="panel" key={table.name}>
            <h2>{table.name}</h2>
            <p>{table.supportedQuery}</p>
            <Labels title="Partition key" values={table.partitionKey} type="partition" />
            <Labels title="Clustering" values={table.clusteringColumns} type="cluster" />
            <Labels title="Regular" values={table.regularColumns} type="regular" />
            <div className="sample">{table.partitionShape}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideIntro({ step }: { step: LabStep }) {
  return <article className="panel compact"><h2>{step.goal}</h2><p>{step.explanation}</p><p className="note">{step.expected}</p></article>;
}

function Labels({ title, values, type }: { title: string; values: string[]; type: string }) {
  return <div><div className="miniTitle">{title}</div><div className="labels">{values.map((v) => <span className={type} key={v}>{v}</span>)}</div></div>;
}

function QueryStep({ step, index }: { step: LabStep; index: number }) {
  const [result, setResult] = useState<ApiResult>({});
  const [error, setError] = useState("");
  const date = new Date().toISOString().slice(0, 10);
  const queryPaths = [
    `/api/events/by-user?userId=user_001&eventDate=${date}&limit=10`,
    `/api/events/by-type?eventType=purchase&eventDate=${date}&limit=10`,
    `/api/errors/by-service?service=checkout&eventDate=${date}&limit=10`,
    `/api/events/by-device?deviceId=device_03&eventDate=${date}&limit=10`
  ];
  const runCheck = async () => {
    try {
      setError("");
      setResult(await api.query(queryPaths[index - 6]));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className="grid two">
      <article className="panel">
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        {step.commands?.map((command) => <Snippet key={command} title="Terminal" value={command} />)}
        {step.cql?.map((query) => <Snippet key={query} title="CQL to run in cqlsh" value={query} />)}
        <div className="callout">{step.expected}</div>
      </article>
      <aside className="panel">
        <h2>Optional Result Check</h2>
        <p>After students run the CQL manually, this button can confirm the same access pattern through the backend API.</p>
        <button onClick={runCheck}>Check via app API</button>
        {error && <div className="error">{error}</div>}
        <ResultTable rows={result.rows} />
      </aside>
    </section>
  );
}

function BadQueryStep({ step }: { step: LabStep }) {
  return (
    <section className="grid two">
      <article className="panel">
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        {step.cql?.map((query) => <Snippet key={query} title="Anti-pattern" value={query} />)}
        <div className="error">Do not solve this by adding ALLOW FILTERING during the tutorial.</div>
      </article>
      <aside className="panel">
        <h2>Why It Fails</h2>
        <p>No current table partitions by "all purchases above an amount". Cassandra cannot cheaply sort all partitions globally by amount.</p>
        <p className="note">{step.discussion}</p>
      </aside>
    </section>
  );
}

function DesignStep({ step }: { step: LabStep }) {
  const [partitionKeys, setPartitionKeys] = useState("device_id,event_date");
  const [clusteringColumns, setClusteringColumns] = useState("event_time,event_id");
  const [result, setResult] = useState<ApiResult | null>(null);
  const validate = () => api.validateDesign({
    partitionKeys: partitionKeys.split(",").map((s) => s.trim()).filter(Boolean),
    clusteringColumns: clusteringColumns.split(",").map((s) => s.trim()).filter(Boolean),
    clusteringOrder: "DESC"
  }).then(setResult);
  return (
    <section className="grid two">
      <article className="panel">
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        <label>Partition key fields<input value={partitionKeys} onChange={(e) => setPartitionKeys(e.target.value)} /></label>
        <label>Clustering columns<input value={clusteringColumns} onChange={(e) => setClusteringColumns(e.target.value)} /></label>
        <button onClick={validate}>Check design</button>
        {result && <div className={result.valid ? "success" : "error"}>{(result.messages as string[]).map((m) => <p key={m}>{m}</p>)}</div>}
      </article>
      <aside className="panel">
        <h2>Reference Answer</h2>
        {step.cql?.map((query) => <Snippet key={query} title="CQL" value={query} />)}
      </aside>
    </section>
  );
}

function SqlStep({ step }: { step: LabStep }) {
  return (
    <section className="grid two">
      <article className="panel"><h2>Cassandra</h2><p>{step.explanation}</p><CodeBlock>{sqlComparison.cassandra}</CodeBlock></article>
      <article className="panel"><h2>SQL</h2><p>SQL keeps one flexible normalized event table and can answer more ad hoc reporting questions.</p><CodeBlock>{sqlComparison.sql}</CodeBlock></article>
    </section>
  );
}

function GenAIStep({ step }: { step: LabStep }) {
  const prompt = `I am designing an Apache Cassandra table for this query:
Retrieve the latest purchase events for a specific device and day, ordered by event time descending.

Available fields:
event_id, user_id, device_id, event_type, event_date, event_time, amount, metadata.

Propose a Cassandra CREATE TABLE statement and explain the partition key and clustering columns.

Requirements:
- Avoid ALLOW FILTERING
- Keep partitions bounded
- Support newest-first ordering`;
  return (
    <section className="grid two">
      <article className="panel">
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        <Snippet title="AI prompt" value={prompt} />
      </article>
      <aside className="panel">
        <h2>Checklist</h2>
        {["Full partition key?", "event_date bounds the partition?", "event_time DESC?", "No ALLOW FILTERING?", "Hotspot risk considered?", "Supports exactly one query?"].map((item) => (
          <label className="check" key={item}><input type="checkbox" /> {item}</label>
        ))}
      </aside>
    </section>
  );
}

function PresenterMode() {
  return <section className="grid presenterGrid">{presenterSteps.map(([person, task, point]) => <article className="panel" key={person}><h2>{person}</h2><p>{task}</p><div className="callout">{point}</div></article>)}</section>;
}

function TimelineMode() {
  return <section className="panel"><h2>Two-hour tutorial</h2>{tutorialTimeline.map(([time, task, checkpoint]) => <div className="timeline" key={time}><b>{time}</b><span>{task}</span><em>{checkpoint}</em></div>)}</section>;
}

createRoot(document.getElementById("root")!).render(<App />);
