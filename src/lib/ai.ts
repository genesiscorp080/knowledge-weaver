import { supabase } from "@/integrations/supabase/client";

interface AIRequest {
  action: string;
  messages: { role: string; content: string }[];
  systemPrompt?: string;
}

export async function callAI(request: AIRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke("cohere-ai", {
    body: request,
  });

  if (error) {
    console.error("AI call error:", error);
    throw new Error(error.message || "AI call failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.content || "";
}

export function buildGenerateSystemPrompt(
  level: string,
  format: string,
  depth: string,
  pages: number | null,
  language: string
): string {
  const lang = language === "en" ? "English" : "French";
  const targetPages = pages || getDefaultPages(format, depth);

  return `You are Prisca, an expert educational content writer. You write in ${lang}.
You must generate content adapted to the "${level}" academic level.
The document format is "${format}".
The depth level is "${depth}".
The target length is approximately ${targetPages} pages (roughly ${targetPages * 500} words).

CRITICAL DEPTH GUIDELINES — this is the most important instruction:

${getDepthInstructions(depth, lang)}

FORMAT GUIDELINES:
- article: Formal, academic style, concise but thorough. 5-25 pages.
- support: Educational with clear examples, diagrams described textually, moderate formality. 10-100 pages.
- cours: Very educational with many detailed examples, illustrations described in text, practice exercises, case studies. 15-100 pages.
- livre: Narrative, comprehensive, formal yet engaging, with chapters, foreword, conclusion. 100-500 pages.

FORMATTING RULES:
- Use markdown with proper heading hierarchy (# for title, ## for chapters, ### for sections, #### for subsections).
- Write long, well-structured paragraphs that fully develop each idea.
- Include relevant dates, historical context, and real-world examples.
- Add concrete illustrations, case studies, and practical applications.
- Include a clear table of contents at the beginning.
- Each section must be thoroughly developed — never superficial.
- The content MUST fill the target page count. Write extensively.`;
}

function getDepthInstructions(depth: string, lang: string): string {
  if (lang === "French") {
    switch (depth) {
      case "bas":
        return `PROFONDEUR BASSE : Couvrez le concept principal de manière claire et accessible.
- Définissez les termes clés simplement
- Donnez 1-2 exemples par concept
- Restez factuel et direct`;
      case "intermediaire":
        return `PROFONDEUR INTERMÉDIAIRE : Développez le concept ET les sujets connexes en profondeur.
- Chaque paragraphe doit faire au moins 8-10 lignes, développant pleinement chaque idée
- Incluez des dates historiques, des noms de chercheurs/penseurs importants
- Donnez 3-5 exemples concrets par concept majeur
- Faites des liens entre les différents aspects du sujet
- Incluez des comparaisons, des analogies pour faciliter la compréhension
- Développez le contexte historique et l'évolution des idées
- Ajoutez des citations de sources reconnues
- Présentez différentes perspectives et points de vue`;
      case "avance":
        return `PROFONDEUR AVANCÉE : Maîtrise complète et exhaustive du sujet.
- Chaque paragraphe doit faire 10-15 lignes minimum, avec un développement approfondi
- Incluez SYSTÉMATIQUEMENT : dates, noms, lieux, contextes historiques précis
- Donnez 5-8 exemples détaillés par concept, avec des études de cas complètes
- Analysez les causes, les conséquences, les implications à court et long terme
- Présentez les débats académiques et les controverses
- Incluez des données chiffrées, des statistiques quand pertinent
- Développez les aspects théoriques ET pratiques en détail
- Faites des connexions interdisciplinaires
- Incluez des illustrations textuelles détaillées (schémas décrits, tableaux comparatifs)
- Chaque section doit être un mini-essai complet en soi`;
      case "expert":
        return `PROFONDEUR EXPERT : Couverture TOTALE et EXHAUSTIVE de tout ce qui touche au sujet.
- Chaque paragraphe doit faire 12-20 lignes, avec une argumentation complète
- CHAQUE affirmation doit être étayée par des faits, dates, noms, sources
- 8-12 exemples par concept majeur, incluant des cas rares et des exceptions
- Analyse critique approfondie de TOUTES les perspectives
- Historique complet de l'évolution du domaine avec chronologie détaillée
- État de l'art de la recherche actuelle
- Implications philosophiques, éthiques, sociales, économiques, politiques
- Connexions avec TOUS les domaines adjacents et transversaux
- Tableaux comparatifs, classifications détaillées
- Études de cas approfondies avec analyse complète
- Prospective et tendances futures
- Le document doit être une RÉFÉRENCE exhaustive sur le sujet`;
      default:
        return "";
    }
  } else {
    switch (depth) {
      case "bas":
        return `LOW DEPTH: Cover the core concept clearly and simply.
- Define key terms simply
- Give 1-2 examples per concept
- Stay factual and direct`;
      case "intermediaire":
        return `INTERMEDIATE DEPTH: Develop the concept AND related topics in depth.
- Each paragraph should be at least 8-10 lines, fully developing each idea
- Include historical dates, names of important researchers/thinkers
- Give 3-5 concrete examples per major concept
- Make connections between different aspects of the subject
- Include comparisons and analogies for better understanding
- Develop historical context and evolution of ideas
- Add citations from recognized sources
- Present different perspectives and viewpoints`;
      case "avance":
        return `ADVANCED DEPTH: Complete and thorough mastery of the subject.
- Each paragraph should be 10-15 lines minimum with in-depth development
- SYSTEMATICALLY include: dates, names, places, precise historical contexts
- Give 5-8 detailed examples per concept, with complete case studies
- Analyze causes, consequences, short and long-term implications
- Present academic debates and controversies
- Include numerical data and statistics when relevant
- Develop both theoretical AND practical aspects in detail
- Make interdisciplinary connections
- Include detailed textual illustrations (described diagrams, comparison tables)
- Each section should be a complete mini-essay in itself`;
      case "expert":
        return `EXPERT DEPTH: TOTAL and EXHAUSTIVE coverage of everything related to the subject.
- Each paragraph should be 12-20 lines with complete argumentation
- EVERY claim must be supported by facts, dates, names, sources
- 8-12 examples per major concept, including rare cases and exceptions
- In-depth critical analysis of ALL perspectives
- Complete history of the field's evolution with detailed chronology
- State of the art of current research
- Philosophical, ethical, social, economic, and political implications
- Connections with ALL adjacent and cross-cutting domains
- Comparison tables, detailed classifications
- In-depth case studies with complete analysis
- Future prospects and trends
- The document must be an EXHAUSTIVE reference on the subject`;
      default:
        return "";
    }
  }
}

function getDefaultPages(format: string, depth: string): number {
  const matrix: Record<string, Record<string, number>> = {
    article: { bas: 5, intermediaire: 12, avance: 20, expert: 25 },
    support: { bas: 10, intermediaire: 30, avance: 60, expert: 100 },
    cours: { intermediaire: 25, avance: 50, expert: 100 },
    livre: { avance: 150, expert: 300 },
  };
  return matrix[format]?.[depth] || 15;
}

export function buildChatSystemPrompt(documentContent: string, language: string): string {
  const lang = language === "en" ? "English" : "French";
  return `You are an AI tutor helping a student understand a document. Answer questions in ${lang}.
Here is the document content for context:

${documentContent.slice(0, 8000)}

Answer questions precisely based on the document. If the question goes beyond the document, explain clearly while relating back to the document's content.`;
}

export function buildEvaluationSystemPrompt(
  documentContent: string,
  depth: string,
  language: string
): string {
  const lang = language === "en" ? "English" : "French";
  return `You are Prisca, an expert educational evaluator. Generate an evaluation document in ${lang}.
Based on the following document content, create a comprehensive evaluation with:
1. Multiple choice questions (MCQ)
2. Short answer questions
3. Essay/analysis questions
4. True/False questions
5. Fill-in-the-blank questions

The evaluation depth should match "${depth}" level.
Use markdown formatting.
Include an answer key at the end.

Document content:
${documentContent.slice(0, 8000)}`;
}

export function generatePDF(title: string, content: string): void {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7; // ~1.5 spacing
    let pageNum = 1;

    const addPageNumber = () => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`${pageNum}`, pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.setTextColor(0, 0, 0);
    };

    const addNewPage = () => {
      addPageNumber();
      doc.addPage();
      pageNum++;
      return margin + 10;
    };

    // Title page
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(title, contentWidth);
    const titleY = pageHeight / 3;
    titleLines.forEach((line: string, i: number) => {
      doc.text(line, pageWidth / 2, titleY + i * 12, { align: "center" });
    });

    // Underline title
    const lastTitleY = titleY + (titleLines.length - 1) * 12 + 4;
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.8);
    doc.line(margin + 20, lastTitleY, pageWidth - margin - 20, lastTitleY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Prisca · Généré par IA", pageWidth / 2, lastTitleY + 15, { align: "center" });
    doc.setTextColor(0, 0, 0);

    addPageNumber();
    doc.addPage();
    pageNum++;

    // Content
    let y = margin + 10;
    const lines = content.split("\n");

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();

      // Heading detection
      if (trimmed.startsWith("######")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 3;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        doc.text(text, margin, y);
        y += lineHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("#####")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 4;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        doc.text(text, margin, y);
        y += lineHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("####")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 5;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bolditalic");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        doc.text(text, margin, y);
        y += lineHeight + 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("###")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 6;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        doc.text(text, margin, y);
        // Underline
        const tw = doc.getTextWidth(text);
        doc.setDrawColor(0, 128, 128);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 1.5, margin + tw, y + 1.5);
        y += lineHeight + 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("##")) {
        if (y > pageHeight - 45) y = addNewPage();
        y += 8;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        const centeredX = pageWidth / 2;
        doc.text(text, centeredX, y, { align: "center" });
        // Underline centered
        const tw = doc.getTextWidth(text);
        doc.setDrawColor(0, 128, 128);
        doc.setLineWidth(0.5);
        doc.line(centeredX - tw / 2, y + 2, centeredX + tw / 2, y + 2);
        y += lineHeight + 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("#")) {
        if (y > pageHeight - 50) y = addNewPage();
        y += 10;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        const text = trimmed.replace(/^#{1,6}\s*/, "");
        doc.text(text, pageWidth / 2, y, { align: "center" });
        const tw = doc.getTextWidth(text);
        doc.setDrawColor(0, 128, 128);
        doc.setLineWidth(0.7);
        doc.line(pageWidth / 2 - tw / 2, y + 3, pageWidth / 2 + tw / 2, y + 3);
        y += lineHeight + 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("---") || trimmed.startsWith("***")) {
        y += 4;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      } else if (trimmed === "") {
        y += 4;
      } else {
        // Normal paragraph text - justified
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        // Clean markdown
        let text = trimmed
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/`(.+?)`/g, "$1")
          .replace(/^[-*]\s/, "• ");

        const splitLines = doc.splitTextToSize(text, contentWidth);
        for (const sLine of splitLines) {
          if (y > pageHeight - 30) {
            y = addNewPage();
          }
          doc.text(sLine, margin, y, { maxWidth: contentWidth });
          y += lineHeight;
        }
      }
    }

    addPageNumber();
    doc.save(`${title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").slice(0, 50)}.pdf`);
  });
}

// Generate content in chunks by sections
export async function generateDocumentChunked(
  topic: string,
  level: string,
  format: string,
  depth: string,
  pages: number | null,
  language: string,
  tableOfContents: string,
  onProgress: (progress: number, step: string) => void
): Promise<{ toc: string; content: string }> {
  const systemPrompt = buildGenerateSystemPrompt(level, format, depth, pages, language);
  const targetPages = pages || getDefaultPages(format, depth);
  const isFr = language === "fr";

  // Step 1: Generate TOC (10%)
  onProgress(5, isFr ? "Génération de la table des matières..." : "Generating table of contents...");

  const tocPrompt = tableOfContents
    ? `Generate a detailed table of contents for a document about "${topic}" based on these guidelines:\n${tableOfContents}\n\nIMPORTANT: The document must be approximately ${targetPages} pages long. Generate enough sections and subsections to fill this length. List ONLY the table of contents, one entry per line, with the section numbers.`
    : `Generate a detailed table of contents for a document about "${topic}".\n\nIMPORTANT: The document must be approximately ${targetPages} pages long. Generate enough sections and subsections to fill this length. List ONLY the table of contents, one entry per line, with the section numbers.`;

  const toc = await callAI({
    action: "generate_toc",
    messages: [{ role: "user", content: tocPrompt }],
    systemPrompt,
  });

  onProgress(10, isFr ? "Table des matières créée" : "Table of contents created");

  // Parse sections from TOC
  const tocLines = toc.split("\n").filter((l) => l.trim().length > 0);
  // Group into major sections (lines starting with a number or # that aren't subsections)
  const majorSections: string[] = [];
  let currentGroup: string[] = [];

  for (const line of tocLines) {
    const trimmed = line.trim();
    // Detect major section (starts with single digit or #)
    const isMajor = /^(\d+[\.\)]|#{1,2}\s|[IVXLC]+[\.\)])/.test(trimmed) &&
      !/^(\d+\.\d+|#{3,})/.test(trimmed);
    if (isMajor && currentGroup.length > 0) {
      majorSections.push(currentGroup.join("\n"));
      currentGroup = [trimmed];
    } else {
      currentGroup.push(trimmed);
    }
  }
  if (currentGroup.length > 0) majorSections.push(currentGroup.join("\n"));

  // If too few sections, just split evenly
  const sections = majorSections.length >= 2 ? majorSections : tocLines.reduce<string[][]>((acc, line, i) => {
    const chunkIdx = Math.floor(i / Math.max(1, Math.ceil(tocLines.length / 5)));
    if (!acc[chunkIdx]) acc[chunkIdx] = [];
    acc[chunkIdx].push(line);
    return acc;
  }, []).map(group => group.join("\n"));

  // Step 2: Generate content section by section (10% - 95%)
  const totalSections = sections.length;
  let fullContent = "";
  const conversationHistory: { role: string; content: string }[] = [];

  for (let i = 0; i < totalSections; i++) {
    const sectionToc = sections[i];
    const progress = 10 + ((i / totalSections) * 85);
    const sectionLabel = sectionToc.split("\n")[0].trim().slice(0, 60);
    onProgress(
      progress,
      `${isFr ? "Rédaction de la section" : "Writing section"} ${i + 1}/${totalSections}: ${sectionLabel}...`
    );

    const pagesPerSection = Math.max(2, Math.round(targetPages / totalSections));

    const sectionPrompt = i === 0
      ? `Write the content for the following section(s) of the document about "${topic}":\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}. Write approximately ${pagesPerSection} pages (~${pagesPerSection * 500} words) for this section. Be thorough and detailed according to the depth level. Use proper markdown headings.`
      : `Continue writing the document about "${topic}". Now write the content for:\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}. Write approximately ${pagesPerSection} pages (~${pagesPerSection * 500} words). Continue from where you left off. Maintain the same style and depth level. Use proper markdown headings.`;

    conversationHistory.push({ role: "user", content: sectionPrompt });

    const sectionContent = await callAI({
      action: "generate_section",
      messages: conversationHistory.slice(-4), // Keep last 4 messages for context
      systemPrompt,
    });

    conversationHistory.push({ role: "assistant", content: sectionContent });
    fullContent += (i > 0 ? "\n\n" : "") + sectionContent;
  }

  onProgress(98, isFr ? "Finalisation du document..." : "Finalizing document...");

  return { toc, content: fullContent };
}
