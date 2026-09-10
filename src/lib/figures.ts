import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   Charts, diagrams and illustrations embedded in documents
   ============================================================
   The AI writes two kinds of visual blocks inside the markdown:

   1) Statistical charts / diagrams:
      ```chart
      {"type":"bar","title":"...","labels":["a","b"],"series":[{"name":"X","data":[1,2]}],"caption":"..."}
      ```
   2) Real illustrations (photos, portraits, maps, artworks, schemas):
      ![FIGURE: search terms | Figure 1 — caption](figure)
   ============================================================ */

export type ChartType = "bar" | "column" | "line" | "area" | "pie" | "donut" | "scatter";

export interface ChartSeries {
  name?: string;
  data: number[];
}

export interface ChartSpec {
  type: ChartType;
  title?: string;
  caption?: string;
  labels: string[];
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
}

export interface FigureRef {
  query: string;
  caption: string;
}

export type RichBlock =
  | { kind: "md"; text: string }
  | { kind: "chart"; spec: ChartSpec }
  | { kind: "figure"; ref: FigureRef };

const FIGURE_RE = /^!\[\s*(?:FIGURE|FIG|IMAGE|ILLUSTRATION)\s*:\s*([^\]]+)\]\(\s*figure\s*\)$/i;

export function parseFigureLine(line: string): FigureRef | null {
  const m = line.trim().match(FIGURE_RE);
  if (!m) return null;
  const parts = m[1].split("|");
  const query = parts[0].trim();
  if (!query) return null;
  return { query, caption: (parts[1] || "").trim() };
}

export function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const obj = JSON.parse(raw.trim());
    const labels: string[] = Array.isArray(obj.labels) ? obj.labels.map((l: unknown) => String(l)) : [];
    let series: ChartSeries[] = [];
    if (Array.isArray(obj.series)) {
      series = obj.series
        .map((s: any) =>
          Array.isArray(s)
            ? { data: s.map(Number).filter((n: number) => Number.isFinite(n)) }
            : { name: s?.name ? String(s.name) : undefined, data: (s?.data || []).map(Number).filter((n: number) => Number.isFinite(n)) },
        )
        .filter((s: ChartSeries) => s.data.length > 0);
    } else if (Array.isArray(obj.data)) {
      series = [{ data: obj.data.map(Number).filter((n: number) => Number.isFinite(n)) }];
    }
    if (series.length === 0) return null;
    const type = String(obj.type || "bar").toLowerCase() as ChartType;
    return {
      type: ["bar", "column", "line", "area", "pie", "donut", "scatter"].includes(type) ? type : "bar",
      title: obj.title ? String(obj.title) : undefined,
      caption: obj.caption ? String(obj.caption) : undefined,
      labels: labels.length ? labels : series[0].data.map((_, i) => String(i + 1)),
      series,
      xLabel: obj.xLabel ? String(obj.xLabel) : undefined,
      yLabel: obj.yLabel ? String(obj.yLabel) : undefined,
    };
  } catch {
    return null;
  }
}

/** Splits markdown into text blocks, chart specs and figure references, keeping order. */
export function splitRichBlocks(markdown: string): RichBlock[] {
  const lines = markdown.split("\n");
  const blocks: RichBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) {
      const text = buffer.join("\n");
      if (text.trim()) blocks.push({ kind: "md", text });
      buffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^```\s*(chart|graph|graphique|diagram|diagramme)\s*$/i.test(trimmed)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i]);
        i++;
      }
      const spec = parseChartSpec(body.join("\n"));
      if (spec) {
        flush();
        blocks.push({ kind: "chart", spec });
      }
      continue;
    }
    const fig = parseFigureLine(trimmed);
    if (fig) {
      flush();
      blocks.push({ kind: "figure", ref: fig });
      continue;
    }
    buffer.push(lines[i]);
  }
  flush();
  return blocks;
}

/* ---------------- Chart rendering (native canvas, no dependency) ---------------- */

const PALETTE = ["#0e7c86", "#c9a227", "#2f6f9f", "#a3543c", "#5b8c5a", "#7b5aa6", "#c26d5b", "#3f7d7a"];

export function renderChartToDataUrl(spec: ChartSpec, width = 1000, height = 620): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "middle";

  let top = 24;
  if (spec.title) {
    ctx.fillStyle = "#123";
    ctx.font = "bold 26px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(spec.title.slice(0, 90), width / 2, top + 8);
    top += 42;
  }

  const isPie = spec.type === "pie" || spec.type === "donut";
  const legendNames = spec.series.map((s, i) => s.name || `Série ${i + 1}`);
  const showLegend = !isPie && spec.series.length > 1;

  if (isPie) {
    drawPie(ctx, spec, width, height, top);
  } else {
    drawAxes(ctx, spec, width, height, top, showLegend);
  }

  return canvas.toDataURL("image/png");
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  spec: ChartSpec,
  width: number,
  height: number,
  top: number,
  showLegend: boolean,
) {
  const left = 90;
  const right = width - 30;
  const bottom = height - (showLegend ? 78 : 56);
  const all = spec.series.flatMap(s => s.data);
  const rawMax = Math.max(...all, 0);
  const rawMin = Math.min(...all, 0);
  const max = niceMax(rawMax === 0 ? 1 : rawMax);
  const min = rawMin < 0 ? -niceMax(Math.abs(rawMin)) : 0;
  const span = max - min || 1;
  const yOf = (v: number) => bottom - ((v - min) / span) * (bottom - top);

  // grid + y ticks
  ctx.strokeStyle = "#e2e8e8";
  ctx.fillStyle = "#5b6a6a";
  ctx.lineWidth = 1;
  ctx.font = "16px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  const ticks = 5;
  for (let t = 0; t <= ticks; t++) {
    const v = min + (span * t) / ticks;
    const yy = yOf(v);
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
    ctx.fillStyle = "#5b6a6a";
    ctx.fillText(formatNum(v), left - 10, yy);
  }

  // axes
  ctx.strokeStyle = "#33484a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const n = Math.max(...spec.series.map(s => s.data.length));
  const slot = (right - left) / Math.max(n, 1);

  const type = spec.type === "column" ? "bar" : spec.type;

  if (type === "bar") {
    const groupPad = slot * 0.18;
    const barW = (slot - groupPad * 2) / spec.series.length;
    spec.series.forEach((s, si) => {
      ctx.fillStyle = PALETTE[si % PALETTE.length];
      s.data.forEach((v, i) => {
        const x = left + i * slot + groupPad + si * barW;
        const yv = yOf(v);
        const y0 = yOf(Math.max(min, 0));
        ctx.fillRect(x, Math.min(yv, y0), Math.max(barW - 3, 2), Math.abs(y0 - yv));
      });
    });
  } else if (type === "scatter") {
    spec.series.forEach((s, si) => {
      ctx.fillStyle = PALETTE[si % PALETTE.length];
      s.data.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(left + i * slot + slot / 2, yOf(v), 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  } else {
    spec.series.forEach((s, si) => {
      const color = PALETTE[si % PALETTE.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      s.data.forEach((v, i) => {
        const x = left + i * slot + slot / 2;
        const yy = yOf(v);
        if (i === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      });
      ctx.stroke();
      if (type === "area") {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = color;
        ctx.lineTo(left + (s.data.length - 1) * slot + slot / 2, yOf(Math.max(min, 0)));
        ctx.lineTo(left + slot / 2, yOf(Math.max(min, 0)));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = color;
      s.data.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(left + i * slot + slot / 2, yOf(v), 3.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // x labels
  ctx.fillStyle = "#33484a";
  ctx.font = "15px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  const every = Math.ceil(n / 14);
  spec.labels.slice(0, n).forEach((lab, i) => {
    if (i % every !== 0) return;
    ctx.fillText(String(lab).slice(0, 16), left + i * slot + slot / 2, bottom + 18);
  });

  if (spec.yLabel) {
    ctx.save();
    ctx.translate(22, (top + bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "italic 16px Helvetica, Arial, sans-serif";
    ctx.fillText(spec.yLabel.slice(0, 50), 0, 0);
    ctx.restore();
  }
  if (spec.xLabel) {
    ctx.textAlign = "center";
    ctx.font = "italic 16px Helvetica, Arial, sans-serif";
    ctx.fillText(spec.xLabel.slice(0, 60), (left + right) / 2, bottom + 40);
  }

  if (showLegend) {
    let lx = left;
    const ly = height - 24;
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.textAlign = "left";
    spec.series.forEach((s, si) => {
      ctx.fillStyle = PALETTE[si % PALETTE.length];
      ctx.fillRect(lx, ly - 7, 14, 14);
      ctx.fillStyle = "#33484a";
      const name = s.name || `Série ${si + 1}`;
      ctx.fillText(name.slice(0, 22), lx + 20, ly);
      lx += 30 + ctx.measureText(name.slice(0, 22)).width;
    });
  }
}

function drawPie(
  ctx: CanvasRenderingContext2D,
  spec: ChartSpec,
  width: number,
  height: number,
  top: number,
) {
  const data = spec.series[0].data;
  const total = data.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const cx = width * 0.36;
  const cy = (top + height - 30) / 2;
  const r = Math.min(cy - top, height * 0.36, width * 0.3);
  let angle = -Math.PI / 2;

  data.forEach((v, i) => {
    const slice = (Math.abs(v) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += slice;
  });

  if (spec.type === "donut") {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // legend with percentages
  ctx.textAlign = "left";
  ctx.font = "16px Helvetica, Arial, sans-serif";
  const lx = width * 0.68;
  let ly = cy - (data.length * 26) / 2 + 8;
  data.forEach((v, i) => {
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fillRect(lx, ly - 8, 16, 16);
    ctx.fillStyle = "#33484a";
    const lab = (spec.labels[i] || `#${i + 1}`).slice(0, 22);
    ctx.fillText(`${lab} — ${((Math.abs(v) / total) * 100).toFixed(1)}%`, lx + 24, ly);
    ly += 26;
  });
}

function formatNum(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`;
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  if (a > 0 && a < 1) return v.toFixed(2);
  return String(Math.round(v * 100) / 100);
}

/* ---------------- Illustration fetching (Wikimedia Commons via edge function) ---------------- */

export interface FetchedFigure {
  dataUrl: string;
  format: "PNG" | "JPEG";
  credit: string;
  title: string;
}

const figureCache = new Map<string, FetchedFigure | null>();
const inflight = new Map<string, Promise<FetchedFigure | null>>();

export async function fetchFigureImage(query: string, language = "fr"): Promise<FetchedFigure | null> {
  const key = `${language}::${query.toLowerCase()}`;
  if (figureCache.has(key)) return figureCache.get(key) ?? null;
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-figure", {
        body: { query, language },
      });
      if (error || !data?.found || !data?.dataUrl) {
        figureCache.set(key, null);
        return null;
      }
      const fig: FetchedFigure = {
        dataUrl: data.dataUrl,
        format: data.format === "PNG" ? "PNG" : "JPEG",
        credit: data.credit || "Wikimedia Commons",
        title: data.title || query,
      };
      figureCache.set(key, fig);
      return fig;
    } catch {
      figureCache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Reads the intrinsic size of a data-URL image (browser only). */
export function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1000, height: img.naturalHeight || 700 });
    img.onerror = () => resolve({ width: 1000, height: 700 });
    img.src = dataUrl;
  });
}
