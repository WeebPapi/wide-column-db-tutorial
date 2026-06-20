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
  const [selectedQuestion, setSelectedQuestion] = useState("user");
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
    <section className="demoScroll">
      <article className="demoSection introSection">
        <div>
          <p className="eyebrow">30 minute demo</p>
          <h2>From shop click to Cassandra table</h2>
          <p>Scroll down. Each stop isolates one idea students will later build by hand.</p>
        </div>
        <div className="demoMiniMap">
          {["Actions", "Event", "Copies", "Queries", "Partitions", "Limits"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">1. Use case</p>
          <h2>Students use a campus shop</h2>
          <p>Click a user action. Each click becomes one activity event.</p>
        </div>
        <div className="phone">
          <div className="phoneTop">Student store</div>
          <div className="product">Hoodie | Coffee card | Notebook</div>
          <div className="actionGrid">
            {demoActions.map((action) => <button key={action.type} onClick={() => createEvent(action)}>{action.label}</button>)}
          </div>
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">2. Event shape</p>
          <h2>A clickstream row is small and predictable</h2>
          <p>The app records who, what, where, and whether it succeeded.</p>
        </div>
        {latest ? (
          <div className="eventCard bigEvent">
            <b>{latest.type}</b>
            <span>{latest.user}</span>
            <span>{latest.device}</span>
            <span>{latest.service}</span>
            <span>{latest.amount ? `EUR ${latest.amount}` : "no amount"}</span>
            <span className={latest.status === "failed" ? "badBadge" : "okBadge"}>{latest.status}</span>
          </div>
        ) : <div className="empty">Use the shop actions above first.</div>}
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">3. Denormalization</p>
          <h2>One event, several query tables</h2>
          <p>Cassandra duplicates writes so reads can stay simple.</p>
        </div>
        <div className="copyFlow">
          <div className="copySource">{latest ? latest.type : "event"}</div>
          <div className="copyTargets">
            {demoTables.map((table) => (
              <button
                key={table.name}
                className={latest?.tableCopies.includes(table.name) ? "lit" : ""}
                onClick={() => setSelectedTable(table.name)}
              >
                {table.name}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">4. Query-first modelling</p>
          <h2>Pick the question before the table</h2>
          <p>Different questions need different partition keys.</p>
        </div>
        <div className="questionBoard">
          {[
            ["user", "What did user_001 do today?", "events_by_user", "(user_id, event_date)"],
            ["type", "Show recent purchases.", "events_by_type", "(event_type, event_date)"],
            ["device", "What happened on device_07?", "events_by_device", "(device_id, event_date)"],
            ["service", "Which checkout errors happened?", "errors_by_service", "(service, event_date)"]
          ].map(([id, question, table, key]) => (
            <button className={selectedQuestion === id ? "selected" : ""} key={id} onClick={() => { setSelectedQuestion(id); setSelectedTable(table); }}>
              <b>{question}</b>
              <span>{table}</span>
              <em>{key}</em>
            </button>
          ))}
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">5. Partition</p>
          <h2>A good query lands in one bucket</h2>
          <p>{selectedTable} groups rows by {demoTables.find((table) => table.name === selectedTable)?.key}.</p>
        </div>
        <div className="partitionViz">
          {["2026-06-17", "2026-06-18", "2026-06-19"].map((day, index) => (
            <div className={index === 1 ? "bucket activeBucket" : "bucket"} key={day}>
              <b>{day}</b>
              <span>{index === 1 ? selectedTable : "other partition"}</span>
              <div className="bucketRows">
                {Array.from({ length: index === 1 ? Math.max(2, tableRows.length || 3) : 2 }, (_, i) => <i key={i} />)}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">6. Table contents</p>
          <h2>Look inside the selected query table</h2>
          <p>{demoTables.find((table) => table.name === selectedTable)?.query}</p>
        </div>
        <div className="selectedTable wideTable">
          <div className="labels"><span className="partition">{demoTables.find((table) => table.name === selectedTable)?.key}</span></div>
          <MiniRows rows={tableRows} />
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">7. Boundary</p>
          <h2>Not every question belongs here</h2>
          <p>Global flexible reporting is not what these tables were designed for.</p>
        </div>
        <div className="badQueryBoard">
          <CodeBlock>{`SELECT *
FROM events_by_type
WHERE event_type = 'purchase'
  AND amount > 100
ALLOW FILTERING;`}</CodeBlock>
          <div className="warning">Wrong shape: this asks Cassandra to scan/filter instead of reading one known partition.</div>
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">8. Trade-off</p>
          <h2>Cassandra and SQL answer different needs</h2>
          <p>Cassandra favors predictable partition reads; SQL favors flexible reporting.</p>
        </div>
        <div className="compare">
          <div><b>Cassandra</b><CodeBlock>{sqlComparison.cassandra}</CodeBlock></div>
          <div><b>SQL</b><CodeBlock>{sqlComparison.sql}</CodeBlock></div>
        </div>
      </article>
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
