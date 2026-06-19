export type ApiResult = {
  rows?: Record<string, unknown>[];
  durationMs?: number;
  table?: string;
  [key: string]: unknown;
};

const isVercelPreview = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

const today = () => new Date().toISOString().slice(0, 10);

const schemaTables = [
  {
    name: "events_by_user",
    purpose: "Latest events for one user on one day.",
    supportedQuery: "Get one user's events for a selected day, newest first.",
    partitionKey: ["user_id", "event_date"],
    clusteringColumns: ["event_time DESC", "event_id"],
    regularColumns: ["event_type", "service", "device_id", "status", "amount", "metadata"],
    sampleRow: "user_001 | 2026-06-18 | 10:42:11 | page_view | web | device_03",
    partitionShape: "One partition contains one user's events for one bounded calendar day."
  },
  {
    name: "events_by_type",
    purpose: "Recent events for a type such as purchase or search.",
    supportedQuery: "Get recent events of a selected type on a selected day.",
    partitionKey: ["event_type", "event_date"],
    clusteringColumns: ["event_time DESC", "event_id"],
    regularColumns: ["user_id", "service", "device_id", "status", "amount", "metadata"],
    sampleRow: "purchase | 2026-06-18 | 11:01:04 | user_012 | device_07 | 79.90",
    partitionShape: "One partition contains all events of one type for one day."
  },
  {
    name: "errors_by_service",
    purpose: "Operational troubleshooting for recent errors.",
    supportedQuery: "Get recent errors for one service on one day.",
    partitionKey: ["service", "event_date"],
    clusteringColumns: ["event_time DESC", "event_id"],
    regularColumns: ["user_id", "device_id", "status", "metadata"],
    sampleRow: "checkout | 2026-06-18 | 12:31:20 | user_022 | device_04 | HTTP 503",
    partitionShape: "One partition contains error events for a service and day."
  },
  {
    name: "events_by_device",
    purpose: "Device history and repeated activity.",
    supportedQuery: "Get recent events for one device on one day.",
    partitionKey: ["device_id", "event_date"],
    clusteringColumns: ["event_time DESC", "event_id"],
    regularColumns: ["user_id", "event_type", "service", "status", "amount", "metadata"],
    sampleRow: "device_03 | 2026-06-18 | 08:15:03 | user_004 | api_request",
    partitionShape: "One partition contains one device's events for one bounded day."
  },
  {
    name: "daily_user_activity",
    purpose: "Precomputed daily activity summaries.",
    supportedQuery: "Get a user's daily counts by event type.",
    partitionKey: ["user_id"],
    clusteringColumns: ["event_date", "event_type"],
    regularColumns: ["event_count", "purchase_total", "error_count"],
    sampleRow: "user_001 | 2026-06-18 | purchase | 3 | 149.70 | 0",
    partitionShape: "One partition contains summary rows for one user across days."
  }
];

function mockRows(kind = "user", count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const eventType = kind === "errors" ? "error" : kind === "type" ? "purchase" : ["login", "page_view", "search", "api_request"][i % 4];
    return {
      event_id: ["069b74a0-07a5-57c8-a9c8-9c8f0d0e7f21", "8ad80aa0-4998-58ac-9037-c63a01d80250"][i % 2],
      user_id: `user_${String((i % 50) + 1).padStart(3, "0")}`,
      device_id: `device_${String((i % 12) + 1).padStart(2, "0")}`,
      event_date: today(),
      event_time: `${today()}T${String(20 - i).padStart(2, "0")}:15:0${i % 10}`,
      event_type: eventType,
      service: kind === "errors" || eventType === "purchase" ? "checkout" : "catalog",
      status: kind === "errors" ? "failed" : "ok",
      amount: eventType === "purchase" ? String(49 + i * 12.5) : null,
      metadata: "vercel_mock=true; source=online_preview"
    };
  });
}

function mockRequest<T>(path: string, options?: RequestInit): T {
  if (path === "/api/health") {
    return { backend: "ok", cassandra: { connected: false, version: "Vercel mock", error: "Use Docker locally for real Cassandra." } } as T;
  }
  if (path === "/api/status") {
    return {
      backend: "ok",
      cassandra: { connected: false, version: "Vercel mock", error: "Use Docker locally for real Cassandra." },
      keyspace: true,
      tables: Object.fromEntries(schemaTables.map((table) => [table.name, true])),
      datasetLoaded: true,
      rowCounts: { events_by_user: 1480, events_by_type: 1480, errors_by_service: 126, events_by_device: 1480, daily_user_activity: 987, event_copies: 4566 },
      lastLoadedStats: { seed: 42, size: "small", events: 1480, users: 50, devices: 12, days: [today()], eventTypes: { login: 220, page_view: 420, search: 266, purchase: 128, error: 126, api_request: 240, device_activity: 80 } }
    } as T;
  }
  if (path === "/api/schema/tables") return schemaTables as T;
  if (path.startsWith("/api/events/by-user")) return { rows: mockRows("user"), durationMs: 2.4, table: "events_by_user" } as T;
  if (path.startsWith("/api/events/by-type")) return { rows: mockRows("type"), durationMs: 2.1, table: "events_by_type" } as T;
  if (path.startsWith("/api/errors/by-service")) return { rows: mockRows("errors", 5), durationMs: 1.9, table: "errors_by_service" } as T;
  if (path.startsWith("/api/events/by-device")) return { rows: mockRows("device"), durationMs: 2.2, table: "events_by_device" } as T;
  if (path.startsWith("/api/events/") && path.endsWith("/copies")) {
    return { rows: ["events_by_user", "events_by_type", "events_by_device", "errors_by_service"].map((table_name) => ({ ...mockRows("errors", 1)[0], table_name })), durationMs: 1.5, table: "event_copies" } as T;
  }
  if (path === "/api/design/validate") {
    return { valid: true, score: 5, messages: ["Good: the full query key is device plus day, which bounds the partition.", "Good: event_time orders rows and event_id makes the key unique.", "Good: DESC supports newest-first reads without client-side sorting."] } as T;
  }
  if (path === "/api/benchmark/run") {
    return { warning: "Vercel preview uses mock values. Run Docker locally for real benchmark measurements.", loadedEvents: 1480, loadDurationMs: 450, approxInsertRowsPerSecond: 3288.89, knownPartitionLookupMs: 2.3, lookupRows: 8 } as T;
  }
  return { ok: true, seed: 42, size: "small", events: 1480, days: [today()], message: "Vercel preview uses deterministic mock data. Run Docker for real Cassandra." } as T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (isVercelPreview) return mockRequest<T>(path, options);
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  health: () => request<ApiResult>("/api/health"),
  status: () => request<ApiResult>("/api/status"),
  initialize: () => request<ApiResult>("/api/database/initialize", { method: "POST" }),
  reset: () => request<ApiResult>("/api/database/reset?confirm=true", { method: "POST" }),
  loadData: (seed: number, size: string) =>
    request<ApiResult>("/api/data/load", { method: "POST", body: JSON.stringify({ seed, size }) }),
  schema: () => request<Record<string, unknown>[]>("/api/schema/tables"),
  query: (path: string) => request<ApiResult>(path),
  sandbox: (cql: string) => request<ApiResult>("/api/query/read-only", { method: "POST", body: JSON.stringify({ cql }) }),
  validateDesign: (body: { partitionKeys: string[]; clusteringColumns: string[]; clusteringOrder: string }) =>
    request<ApiResult>("/api/design/validate", { method: "POST", body: JSON.stringify(body) }),
  benchmark: (seed: number, size: string) =>
    request<ApiResult>("/api/benchmark/run", { method: "POST", body: JSON.stringify({ seed, size }) })
};
