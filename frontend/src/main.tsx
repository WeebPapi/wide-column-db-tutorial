import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Clipboard, Database, RotateCcw, Terminal } from "lucide-react";
import { demoActions, demoTables, LabStep, projectTopic, sqlComparison, tutorialSteps } from "./data/workshop";
import { CodeBlock } from "./components/CodeBlock";
import "./styles.css";

type DemoEvent = {
  id: number;
  user: string;
  type: string;
  service: string;
  device: string;
  status: string;
  amount: string;
  tableCopies: string[];
};

function useProgress() {
  const [done, setDone] = useState<string[]>(() => JSON.parse(localStorage.getItem("cassandra-progress-v3") || "[]"));
  const toggle = (step: string) => {
    const next = done.includes(step) ? done.filter((s) => s !== step) : [...done, step];
    setDone(next);
    localStorage.setItem("cassandra-progress-v3", JSON.stringify(next));
  };
  const reset = () => {
    setDone([]);
    localStorage.removeItem("cassandra-progress-v3");
  };
  return { done, toggle, reset };
}

function App() {
  const [active, setActive] = useState("demo");
  const { done, toggle, reset } = useProgress();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><Database size={26} /> <span>Cassandra Lab</span></div>
        <div className="progress">{done.length}/{tutorialSteps.length} tutorial steps done</div>
        <nav>
          <button className={active === "demo" ? "active" : ""} onClick={() => setActive("demo")}>
            <span>1</span> Demo: what we build
          </button>
          {tutorialSteps.map((step, index) => (
            <button key={step.title} className={active === step.title ? "active" : ""} onClick={() => setActive(step.title)}>
              <span>{done.includes(step.title) ? <Check size={16} /> : index + 2}</span>
              {step.title}
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={reset}><RotateCcw size={16} /> Reset progress</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Wide-column databases with Apache Cassandra</p>
            <h1>{active === "demo" ? projectTopic : active}</h1>
          </div>
          {active !== "demo" && <button onClick={() => toggle(active)}><Check size={18} /> Mark done</button>}
        </header>
        {active === "demo" ? <InteractiveDemo /> : <TutorialStep step={tutorialSteps.find((step) => step.title === active)!} />}
      </main>
    </div>
  );
}

function InteractiveDemo() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [selectedTable, setSelectedTable] = useState("events_by_user");
  const latest = events[0];
  const tableRows = useMemo(() => events.filter((event) => event.tableCopies.includes(selectedTable)), [events, selectedTable]);

  const createEvent = (action: (typeof demoActions)[number]) => {
    const nextId = events.length + 1;
    const event: DemoEvent = {
      id: nextId,
      user: `user_${String((nextId % 5) + 1).padStart(3, "0")}`,
      type: action.type,
      service: action.service,
      device: action.device,
      status: action.type === "error" ? "failed" : "ok",
      amount: action.type === "purchase" ? "49.90" : "",
      tableCopies: action.tableCopies
    };
    setEvents([event, ...events].slice(0, 8));
    setSelectedTable(action.tableCopies[action.tableCopies.length - 1]);
  };

  return (
    <section className="demoLayout">
      <div className="panel appMock">
        <p className="eyebrow">Fictional app</p>
        <h2>Campus shop</h2>
        <div className="phone">
          <div className="phoneTop">Student store</div>
          <div className="product">Hoodie · Coffee card · Notebook</div>
          <div className="actionGrid">
            {demoActions.map((action) => <button key={action.type} onClick={() => createEvent(action)}>{action.label}</button>)}
          </div>
        </div>
      </div>

      <div className="pipeline">
        <div className="pipeNode">Clickstream event</div>
        <div className="pipeArrow">{"->"}</div>
        <div className="pipeNode">Backend writes copies</div>
        <div className="pipeArrow">{"->"}</div>
        <div className="pipeNode">Query tables</div>
      </div>

      <div className="panel">
        <p className="eyebrow">Latest event</p>
        {latest ? (
          <div className="eventCard">
            <b>{latest.type}</b>
            <span>{latest.user}</span>
            <span>{latest.device}</span>
            <span>{latest.service}</span>
            <span className={latest.status === "failed" ? "badBadge" : "okBadge"}>{latest.status}</span>
          </div>
        ) : <div className="empty">Click an action to generate an event.</div>}
      </div>

      <div className="panel tableMap">
        <p className="eyebrow">Cassandra writes</p>
        <div className="tableButtons">
          {demoTables.map((table) => (
            <button key={table.name} className={selectedTable === table.name ? "selected" : ""} onClick={() => setSelectedTable(table.name)}>
              {table.name}
            </button>
          ))}
        </div>
        <div className="selectedTable">
          <h2>{selectedTable}</h2>
          <p>{demoTables.find((table) => table.name === selectedTable)?.query}</p>
          <div className="labels"><span className="partition">{demoTables.find((table) => table.name === selectedTable)?.key}</span></div>
          <MiniRows rows={tableRows} />
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Trade-off</p>
        <div className="compare">
          <div><b>Cassandra</b><CodeBlock>{sqlComparison.cassandra}</CodeBlock></div>
          <div><b>SQL</b><CodeBlock>{sqlComparison.sql}</CodeBlock></div>
        </div>
      </div>
    </section>
  );
}

function MiniRows({ rows }: { rows: DemoEvent[] }) {
  if (!rows.length) return <div className="empty">No copied rows for this table yet.</div>;
  return (
    <div className="miniRows">
      {rows.map((row) => (
        <div className="miniRow" key={`${row.id}-${row.type}`}>
          <span>{row.user}</span>
          <span>{row.type}</span>
          <span>{row.device}</span>
          <span>{row.service}</span>
        </div>
      ))}
    </div>
  );
}

function TutorialStep({ step }: { step: LabStep }) {
  return (
    <section className="grid two">
      <article className="panel">
        <p className="eyebrow">Goal</p>
        <h2>{step.goal}</h2>
        <p>{step.explanation}</p>
        {step.commands?.map((command) => <Snippet key={command} title="Terminal" value={command} />)}
        {step.cql?.map((query) => <Snippet key={query} title="CQL / notes" value={query} />)}
      </article>
      <aside className="panel">
        <h2>Expected result</h2>
        <p>{step.expected}</p>
        {step.check && <div className="callout">{step.check}</div>}
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

createRoot(document.getElementById("root")!).render(<App />);
