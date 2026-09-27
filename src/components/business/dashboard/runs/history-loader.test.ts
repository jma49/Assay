import { afterEach, describe, expect, it, vi } from "vitest";
import { createHistoryLoader } from "./history-loader";
import { DEFAULT_SORT, type HistoryQuery } from "./runs";

const query = (search: string): HistoryQuery => ({ page: 1, status: null, search, hashtags: [], sort: DEFAULT_SORT });

const page = (name: string) =>
  new Response(
    JSON.stringify({
      data: [{ _id: name, script_name: name, createdAt: "2026-09-27" }],
      pagination: { total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    }),
  );

/** A fetch whose responses the test releases one by one, in any order. */
function controlledFetch() {
  const pending = new Map<string, (response: Response) => void>();
  const fetchImpl = vi.fn(
    (url: string) =>
      new Promise<Response>((resolve) => {
        pending.set(new URL(url, "http://test").searchParams.get("script_name") ?? "", resolve);
      }),
  );
  const respond = (search: string, response: Response) => pending.get(search)!(response);
  return { fetchImpl, respond };
}

afterEach(() => vi.restoreAllMocks());

describe("createHistoryLoader", () => {
  it("sends every request, even while an earlier one is still loading", () => {
    const { fetchImpl } = controlledFetch();
    const loader = createHistoryLoader(fetchImpl);
    loader.load(query("o"));
    loader.load(query("or"));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toContain("script_name=or");
  });

  it("shows the newest request's page when an older one answers last", async () => {
    const { fetchImpl, respond } = controlledFetch();
    const loader = createHistoryLoader(fetchImpl);
    const older = loader.load(query("o"));
    const newer = loader.load(query("or"));
    respond("or", page("orders"));
    respond("o", page("other"));
    expect(await older).toEqual({ kind: "stale" });
    expect(await newer).toMatchObject({ kind: "page", checks: [{ _id: "orders" }] });
  });

  it("ignores a superseded request's failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchImpl, respond } = controlledFetch();
    const loader = createHistoryLoader(fetchImpl);
    const older = loader.load(query("o"));
    const newer = loader.load(query("or"));
    respond("o", new Response("boom", { status: 500, statusText: "Server Error" }));
    respond("or", page("orders"));
    expect(await older).toEqual({ kind: "stale" });
    expect((await newer).kind).toBe("page");
  });

  it("reports the latest request's failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = createHistoryLoader(async () => new Response("boom", { status: 500, statusText: "Server Error" }));
    expect(await loader.load(query(""))).toEqual({ kind: "error", message: "获取检查历史失败: 500 Server Error" });
  });

  it("reloads the last requested page with its filters, e.g. after a manual run", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => page("orders"));
    const loader = createHistoryLoader(fetchImpl);
    await loader.load({ page: 2, status: "failure", search: "orders", hashtags: ["billing"], sort: DEFAULT_SORT });
    await loader.reload();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]).toEqual(fetchImpl.mock.calls[0]);
    expect(fetchImpl.mock.calls[1][0]).toContain("page=2&limit=50&include_results=false&status=failure&script_name=orders&hashtags=billing");
  });

  it("has nothing to reload before the first request", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => page("orders"));
    expect(await createHistoryLoader(fetchImpl).reload()).toEqual({ kind: "stale" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
