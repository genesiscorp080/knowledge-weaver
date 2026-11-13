// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentProvider, useDocuments } from "./DocumentContext";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "account-1" }, isGuest: false },
  queries: [] as { table: string; columns: string; id?: string }[],
  rows: { id: "book-1", title: "Book", topic: "Topic", format: "livre", level: "expert", depth: "expert", pages: 1000, created_at: "2026-11-13", content: "Complete book", table_of_contents: "Chapter 1" },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const query = { table, columns: "", id: undefined as string | undefined };
    const response = () => ({ data: table === "documents" ? [{ ...mocks.rows }] : [], error: null });
    const builder = {
      select: (columns: string) => { query.columns = columns; mocks.queries.push(query); return builder; },
      eq: (key: string, value: string) => { if (key === "id") query.id = value; return builder; },
      order: () => builder,
      abortSignal: () => Promise.resolve(response()),
      maybeSingle: () => Promise.resolve({ data: table === "documents" ? { ...mocks.rows } : null, error: null }),
    };
    return builder;
  },
} }));
const wrapper = ({ children }: { children: React.ReactNode }) => <DocumentProvider>{children}</DocumentProvider>;
beforeEach(() => { mocks.queries.length = 0; mocks.auth.user = { id: "account-1" }; });
afterEach(cleanup);

describe("sign-in data loading", () => {
  it("loads book metadata without downloading the body", async () => {
    const { result } = renderHook(useDocuments, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const query = mocks.queries.find(q => q.table === "documents");
    expect(query?.columns.split(",")).not.toContain("content");
    expect(query?.columns).not.toBe("*");
    expect(result.current.documents[0].pages).toBe(1000);
    expect(result.current.documents[0].content).toBe("");
  });

  it("does not reload data when the same user's session object changes", async () => {
    const { result, rerender } = renderHook(useDocuments, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const count = mocks.queries.length;
    mocks.auth.user = { id: "account-1" };
    rerender();
    expect(mocks.queries.length).toBe(count);
  });

  it("fetches and caches a complete book for reading, export and enhancement", async () => {
    const { result } = renderHook(useDocuments, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const [first, second] = await Promise.all([
        result.current.ensureDocumentLoaded("book-1"), result.current.ensureDocumentLoaded("book-1"),
      ]);
      expect(first?.content).toBe("Complete book");
      expect(second?.content).toBe("Complete book");
    });
    await act(async () => { await result.current.ensureDocumentLoaded("book-1"); });
    expect(mocks.queries.filter(q => q.table === "documents" && q.id === "book-1")).toHaveLength(1);
    expect(result.current.documents[0].tableOfContents).toBe("Chapter 1");
  });

  it("supports opening a book directly before library metadata finishes loading", async () => {
    const { result } = renderHook(useDocuments, { wrapper });
    await act(async () => { await result.current.ensureDocumentLoaded("book-1"); });
    await waitFor(() => expect(result.current.getDocument("book-1")?.content).toBe("Complete book"));
  });
});