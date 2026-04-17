import { supabase } from "@/integrations/supabase/client";

interface AIRequest {
  action: string;
  messages: { role: string; content: string }[];
  systemPrompt?: string;
}

async function callAIOnce(request: AIRequest): Promise<string> {
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

export async function callAI(request: AIRequest, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await callAIOnce(request);
      if (result && result.trim().length > 0) return result;
      throw new Error("Empty response from AI");
    } catch (err: any) {
      lastError = err;
      console.warn(`AI call attempt ${attempt + 1}/${maxRetries} failed:`, err.message);
      if (err.message?.includes("402") || err.message?.includes("Credits")) throw err;
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error("AI call failed after retries");
}

export function buildGenerateSystemPrompt(
  level: string, format: string, depth: string,
  pages: number | null, language: string, referenceContent?: string
): string {
  const lang = language === "en" ? "English" : "French";
  const targetPages = pages || getDefaultPages(format, depth);

  let prompt = `You are Prisca, an expert educational content writer. You write in ${lang}.
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
- encyclopedie: Exhaustive encyclopedia-style. Complete, authoritative, with cross-references. 200-1500 pages.

FORMATTING RULES:
- Use markdown with proper heading hierarchy (# for title, ## for chapters, ### for sections, #### for subsections).
- Write long, well-structured paragraphs that fully develop each idea.
- Include relevant dates, historical context, and real-world examples.
- Add concrete illustrations, case studies, and practical applications.
- Each section must be thoroughly developed — never superficial.
- The content MUST fill the target page count. Write extensively.
- NEVER cut content short. Always write the FULL requested amount.

BIBLIOGRAPHIC REFERENCES:
At the very end of the document, include a section "## Références Bibliographiques" (or "## Bibliographic References" in English) with:
- At least 5 relevant academic or authoritative references
- Include books, journal articles, and web resources where applicable
- Format: Author (Year). Title. Publisher/URL.`;

  if (referenceContent) {
    prompt += `\n\nREFERENCE DOCUMENTS (use this information to enrich the content):\n${referenceContent.slice(0, 15000)}`;
  }

  return prompt;
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
      default: return "";
    }
  } else {
    switch (depth) {
      case "bas":
        return `LOW DEPTH: Cover the core concept clearly and simply.`;
      case "intermediaire":
        return `INTERMEDIATE DEPTH: Develop the concept AND related topics in depth with 8-10 line paragraphs, historical dates, 3-5 examples per concept.`;
      case "avance":
        return `ADVANCED DEPTH: Complete mastery. 10-15 line paragraphs, systematic dates/names/places, 5-8 detailed examples, case studies, interdisciplinary connections.`;
      case "expert":
        return `EXPERT DEPTH: TOTAL EXHAUSTIVE coverage. 12-20 line paragraphs, every claim backed by facts, 8-12 examples, complete critical analysis, state of the art research.`;
      default: return "";
    }
  }
}

function getDefaultPages(format: string, depth: string): number {
  const matrix: Record<string, Record<string, number>> = {
    article: { bas: 5, intermediaire: 12, avance: 20, expert: 25 },
    support: { bas: 10, intermediaire: 30, avance: 60, expert: 100 },
    cours: { intermediaire: 25, avance: 50, expert: 100 },
    livre: { avance: 150, expert: 300 },
    encyclopedie: { avance: 400, expert: 800 },
  };
  return matrix[format]?.[depth] || 15;
}

export function buildChatSystemPrompt(documentContent: string, language: string): string {
  const lang = language === "en" ? "English" : "French";
  return `You are an AI tutor helping a student understand a document. Answer questions in ${lang}.
Here is the document content for context:

${documentContent.slice(0, 12000)}

Answer questions precisely based on the document. If the question goes beyond the document, explain clearly while relating back to the document's content.`;
}

export function buildImportedDocChatPrompt(documentContent: string, language: string): string {
  const lang = language === "en" ? "English" : "French";
  return `You are an AI assistant analyzing a document. Answer EXCLUSIVELY in ${lang}.

CRITICAL RULES:
- You must ONLY answer based on the document content provided below.
- You can reason, deduce, and infer, but EVERYTHING must be grounded in the document.
- If the answer is not in the document, say so clearly.
- Never make up information not present in the document.

DOCUMENT CONTENT:
${documentContent.slice(0, 15000)}`;
}

export function buildEvaluationSystemPrompt(
  documentContent: string, depth: string, language: string,
  questionType: string, questionCount: number, qcmPercent: number, qroPercent: number
): string {
  const lang = language === "en" ? "English" : "French";
  const isFr = language === "fr";

  let typeInstructions = "";
  if (questionType === "qcm") {
    typeInstructions = isFr
      ? `Générez UNIQUEMENT des questions à choix multiples (QCM). Chaque question doit avoir 4 options (A, B, C, D) avec une seule bonne réponse.`
      : `Generate ONLY multiple choice questions (MCQ). Each question must have 4 options (A, B, C, D) with one correct answer.`;
  } else if (questionType === "qro") {
    typeInstructions = isFr
      ? `Générez UNIQUEMENT des questions à réponses ouvertes (QRO). Les réponses attendues doivent être détaillées.`
      : `Generate ONLY open-ended questions (OEQ). Expected answers should be detailed.`;
  } else {
    typeInstructions = isFr
      ? `Générez ${Math.round(questionCount * qcmPercent / 100)} questions à choix multiples (QCM, 4 options A/B/C/D) et ${Math.round(questionCount * qroPercent / 100)} questions à réponses ouvertes (QRO).`
      : `Generate ${Math.round(questionCount * qcmPercent / 100)} multiple choice questions (MCQ, 4 options A/B/C/D) and ${Math.round(questionCount * qroPercent / 100)} open-ended questions (OEQ).`;
  }

  return `You are Prisca, an expert educational evaluator. Generate an evaluation document in ${lang}.

REQUIREMENTS:
- Generate exactly ${questionCount} questions total.
- ${typeInstructions}
- The evaluation depth should match "${depth}" level.
- Use markdown formatting.
- Number all questions clearly.

STRUCTURE:
1. First, write the EVALUATION with all questions (without answers).
2. Then write a clear separator: "---ANSWERS---"
3. Then write the COMPLETE ANSWER KEY with detailed explanations for each question.

${isFr ? "Pour les QCM, indiquez la bonne réponse et expliquez pourquoi. Pour les QRO, fournissez une réponse modèle complète." : "For MCQs, indicate the correct answer and explain why. For OEQs, provide a complete model answer."}

Document content:
${documentContent.slice(0, 12000)}`;
}

export function generatePDF(title: string, content: string): void {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7;
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

    let y = margin + 10;
    const lines = content.split("\n");

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();

      if (trimmed.startsWith("######")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 3;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(trimmed.replace(/^#{1,6}\s*/, ""), margin, y);
        y += lineHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("#####")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 4;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(trimmed.replace(/^#{1,6}\s*/, ""), margin, y);
        y += lineHeight + 1;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      } else if (trimmed.startsWith("####")) {
        if (y > pageHeight - 40) y = addNewPage();
        y += 5;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bolditalic");
        doc.text(trimmed.replace(/^#{1,6}\s*/, ""), margin, y);
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
        doc.text(text, pageWidth / 2, y, { align: "center" });
        const tw = doc.getTextWidth(text);
        doc.setDrawColor(0, 128, 128);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - tw / 2, y + 2, pageWidth / 2 + tw / 2, y + 2);
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
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        let text = trimmed
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/`(.+?)`/g, "$1")
          .replace(/^[-*]\s/, "• ");
        const splitLines = doc.splitTextToSize(text, contentWidth);
        for (const sLine of splitLines) {
          if (y > pageHeight - 30) y = addNewPage();
          doc.text(sLine, margin, y, { maxWidth: contentWidth });
          y += lineHeight;
        }
      }
    }
    addPageNumber();
    doc.save(`${title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").slice(0, 50)}.pdf`);
  });
}

export function estimatePageCount(content: string): number {
  const lines = content.split('\n');
  let totalLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') totalLines += 0.5;
    else if (trimmed.startsWith('#')) totalLines += 3;
    else totalLines += Math.max(1, Math.ceil(trimmed.length / 80));
  }
  return Math.max(1, Math.ceil(totalLines / 35) + 1);
}

export async function checkContentAppropriate(content: string, language: string): Promise<{ ok: boolean; theme: string }> {
  const isFr = language === "fr";
  const response = await callAI({
    action: "check_content",
    messages: [{
      role: "user",
      content: `Analyze the following document excerpt and:
1. Identify the main theme/subject in 2-5 words.
2. Check if the content contains erotic, sexual, partisan political, or other inappropriate content.

Respond in this exact format:
THEME: [theme]
APPROPRIATE: [YES or NO]

Document excerpt:
${content.slice(0, 3000)}`
    }],
    systemPrompt: `You are a content moderator. Respond concisely in ${isFr ? "French" : "English"}.`,
  }, 2);

  const themeMatch = response.match(/THEME:\s*(.+)/i);
  const appropriateMatch = response.match(/APPROPRIATE:\s*(YES|NO)/i);
  
  return {
    theme: themeMatch?.[1]?.trim() || (isFr ? "Non déterminé" : "Undetermined"),
    ok: appropriateMatch?.[1]?.toUpperCase() !== "NO",
  };
}

// Fast keyword-based topic check (instant, no API call). Falls through to AI if borderline.
export function checkTopicLocally(topic: string): { ok: boolean; reason?: string } {
  const t = topic.toLowerCase();
  const blocklist = [
    // Sexual / erotic
    "porn", "porno", "pornograph", "érotique", "erotic", "sexe explicite", "explicit sex", "nudité", "nudity", "xxx",
    "sextape", "fellation", "masturbat", "orgasme", "orgasm", "pédophil", "pedophil", "incest",
    // Religious sensitive (proselytism / hate)
    "convertir au", "convert to ", "anti-islam", "anti-chrétien", "anti-christian", "anti-juif", "anti-jew",
    "blasphème contre", "blasphemy against", "secte ", "cult worship",
    // Politics partisan / fascist
    "nazi", "nazism", "nazisme", "fasciste", "fascism", "fascisme", "hitler", "mussolini",
    "suprémaciste", "supremacist", "kkk", "white power", "génocide", "genocide ",
    "djihad", "jihad", "terrorist", "terroriste", "isis", "daesh", "al-qaida", "al qaeda",
    // Drugs / weapons
    "fabriquer une bombe", "make a bomb", "build a bomb", "synthétiser de la drogue", "synthesize drug",
    "cocaïne fabrication", "meth synthesis", "fabriquer arme",
    // Hate / violence
    "comment tuer", "how to kill", "suicide method", "méthode suicide",
  ];
  for (const word of blocklist) {
    if (t.includes(word)) {
      return { ok: false, reason: word };
    }
  }
  return { ok: true };
}

// Fast AI-based topic moderation (one quick call before generation starts)
export async function checkTopicAppropriate(topic: string, language: string): Promise<{ ok: boolean; reason: string }> {
  // Quick local check first
  const local = checkTopicLocally(topic);
  if (!local.ok) {
    return {
      ok: false,
      reason: language === "fr"
        ? "Ce sujet contient du contenu sensible (érotique, politique partisan, fasciste, religieux extrême ou violent) et ne peut pas être généré."
        : "This topic contains sensitive content (erotic, partisan political, fascist, extreme religious or violent) and cannot be generated.",
    };
  }

  try {
    const response = await callAI({
      action: "check_topic",
      messages: [{
        role: "user",
        content: `Topic: "${topic}"

Is this topic appropriate for an EDUCATIONAL document? It must NOT be:
- Pornographic, erotic, or sexually explicit
- Partisan political propaganda (favoring a specific party/leader)
- Fascist, Nazi, or supremacist content
- Religious proselytism or hate against a religion
- Promoting violence, terrorism, or illegal activities
- Instructions for making weapons, drugs, or dangerous substances

Educational discussion of these topics in a neutral academic context IS allowed (e.g., "history of fascism", "comparative religions", "drug addiction prevention").

Respond with ONLY one of:
APPROPRIATE
INAPPROPRIATE: [brief reason]`,
      }],
      systemPrompt: "You are a strict but fair content moderator for educational content.",
    }, 1);

    if (/^INAPPROPRIATE/i.test(response.trim())) {
      const reasonMatch = response.match(/INAPPROPRIATE:\s*(.+)/i);
      return {
        ok: false,
        reason: language === "fr"
          ? `Sujet refusé : ${reasonMatch?.[1] || "contenu sensible"}`
          : `Topic refused: ${reasonMatch?.[1] || "sensitive content"}`,
      };
    }
    return { ok: true, reason: "" };
  } catch (err) {
    // If moderation fails, allow (don't block users on transient errors)
    console.warn("Topic moderation check failed, allowing:", err);
    return { ok: true, reason: "" };
  }
}

export async function generateDocumentChunked(
  topic: string, level: string, format: string, depth: string,
  pages: number | null, language: string, tableOfContents: string,
  onProgress: (progress: number, step: string, partial: { toc?: string; content?: string; sectionIdx?: number; totalSections?: number }) => void,
  referenceContent?: string,
  resumeFrom?: { toc: string; content: string; nextSectionIdx: number }
): Promise<{ toc: string; content: string }> {
  const systemPrompt = buildGenerateSystemPrompt(level, format, depth, pages, language, referenceContent);
  const targetPages = pages || getDefaultPages(format, depth);
  const isFr = language === "fr";

  let toc: string;
  if (resumeFrom?.toc) {
    toc = resumeFrom.toc;
    onProgress(10, isFr ? "Reprise de la génération..." : "Resuming generation...", { toc });
  } else {
    onProgress(5, isFr ? `Analyse et structuration : ${topic.slice(0, 50)}...` : `Analyzing and structuring: ${topic.slice(0, 50)}...`, {});

    const tocPrompt = tableOfContents
      ? `Generate a detailed table of contents for a document about "${topic}" based on these guidelines:\n${tableOfContents}\n\nIMPORTANT: The document must be approximately ${targetPages} pages long. Generate enough sections and subsections to fill this length. List ONLY the table of contents, one entry per line, with section numbers.`
      : `Generate a detailed table of contents for a document about "${topic}".\n\nIMPORTANT: The document must be approximately ${targetPages} pages long. Generate enough sections and subsections to fill this length. For ${targetPages} pages, you need at least ${Math.max(5, Math.ceil(targetPages / 10))} major sections. List ONLY the table of contents, one entry per line, with section numbers.`;

    toc = await callAI({
      action: "generate_toc",
      messages: [{ role: "user", content: tocPrompt }],
      systemPrompt,
    });

    onProgress(10, isFr ? "Structure créée" : "Structure created", { toc });
  }

  const tocLines = toc.split("\n").filter((l) => l.trim().length > 0);
  const majorSections: string[] = [];
  let currentGroup: string[] = [];

  for (const line of tocLines) {
    const trimmed = line.trim();
    const isMajor = /^(\d+[\.\)]|#{1,2}\s|[IVXLC]+[\.\)])/.test(trimmed) && !/^(\d+\.\d+|#{3,})/.test(trimmed);
    if (isMajor && currentGroup.length > 0) {
      majorSections.push(currentGroup.join("\n"));
      currentGroup = [trimmed];
    } else {
      currentGroup.push(trimmed);
    }
  }
  if (currentGroup.length > 0) majorSections.push(currentGroup.join("\n"));

  const sections = majorSections.length >= 2 ? majorSections : tocLines.reduce<string[][]>((acc, line, i) => {
    const chunkIdx = Math.floor(i / Math.max(1, Math.ceil(tocLines.length / 5)));
    if (!acc[chunkIdx]) acc[chunkIdx] = [];
    acc[chunkIdx].push(line);
    return acc;
  }, []).map(group => group.join("\n"));

  const totalSections = sections.length;
  let fullContent = resumeFrom?.content || "";
  const startIdx = resumeFrom?.nextSectionIdx || 0;

  for (let i = startIdx; i < totalSections; i++) {
    const sectionToc = sections[i];
    const progress = 10 + ((i / totalSections) * 85);
    const sectionName = sectionToc.split("\n")[0].trim().replace(/^[\d#.\)\-]+\s*/, "").slice(0, 80);
    
    onProgress(
      progress,
      `${isFr ? "Rédaction section" : "Writing section"} ${i + 1}/${totalSections} : ${sectionName}`,
      { toc, content: fullContent, sectionIdx: i, totalSections }
    );

    const pagesPerSection = Math.max(3, Math.round(targetPages / totalSections));
    const wordsPerSection = pagesPerSection * 500;

    const sectionPrompt = i === 0
      ? `Write the COMPLETE and DETAILED content for the following section of the document about "${topic}":\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}. Write approximately ${wordsPerSection} words for this section. Be thorough and detailed. Use proper markdown headings. NEVER be brief or superficial.`
      : `Continue writing the document about "${topic}". Now write the COMPLETE and DETAILED content for:\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}. Write approximately ${wordsPerSection} words. Continue from where you left off. Maintain the same style and depth level. Use proper markdown headings. NEVER be brief or superficial.`;

    try {
      const sectionContent = await callAI({
        action: "generate_section",
        messages: [{ role: "user", content: sectionPrompt }],
        systemPrompt,
      });
      fullContent += (fullContent.length > 0 ? "\n\n" : "") + sectionContent;
      // Save after each section to enable resume
      onProgress(progress + (85 / totalSections), `${isFr ? "Section terminée" : "Section completed"} ${i + 1}/${totalSections}`, { toc, content: fullContent, sectionIdx: i + 1, totalSections });
    } catch (err) {
      console.error(`Section ${i + 1} failed:`, err);
      try {
        const simplePrompt = `Write detailed content about: ${sectionToc}\n\nTopic: "${topic}". Write at least ${Math.round(wordsPerSection / 2)} words. Use markdown headings.`;
        const fallbackContent = await callAI({
          action: "generate_section_retry",
          messages: [{ role: "user", content: simplePrompt }],
          systemPrompt,
        });
        fullContent += (fullContent.length > 0 ? "\n\n" : "") + fallbackContent;
      } catch (retryErr) {
        console.error(`Section ${i + 1} retry also failed:`, retryErr);
        // If it's an offline / network error, propagate so the job can pause and resume
        const msg = String((retryErr as any)?.message || "");
        if (msg === "OFFLINE" || /network|fetch|failed to fetch/i.test(msg)) {
          // Save current state into a custom error so caller can resume
          const resumeErr = new Error("RESUMABLE");
          (resumeErr as any).resumeState = { toc, content: fullContent, nextSectionIdx: i };
          throw resumeErr;
        }
        fullContent += (fullContent.length > 0 ? "\n\n" : "") + `## ${sectionName}\n\n*[Section generation failed. Please regenerate this section.]*`;
      }
    }

    if (i < totalSections - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  onProgress(98, isFr ? "Finalisation du document..." : "Finalizing document...", { toc, content: fullContent });
  return { toc, content: fullContent };
}
