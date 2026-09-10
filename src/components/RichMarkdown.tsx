import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ImageOff, Loader2 } from "lucide-react";
import { ChartSpec, FigureRef, fetchFigureImage, renderChartToDataUrl, splitRichBlocks } from "@/lib/figures";
import { useLanguage } from "@/contexts/LanguageContext";

const ChartBlock = ({ spec }: { spec: ChartSpec }) => {
  const dataUrl = useMemo(() => renderChartToDataUrl(spec), [spec]);
  if (!dataUrl) return null;
  return (
    <figure className="my-5">
      <img src={dataUrl} alt={spec.title || "Graphique"} className="w-full rounded-md border border-border/60 bg-white" />
      {(spec.caption || spec.title) && (
        <figcaption className="mt-1.5 text-center text-[11px] italic text-muted-foreground">
          {spec.caption || spec.title}
        </figcaption>
      )}
    </figure>
  );
};

const FigureBlock = ({ ref: fig }: { ref: FigureRef }) => {
  const { language } = useLanguage();
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  const [src, setSrc] = useState<string | null>(null);
  const [credit, setCredit] = useState("");

  useEffect(() => {
    let alive = true;
    fetchFigureImage(fig.query, language).then(res => {
      if (!alive) return;
      if (res) {
        setSrc(res.dataUrl);
        setCredit(res.credit);
        setState("ok");
      } else setState("none");
    });
    return () => {
      alive = false;
    };
  }, [fig.query, language]);

  const caption = fig.caption || fig.query;

  if (state === "loading") {
    return (
      <div className="my-5 flex h-36 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/40">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "none" || !src) {
    return (
      <figure className="my-5 rounded-md border border-dashed border-border/60 bg-muted/30 px-4 py-5 text-center">
        <ImageOff size={18} className="mx-auto text-muted-foreground/60" />
        <figcaption className="mt-1.5 text-[11px] italic text-muted-foreground">{caption}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="my-5">
      <img src={src} alt={caption} loading="lazy" className="mx-auto max-h-[420px] w-auto rounded-md border border-border/60" />
      <figcaption className="mt-1.5 text-center text-[11px] italic text-muted-foreground">
        {caption}
        {credit && <span className="block text-[10px] not-italic opacity-70">{credit}</span>}
      </figcaption>
    </figure>
  );
};

const RichMarkdown = ({ content, className }: { content: string; className?: string }) => {
  const blocks = useMemo(() => splitRichBlocks(content), [content]);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.kind === "chart") return <ChartBlock key={i} spec={b.spec} />;
        if (b.kind === "figure") return <FigureBlock key={i} ref={b.ref} />;
        return <ReactMarkdown key={i}>{b.text}</ReactMarkdown>;
      })}
    </div>
  );
};

export default RichMarkdown;
