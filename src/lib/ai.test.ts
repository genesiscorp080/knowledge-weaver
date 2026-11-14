// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), render: vi.fn(), loading: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { loading: mocks.loading, success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/figures", () => ({
  fetchFigureImage: mocks.fetch,
  parseFigureLine: (line: string) => line.startsWith("![FIGURE:") ? { query: line, caption: "Image" } : null,
  parseChartSpec: () => ({ type: "bar" }),
  renderChartToDataUrl: mocks.render,
  imageSize: () => Promise.resolve({ width: 100, height: 100 }),
}));
import { buildPDF, generatePDF } from "./ai";

beforeEach(() => { vi.clearAllMocks(); mocks.fetch.mockResolvedValue(null); mocks.render.mockReturnValue(null); });
describe("PDF export reliability", () => {
  it("exports text and tables even if the illustration service rejects", async () => {
    mocks.fetch.mockRejectedValue(new Error("unavailable"));
    const blob = await buildPDF("Recent book", "# Chapter\nText after image\n![FIGURE: image](figure)\n| Year | Value |\n| --- | --- |\n| 2026 | 42 |");
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  });
  it("does not abort text export when a chart renderer fails", async () => {
    mocks.render.mockImplementation(() => { throw new Error("invalid canvas"); });
    const blob = await buildPDF("Book", '```chart\n{}\n```\nText remains available.');
    expect(blob.size).toBeGreaterThan(1000);
  });
  it("reports empty document errors instead of silently finishing", async () => {
    await generatePDF("Empty", "");
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("offers a fresh download action on touch devices", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    await generatePDF("Mobile book", "Complete document text");
    expect(mocks.success.mock.calls[0][1].action.onClick).toBeTypeOf("function");
  });
});