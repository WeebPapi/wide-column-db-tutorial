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
  extra?: {
    label: string;
    value: string;
  };
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
      extra: action.extra,
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
          <p>Scroll down. Each stop isolates one idea you will later build by hand.</p>
        </div>
        <div className="demoMiniMap">
          {["Compose", "Actions", "Event", "Copies", "Queries", "Partitions", "Limits"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </article>

      <article className="demoSection composeSection">
        <div className="sectionLead">
          <p className="eyebrow">1. Local stack</p>
          <h2>Docker Compose starts the classroom system</h2>
          <p>Before any CQL, you should know which containers are running and how the app reaches Cassandra.</p>
        </div>
        <div className="composeBoard">
          <div className="visualLabel">docker compose up -d</div>
          <div className="composeColumns">
            <div className="composeColumn">
              <div className="composeService frontendService">
                <b>frontend</b>
                <span>React guide</span>
                <em>localhost:3000</em>
              </div>
              <div className="composeConnection">frontend {"->"} HTTP API {"->"} backend</div>
              <div className="composeDetail">
                <b>Browser entry point</b>
                <span>You open the guide at localhost:3000</span>
              </div>
              <div className="composeSnippet">
                <b>frontend service</b>
                <CodeBlock>{`frontend:
  build: ./frontend
  ports:
    - "3000:3000"
  depends_on:
    - backend`}</CodeBlock>
              </div>
            </div>
            <div className="composeColumn">
              <div className="composeService backendService">
                <b>backend</b>
                <span>FastAPI helper</span>
                <em>localhost:8000</em>
              </div>
              <div className="composeConnection">backend {"->"} Cassandra driver {"->"} cassandra</div>
              <div className="composeDetail">
                <b>Connection settings</b>
                <span>CASSANDRA_HOSTS points to the cassandra service name</span>
              </div>
              <div className="composeSnippet">
                <b>backend service</b>
                <CodeBlock>{`backend:
  build: ./backend
  environment:
    CASSANDRA_HOSTS: cassandra
    CASSANDRA_KEYSPACE: activity_tracking
  ports:
    - "8000:8000"`}</CodeBlock>
              </div>
            </div>
            <div className="composeColumn">
              <div className="composeService cassandraService">
                <b>cassandra</b>
                <span>wide-column database</span>
                <em>localhost:9042</em>
              </div>
              <div className="composeConnection">cqlsh {"->"} localhost:9042</div>
              <div className="composeDetail">
                <b>Data and CQL files</b>
                <span>cassandra-data persists rows; ./cassandra mounts lab scripts</span>
              </div>
              <div className="composeSnippet">
                <b>cassandra service</b>
                <CodeBlock>{`cassandra:
  image: cassandra:4.1.5
  ports:
    - "9042:9042"
  volumes:
    - cassandra-data:/var/lib/cassandra
    - ./cassandra:/workspace/cassandra:ro`}</CodeBlock>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">2. Use case</p>
          <h2>You use a campus shop</h2>
          <p>Click a user action. Each click becomes one activity event.</p>
        </div>
        <div className="phone">
          <div className="phoneTop">
            <span>Campus Shop</span>
            <small>logged in as user_001</small>
          </div>
          <div className="productGrid" aria-label="Mock product cards">
            <div className="productCard">
              <div className="productImage hoodie" />
              <b>SRH Hoodie</b>
              <span>EUR 49.90</span>
            </div>
            <div className="productCard">
              <div className="productImage coffee" />
              <b>Coffee Card</b>
              <span>EUR 12.00</span>
            </div>
            <div className="productCard">
              <div className="productImage notebook" />
              <b>Notebook</b>
              <span>EUR 4.50</span>
            </div>
          </div>
          <div className="phoneHint">Click these app actions to create demo events</div>
          <div className="actionGrid">
            {demoActions.map((action) => <button key={action.type} onClick={() => createEvent(action)}>{action.label}</button>)}
          </div>
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">3. Event shape</p>
          <h2>A clickstream row is small and predictable</h2>
          <p>The app records who, what, where, and whether it succeeded.</p>
        </div>
        {latest ? (
          <div className="eventCard bigEvent">
            <Field label="event_type" value={latest.type} strong />
            <Field label="user_id" value={latest.user} />
            <Field label="device_id" value={latest.device} />
            <Field label="service" value={latest.service} />
            {latest.extra ? (
              <Field label={latest.extra.label} value={latest.extra.value} />
            ) : (
              <Field label="extra_column" value="no action-specific column stored" tone="missing" />
            )}
            <Field label="status" value={latest.status} tone={latest.status === "failed" ? "bad" : "ok"} />
          </div>
        ) : <div className="empty">Use the shop actions above first.</div>}
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">4. Denormalization</p>
          <h2>One event, several query tables</h2>
          <p>Cassandra duplicates writes so reads can stay simple.</p>
        </div>
        <div className="copyFlow">
          <div className="copySource">
            <span>Logical event</span>
            <b>{latest ? latest.type : "event"}</b>
          </div>
          <div className="copyTargets">
            <div className="visualLabel">Tables receiving a copy</div>
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
          <p className="eyebrow">5. Query-first modelling</p>
          <h2>Pick the question before the table</h2>
          <p>Different questions need different partition keys.</p>
        </div>
        <div className="questionBoard">
          <div className="questionHeader">
            <span>Application question</span>
            <span>Cassandra table</span>
            <span>Partition key</span>
          </div>
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
          <p className="eyebrow">6. Partition</p>
          <h2>A good query lands in one bucket</h2>
          <p>{selectedTable} groups rows by {demoTables.find((table) => table.name === selectedTable)?.key}.</p>
        </div>
        <div className="partitionViz">
          <div className="visualLabel fullSpan">Partition buckets for selected table</div>
          {["2026-06-17", "2026-06-18", "2026-06-19"].map((day, index) => (
            <div className={index === 1 ? "bucket activeBucket" : "bucket"} key={day}>
              <b>{index === 1 ? "Target partition" : "Other partition"}</b>
              <span>{day}</span>
              <em>{index === 1 ? selectedTable : "not read by this query"}</em>
              <div className="bucketRows">
                {Array.from({ length: index === 1 ? Math.max(2, tableRows.length || 3) : 2 }, (_, i) => <i key={i} />)}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">7. Table contents</p>
          <h2>Look inside the selected query table</h2>
          <p>{demoTables.find((table) => table.name === selectedTable)?.query}</p>
        </div>
        <div className="selectedTable wideTable">
          <div className="visualLabel">Selected query table</div>
          <h3>{selectedTable}</h3>
          <div className="labels"><span className="partition">{demoTables.find((table) => table.name === selectedTable)?.key}</span></div>
          <MiniRows rows={tableRows} />
        </div>
      </article>

      <article className="demoSection">
        <div className="sectionLead">
          <p className="eyebrow">8. Boundary</p>
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
          <p className="eyebrow">9. Trade-off</p>
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
      <div className="miniRow miniRowHeader">
        <span>user_id</span>
        <span>event_type</span>
        <span>device_id</span>
        <span>action column</span>
      </div>
      {rows.map((row) => (
        <div className="miniRow" key={`${row.id}-${row.type}`}>
          <span>{row.user}</span>
          <span>{row.type}</span>
          <span>{row.device}</span>
          <span>{row.extra ? `${row.extra.label}: ${row.extra.value}` : "none stored"}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" | "bad" | "missing" }) {
  return (
    <div className={`fieldChip ${tone === "ok" ? "okBadge" : tone === "bad" ? "badBadge" : tone === "missing" ? "missingBadge" : ""}`}>
      <small>{label}</small>
      {strong ? <b>{value}</b> : <span>{value}</span>}
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
        {step.commands?.map((command) => (
          <Snippet
            key={command}
            {...getCommandSnippet(command)}
            value={command}
          />
        ))}
        {step.cql?.map((query) => (
          <Snippet
            key={query}
            {...getCqlSnippet(step.title, query)}
            value={query}
          />
        ))}
      </article>
      <aside className="panel">
        <h2>Expected result</h2>
        <p>{step.expected}</p>
        {step.check && <div className="callout">{step.check}</div>}
      </aside>
    </section>
  );
}

function getCommandSnippet(command: string) {
  if (command.startsWith("SOURCE ")) {
    return {
      title: "Paste in cqlsh",
      hint: "Paste this after the cqlsh prompt opens. It runs the saved .cql file for you."
    };
  }

  if (command === "docker compose exec cassandra cqlsh" || command === "docker compose exec cassandra cqlsh -k activity_tracking") {
    return {
      title: "Run in terminal",
      hint: "Run this in your normal terminal. It opens cqlsh; keep it open for the CQL snippets."
    };
  }

  if (command.startsWith("curl ")) {
    return {
      title: "Run in terminal",
      hint: "Run this in your normal terminal, not inside cqlsh. It asks the backend to load rows."
    };
  }

  return {
    title: "Run in terminal",
    hint: "Run this in your normal terminal."
  };
}

function getCqlSnippet(stepTitle: string, query: string) {
  const runnableQuery = query.replace(/^USE activity_tracking;\n/, "");

  if (query.startsWith("SOURCE ")) {
    return {
      title: "Paste in cqlsh",
      hint: "Paste this at the cqlsh prompt. It runs the saved .cql file for you."
    };
  }

  if (query.startsWith("CREATE KEYSPACE")) {
    return {
      title: "Read-only: file contents",
      hint: "Do not paste this if you used SOURCE above. This only shows what that file creates.",
      copyable: false
    };
  }

  if (query.startsWith("PRIMARY KEY")) {
    return {
      title: "Read-only: schema idea",
      hint: "Do not paste this. It explains how the table key is structured.",
      copyable: false
    };
  }

  if (query.includes("Anti-pattern:")) {
    return {
      title: "Read-only: bad example",
      hint: "Do not paste this during the walkthrough. It shows the kind of query to avoid.",
      copyable: false
    };
  }

  if (runnableQuery.startsWith("CREATE TABLE purchases_by_device")) {
    return {
      title: "Optional cqlsh command",
      hint: "Read this as the target design. Paste it in cqlsh only if you want to create the exercise table."
    };
  }

  if (query.includes("Checklist:")) {
    return {
      title: "Read-only: checklist",
      hint: "Do not paste this. Use it to check whether the AI answer is good.",
      copyable: false
    };
  }

  if (runnableQuery.startsWith("DESCRIBE")) {
    return {
      title: "Paste in cqlsh",
      hint: "Paste this at the cqlsh prompt to select the keyspace and check what Cassandra can see."
    };
  }

  if (runnableQuery.startsWith("SELECT count(*)")) {
    return {
      title: "Paste in cqlsh",
      hint: "Paste this at the cqlsh prompt to select the keyspace and check that rows were loaded."
    };
  }

  if (stepTitle.startsWith("Query")) {
    return {
      title: "Paste in cqlsh",
      hint: "Paste this at the cqlsh prompt. It selects the keyspace first; replace <loaded date> with a real date from the load step."
    };
  }

  return {
    title: "Paste in cqlsh",
    hint: "Paste this at the cqlsh prompt."
  };
}

function Snippet({ title, hint, value, copyable = true }: { title: string; hint: string; value: string; copyable?: boolean }) {
  const copy = async () => navigator.clipboard?.writeText(value);
  return (
    <div className="snippet">
      <div className="snippetHeader">
        <span><Terminal size={15} /> {title}</span>
        {copyable && <button onClick={copy}><Clipboard size={15} /> Copy</button>}
      </div>
      <p className="snippetHint">{hint}</p>
      <CodeBlock>{value}</CodeBlock>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
