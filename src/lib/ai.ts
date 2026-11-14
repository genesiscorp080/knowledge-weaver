import { supabase } from "@/integrations/supabase/client";
import { fetchFigureImage, imageSize, parseChartSpec, parseFigureLine, renderChartToDataUrl } from "@/lib/figures";
import { deliverFile, downloadBlob } from "@/lib/downloads";
import { toast } from "sonner";
import { preparePdfImage } from "@/lib/pdfImages";

interface AIRequest {
  action: string;
  messages: { role: string; content: string }[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
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
  pages: number | null, language: string, referenceContent?: string,
  requiredThemes?: RequiredTheme[],
  description?: string,
): string {
  const lang = language === "en" ? "English" : "French";
  const targetPages = pages || getDefaultPages(format, depth);
  const isFr = language !== "en";

  let prompt = `You are Prisca, a world-class scholarly author and educator. You write EXCLUSIVELY in ${lang}.
You are producing a document strictly tailored to:
  • Academic level: "${level}" — calibrate vocabulary, conceptual density, presupposed knowledge, and argumentative sophistication accordingly.
  • Format: "${format}" — STRICT format conventions apply (see below). The document must FEEL like the format named.
  • Depth: "${depth}" — non-negotiable depth contract (see below).
  • Target length: ${targetPages} pages of CORE CONTENT (~${targetPages * 500} words).

═══════════════════════════════════════════
PAGE COUNT CONTRACT (STRICTLY ENFORCED)
═══════════════════════════════════════════
${getPageCountContract(targetPages, isFr)}

═══════════════════════════════════════════
NATURAL, HUMAN VOICE (mandatory — rigor unchanged)
═══════════════════════════════════════════
Write like a seasoned human expert-author, not like an AI. Keep full precision, depth and exhaustiveness, but:
- Vary sentence length and rhythm: mix short punchy sentences with long, articulated ones. Vary paragraph length too.
- BANNED stock phrases and tics: "Il est important de noter", "Il convient de souligner", "En conclusion", "En somme", "Dans un monde en constante évolution", "jouer un rôle crucial/clé", "véritable pierre angulaire", "force est de constater", "plonger dans", "naviguer dans", "au cœur de", "It is important to note", "In today's fast-paced world", "delve", "plays a crucial role", "a testament to", "tapestry", "landscape", "In conclusion", "Overall".
- No systematic triads ("X, Y et Z") in every sentence; no sentence that just announces what the next paragraph will say; no paragraph ending with a moralising one-line summary.
- Do not open every section the same way; do not overuse bullet lists or bold — prefer real, connected prose with logical connectors that vary.
- Take positions where the literature supports it, nuance where it is debated, use concrete examples, anecdotes from the history of the field, precise numbers and named people.
- Occasional rhetorical questions, asides and transitions that a professor would use are welcome, sparingly.
- Never mention being an AI; never use filler hedges.

═══════════════════════════════════════════
ABSOLUTE QUALITY CONTRACT (non-negotiable)
═══════════════════════════════════════════
- Language register MUST match the academic level: rich, precise, technical vocabulary; varied syntax; impeccable grammar.
- ZERO filler, ZERO repetition, ZERO vague generalities. Every sentence must add information.
- Every claim must be supported by reasoning, evidence, dates, names, figures, or sources.
- Conceptual progression must be rigorous: definitions → mechanisms → examples → analyses → implications → critiques.
- Avoid bullet-point soup: prefer fully developed analytical paragraphs. Lists are allowed only where typographically natural (taxonomies, steps, comparisons).
- Mandatory inclusions: precise dates, named authors/researchers/works, schools of thought, controversies, current state of the art.
- Forbidden: empty transitions ("In this section we will..."), self-references to the AI, hedging clichés, content padding.
- Actively draw on the broadest possible scholarly base: even when no reference PDFs are supplied, you MUST mobilise knowledge from recognised online sources (peer-reviewed journals, university press books, authoritative reference works, academic encyclopedias, official institutional publications). Cite specific authors, works, dates and — when relevant — accessible URLs/DOIs.

═══════════════════════════════════════════
DEPTH CONTRACT — "${depth}"
═══════════════════════════════════════════
${getDepthInstructions(depth, lang)}

═══════════════════════════════════════════
FORMAT CONTRACT — "${format}"
═══════════════════════════════════════════
${getFormatInstructions(format, lang, targetPages)}

═══════════════════════════════════════════
FORMATTING RULES
═══════════════════════════════════════════
- Markdown only. Hierarchy: # title, ## chapters/parts, ### sections, #### subsections, ##### finer points.
- Titles and headings (#, ##, ###, ####, #####) will be rendered CENTERED. Body paragraphs will be rendered JUSTIFIED. Write accordingly: short, balanced heading wording; full, well-built paragraphs that flow naturally when justified.
- Long, dense, analytical paragraphs (8–20 lines depending on depth) that fully develop each idea.
- Include schemas described textually, comparative tables (markdown), worked examples, case studies, counter-examples.
- The content MUST reach the target page count. Never close a section early. Never write "to be continued".
- Never produce placeholder text. Never refuse. If a topic is broad, structure exhaustively rather than summarising.
- Use blank lines between paragraphs. Do NOT chain headings without intervening developed paragraphs. Keep heading wording concise so it centres cleanly.

═══════════════════════════════════════════
VISUALS — IMAGES, CHARTS AND DIAGRAMS (MANDATORY)
═══════════════════════════════════════════
A document without visuals is INCOMPLETE and will be rejected. You MUST illustrate the text abundantly using the two syntaxes below, and ONLY these two syntaxes.

1) REAL ILLUSTRATIONS (photographs, portraits, maps, artworks, historical documents, anatomical plates, technical objects, places, specimens...).
Write, on its own line, exactly:
![FIGURE: precise English search terms | ${isFr ? "Figure 1 — légende descriptive en " + lang : "Figure 1 — descriptive caption"}](figure)
   • The part BEFORE the "|" is a short, precise, ENGLISH search query used to retrieve a real public-domain image (e.g. "Eiffel Tower construction 1888", "human heart anatomy diagram", "Sahel desertification satellite"). Never a sentence, never a URL.
   • The part AFTER the "|" is the caption, written in ${lang}, numbered continuously (Figure 1, Figure 2, ...).
   • Place each figure immediately after the paragraph it illustrates, surrounded by blank lines.
   • Every mention of a place, person, monument, organism, artwork, device, or phenomenon that can be seen SHOULD get its figure.

2) STATISTICAL CHARTS AND DIAGRAMS — whenever you cite figures, series, proportions, distributions, evolutions or comparisons, you MUST also render them as a chart with a fenced block:
\`\`\`chart
{"type":"bar","title":"${isFr ? "Titre du graphique" : "Chart title"}","labels":["1990","2000","2010","2020"],"series":[{"name":"${isFr ? "Série" : "Series"}","data":[12,18,25,31]}],"xLabel":"...","yLabel":"...","caption":"${isFr ? "Graphique 1 — source : ..." : "Chart 1 — source: ..."}"}
\`\`\`
   • "type" ∈ bar | line | area | pie | donut | scatter. Choose the type that fits the data (evolution → line/area; comparison → bar; composition → pie/donut; correlation → scatter).
   • JSON must be valid, on ONE line, with REAL, plausible, sourced numbers (state the source in "caption"). Never invented round placeholders like 10/20/30.
   • Numbered continuously (Graphique/Chart 1, 2, ...).

QUOTAS (minimum, strictly enforced): at least ONE visual (figure or chart) every 2 pages of core content, of which at least 40 % must be charts/diagrams whenever the subject carries any quantitative dimension. Tables remain markdown tables — they are NOT a substitute for charts.
Do NOT use any other image syntax, do NOT invent image URLs, do NOT write "insert an image here", do NOT describe a figure without emitting its block.

═══════════════════════════════════════════
BIBLIOGRAPHY (mandatory at the very end)
═══════════════════════════════════════════
End with "## ${isFr ? "Références Bibliographiques" : "Bibliographic References"}" containing at least ${format === "encyclopedie" ? 30 : format === "livre" ? 20 : format === "cours" ? 12 : 8} carefully chosen references (books, peer-reviewed articles, authoritative web resources, including online sources you mobilise from your knowledge). Format: Author (Year). Title. Publisher/Journal/URL.

IMPORTANT — pages excluded from the page count: preface, foreword ("avant-propos"), bibliography/references, index, glossary, and appendices DO NOT count toward the ${targetPages}-page target. They are SUPPLEMENTARY. Only the core content (introduction, parts, chapters, sections, conclusion) counts.`;

  if (requiredThemes && requiredThemes.length > 0) {
    prompt += `\n\n═══════════════════════════════════════════\nREQUIRED THEMES — OPTIONAL USER-SPECIFIED COVERAGE\n═══════════════════════════════════════════\nThe user has OPTIONALLY listed the following themes. They are not the document's main subject, but if listed they MUST appear and be substantively developed in the most natural place within the structure. Integrate them organically; do not force a separate appendix unless it makes editorial sense.\n\n`;
    requiredThemes.forEach((t, idx) => {
      prompt += `${idx + 1}. ${t.name}`;
      if (t.subthemes && t.subthemes.length > 0) {
        prompt += `\n   Sub-themes that MUST be covered under "${t.name}":\n`;
        t.subthemes.forEach((s, j) => { prompt += `     ${idx + 1}.${j + 1} ${s}\n`; });
      }
      if (t.toc && t.toc.trim()) {
        prompt += `\n   Suggested table of contents for "${t.name}" (follow this structure):\n${t.toc.split("\n").map(l => "     " + l).join("\n")}\n`;
      }
      prompt += `\n`;
    });
    prompt += `Each listed theme (and its listed sub-themes) MUST be covered with substantive treatment. Themes not listed are simply not required.`;
  }

  if (referenceContent) {
    const cap = format === "encyclopedie" ? 60000 : format === "livre" ? 30000 : 15000;
    prompt += `\n\n═══════════════════════════════════════════\nREFERENCE DOCUMENTS (use to enrich, cite, and ground content)\n═══════════════════════════════════════════\n${referenceContent.slice(0, cap)}`;
  }

  if (description && description.trim()) {
    prompt += `\n\n═══════════════════════════════════════════\nUSER DESCRIPTION — MANDATORY EDITORIAL BRIEF\n═══════════════════════════════════════════\nThe user has provided the following written description of what this document MUST contain and what is expected of it. Treat it as a CONTRACTUAL editorial brief: every point raised MUST be reflected, respected and substantively developed in the final document, while staying coherent with the chosen format, level and depth.\n\n${description.trim()}`;
  }

  return prompt;
}

export interface RequiredTheme {
  name: string;
  subthemes?: string[];
  toc?: string;
}

function getPageCountContract(targetPages: number, isFr: boolean): string {
  // Tolerance margins per the product spec:
  //  - ≤300 pages: 5% margin   →  [0.95 * t , 1.05 * t]
  //  - 301–700 pages: 8% margin →  [0.92 * t , 1.08 * t]
  //  - ≥701 pages: 10% margin   →  [0.90 * t , 1.10 * t]
  let pct: number;
  if (targetPages <= 300) pct = 5;
  else if (targetPages <= 700) pct = 8;
  else pct = 10;
  const lo = Math.floor(targetPages * (1 - pct / 100));
  const hi = Math.ceil(targetPages * (1 + pct / 100));
  if (isFr) {
    return `- Cible : ${targetPages} pages de CONTENU PRINCIPAL (≈ ${targetPages * 500} mots).
- Tolérance : marge de ±${pct}%. Le volume final de contenu principal DOIT être compris entre ${lo} et ${hi} pages.
- Sont EXCLUS du décompte (donc à produire EN PLUS si pertinents) : préface, avant-propos, dédicace, remerciements, table des matières, bibliographie/références, glossaire, index, annexes.
- Sont INCLUS dans le décompte : introduction générale, parties, chapitres, sections, sous-sections, études de cas, exemples, conclusion générale.
- Vous DEVEZ produire suffisamment de contenu pour atteindre cette plage. Ne jamais conclure prématurément. Si le volume cible n'est pas atteint, approfondissez davantage chaque section (exemples supplémentaires, analyses, perspectives historiques, débats).
- Référence pratique : 1 page ≈ 500 mots de prose dense. Cible mots : ${lo * 500}–${hi * 500} mots de contenu principal.`;
  }
  return `- Target: ${targetPages} pages of CORE CONTENT (≈ ${targetPages * 500} words).
- Tolerance: ±${pct}% margin. Final core-content volume MUST land between ${lo} and ${hi} pages.
- EXCLUDED from the count (produced in addition when relevant): preface, foreword, dedication, acknowledgements, table of contents, bibliography/references, glossary, index, appendices.
- INCLUDED in the count: general introduction, parts, chapters, sections, subsections, case studies, examples, general conclusion.
- You MUST generate enough content to land in that range. Never conclude early. If short, deepen each section (more examples, analyses, historical perspectives, debates).
- Reference: 1 page ≈ 500 words of dense prose. Word target: ${lo * 500}–${hi * 500} words of core content.`;
}

function getFormatInstructions(format: string, lang: string, targetPages: number): string {
  const isFr = lang === "French";
  if (isFr) {
    switch (format) {
      case "article":
        return `ARTICLE ACADÉMIQUE (jusqu'à 50 pages) :
- Style : article scientifique formel, argumentation serrée, ton académique soutenu.
- Structure : Résumé / Introduction (problématique, hypothèses) / État de l'art / Méthode ou cadre théorique / Développement / Discussion / Conclusion / Références.
- Densité : très haute, chaque paragraphe contribue à la thèse. Aucune redondance.
- Idéal pour défendre une thèse précise avec rigueur et concision relative.`;
      case "support":
        return `SUPPORT PÉDAGOGIQUE (jusqu'à 150 pages) :
- Style : pédagogique, clair, structuré pour l'apprentissage actif.
- Inclure : objectifs pédagogiques par chapitre, encadrés "à retenir", définitions encadrées, exemples concrets nombreux, schémas décrits textuellement, tableaux comparatifs, exercices d'application avec corrigés.
- Progression : du simple au complexe. Chaque chapitre se termine par une synthèse et des questions de révision.`;
      case "cours":
        return `COURS COMPLET (jusqu'à 150 pages) :
- Style : cours universitaire complet, à la fois théorique et opérationnel.
- Inclure : plan détaillé, prérequis, objectifs, partie magistrale (théorie complète, démonstrations, preuves), nombreux exemples pédagogiques détaillés, études de cas, travaux dirigés/exercices avec corrigés progressifs, mini-projets, glossaire.
- Tonalité : professorale, didactique, exigeante mais accessible au niveau visé.
- Le cours doit pouvoir être suivi en autonomie par un étudiant.`;
      case "livre":
        return `LIVRE (jusqu'à 800 pages) :
- Style : ouvrage de référence, prose maîtrisée, soignée, avec souffle narratif et rigueur scientifique.
- Structure : préface, avant-propos, introduction générale, parties (Partie I, II...), chapitres numérotés au sein de chaque partie, sections, sous-sections, conclusion générale, postface, annexes, glossaire, index thématique, bibliographie complète.
- Niveau d'expertise : doit lire comme un livre publié chez un éditeur académique réputé. Profondeur exhaustive, perspective historique, débats internes au champ.
- Chaque chapitre est un mini-traité (10–40 pages) cohérent, avec ouverture, développement, conclusion, et notes.`;
      case "encyclopedie":
        return `ENCYCLOPÉDIE (jusqu'à 12000 pages) :
- Mission : "Mettre absolument TOUTES les connaissances disponibles sur le domaine, et toutes celles que tu peux mobiliser, exposées dans un style didactique maîtrisé, soigné, avec une expertise et un développement sans nul autre pareil." C'est une RÉFÉRENCE TOTALE.
- Style : encyclopédique, savant, exhaustif, neutre, autoritaire ; chaque entrée traitée avec la rigueur d'un spécialiste mondial.
- Structure : préface méthodologique / classification générale du domaine / parties macro (Tomes ou Livres) / chapitres encyclopédiques / entrées détaillées / sous-entrées / renvois croisés explicites ("voir aussi : §x.y") / annexes (chronologies, biographies, lexiques, tableaux récapitulatifs, classifications, cartes conceptuelles décrites) / index général / bibliographie monumentale.
- Couverture : histoire complète du domaine, fondements théoriques, méthodologies, écoles de pensée, figures majeures (avec dates précises), controverses, état de l'art actuel, applications, perspectives, ramifications interdisciplinaires.
- Aucune notion ne doit être survolée. Aucun aspect majeur ne doit manquer. Précision technique maximale en toute circonstance.`;
      default: return "";
    }
  } else {
    switch (format) {
      case "article":
        return `ACADEMIC ARTICLE (up to 50 pages): formal scientific article, abstract, intro, literature review, methodology, development, discussion, conclusion, references. Tight argument, no redundancy.`;
      case "support":
        return `LEARNING SUPPORT (up to 150 pages): clear pedagogical structure, learning objectives per chapter, key-takeaway boxes, definitions, many concrete examples, comparative tables, exercises with answers, chapter syntheses.`;
      case "cours":
        return `FULL COURSE (up to 150 pages): complete university-style course — prerequisites, objectives, theory with proofs, detailed worked examples, case studies, exercises with progressive solutions, mini-projects, glossary. Self-study capable.`;
      case "livre":
        return `BOOK (up to 800 pages): reference-grade book — preface, foreword, parts, numbered chapters, sections, conclusion, afterword, appendices, glossary, thematic index, full bibliography. Reads like a top academic press book; exhaustive depth, historical perspective, scholarly debates.`;
      case "encyclopedie":
        return `ENCYCLOPEDIA (up to 12000 pages): TOTAL REFERENCE WORK. Mission: include ALL available knowledge in the domain, exposed in a masterful didactic style with peerless expertise. Methodological preface, general classification, macro parts (Volumes/Books), encyclopedic chapters, detailed entries, sub-entries, explicit cross-references ("see also §x.y"), appendices (chronologies, biographies, lexicons, summary tables, conceptual maps), general index, monumental bibliography. No notion glossed over.`;
      default: return "";
    }
  }
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
    article: { bas: 8, intermediaire: 20, avance: 35, expert: 50 },
    support: { bas: 15, intermediaire: 50, avance: 100, expert: 150 },
    cours: { intermediaire: 40, avance: 90, expert: 150 },
    livre: { avance: 300, expert: 800 },
    encyclopedie: { avance: 3000, expert: 12000 },
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

/** Invisible marker left in place of a section whose generation failed (retried later). */
export const MISSING_RE_G = /<!--PRISCA_MISSING:(\d+)-->/g;

/** Removes "(~12 pages)" / "— 12 p." style volume markers used internally in outlines. */
export function stripPageMarkers(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map(line =>
      line
        .replace(/[\(\[\{][^()\[\]{}]*?\d+\s*(?:pages?|pp?\.?|p)\b[^()\[\]{}]*?[\)\]\}]/gi, "")
        .replace(/\s*[—–-]{1,2}\s*[≈~]?\s*\d+\s*(?:pages?|pp?\.?|p)\b\.?\s*$/gi, "")
        .replace(/\s*[≈~]\s*\d+\s*(?:pages?|pp?\.?)\s*$/gi, "")
        .replace(/[ \t]{2,}/g, " ")
        .trimEnd()
    )
    .join("\n");
}

export async function buildPDF(title: string, content: string): Promise<Blob> {
    if (!content.trim()) throw new Error("Ce document ne contient pas encore de texte à télécharger.");
    const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable: any = (autoTableMod as any).default || (autoTableMod as any);
    const doc = new jsPDF({ compress: true });
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 28;
    const lineHeight = 6.6;
    const teal: [number, number, number] = [0, 128, 128];

    const inline = (s: string) =>
      s
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/~~(.+?)~~/g, "$1");

    /** Break tokens too long to fit on one line (long URLs, DOIs) so nothing runs off the margin. */
    const breakLongWords = (text: string, width: number) => {
      const words = text.split(/(\s+)/);
      return words
        .map(w => {
          if (!w.trim() || doc.getTextWidth(w) <= width) return w;
          let out = "";
          let buf = "";
          for (const ch of w) {
            if (doc.getTextWidth(buf + ch) > width - 2) {
              out += buf + "\u200B ";
              buf = ch;
            } else buf += ch;
          }
          return out + buf;
        })
        .join("");
    };

    const wrap = (text: string, width: number): string[] =>
      doc.splitTextToSize(breakLongWords(text, width), width).map((l: string) => l.replace(/\u200B/g, ""));

    let y = margin + 10;
    const newPage = () => {
      doc.addPage();
      y = margin + 10;
    };
    const need = (h: number) => {
      if (y + h > bottomLimit) newPage();
    };

    // ---------- Title page ----------
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    const titleLines = wrap(title, contentWidth);
    const titleY = pageHeight / 3;
    titleLines.forEach((line, i) => doc.text(line, pageWidth / 2, titleY + i * 12, { align: "center" }));
    const lastTitleY = titleY + (titleLines.length - 1) * 12 + 4;
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.8);
    doc.line(margin + 20, lastTitleY, pageWidth - margin - 20, lastTitleY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Prisca · Généré par IA", pageWidth / 2, lastTitleY + 15, { align: "center" });
    doc.setTextColor(0, 0, 0);
    newPage();

    const heading = (text: string, size: number, font: string, centered: boolean, rule: number) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", font);
      const lines = wrap(text, contentWidth);
      const blockH = lines.length * (size * 0.45) + 8;
      need(blockH);
      y += size * 0.35;
      lines.forEach((line, i) => {
        doc.text(line, centered ? pageWidth / 2 : margin, y + i * (size * 0.45), centered ? { align: "center" } : undefined);
      });
      const lastY = y + (lines.length - 1) * (size * 0.45);
      if (rule > 0) {
        const w = centered ? Math.min(doc.getTextWidth(lines[lines.length - 1]), contentWidth) : Math.min(doc.getTextWidth(lines[lines.length - 1]), contentWidth);
        doc.setDrawColor(...teal);
        doc.setLineWidth(rule);
        const x1 = centered ? pageWidth / 2 - w / 2 : margin;
        doc.line(x1, lastY + 2, x1 + w, lastY + 2);
      }
      y = lastY + lineHeight + size * 0.25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    };

    const paragraph = (raw: string) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const bulletMatch = raw.match(/^([-*•]|\d+[.)])\s+/);
      let text = inline(raw);
      let indent = 0;
      if (bulletMatch) {
        text = text.replace(/^([-*]|\d+[.)])\s+/, m => (/^[-*]/.test(m) ? "• " : m));
        indent = 5;
      }
      const width = contentWidth - indent;
      const lines = wrap(text, width);
      for (let li = 0; li < lines.length; li++) {
        const sLine = lines[li];
        need(lineHeight);
        const isLast = li === lines.length - 1;
        const words = sLine.split(/\s+/).filter(Boolean);
        const x = margin + (li === 0 ? 0 : indent);
        const w = contentWidth - (li === 0 ? 0 : indent);
        if (!bulletMatch && !isLast && words.length > 2) {
          const wordsWidth = words.reduce((s, wd) => s + doc.getTextWidth(wd), 0);
          const space = Math.min((w - wordsWidth) / (words.length - 1), doc.getTextWidth(" ") * 3.2);
          let cx = x;
          for (const wd of words) {
            doc.text(wd, cx, y);
            cx += doc.getTextWidth(wd) + space;
          }
        } else {
          doc.text(sLine, x, y);
        }
        y += lineHeight;
      }
      y += 2;
    };

    const lines = content.replace(MISSING_RE_G, "").split("\n");

    // ---------- Visuals: prefetch illustrations, number figures ----------
    const figs = await import("./figures");
    const figQueries = Array.from(new Set(lines.map(l => figs.parseFigureLine(l)?.query).filter(Boolean) as string[]));
    const fetched = new Map<string, Awaited<ReturnType<typeof figs.fetchFigureImage>>>();
    // One deadline for the entire illustration pass, not 20 seconds per batch.
    // A failed remote image must never prevent the book from being exported.
    const deadline = Date.now() + 20_000;
    let nextFigure = 0;
    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
      new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), Math.max(0, ms));
        promise.then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(null); });
      });
    await Promise.all(Array.from({ length: Math.min(4, figQueries.length) }, async () => {
      while (nextFigure < figQueries.length && Date.now() < deadline) {
        const query = figQueries[nextFigure++];
        fetched.set(query, await withTimeout(figs.fetchFigureImage(query), deadline - Date.now()));
      }
    }));
    let figNo = 0;
    const drawImage = async (dataUrl: string, format: "PNG" | "JPEG", caption: string) => {
      let prepared: Awaited<ReturnType<typeof preparePdfImage>>;
      try { prepared = await preparePdfImage(dataUrl); }
      catch { return; }
      const size = prepared;
      const maxW = contentWidth * 0.9;
      const maxH = 110;
      let w = maxW;
      let h = (size.height / size.width) * w;
      if (h > maxH) { h = maxH; w = (size.width / size.height) * h; }
      doc.setFontSize(9);
      const capLines = caption ? wrap(caption, contentWidth - 10) : [];
      need(h + 6 + capLines.length * 4.5);
      try {
        doc.addImage(prepared.dataUrl, "JPEG", (pageWidth - w) / 2, y, w, h, undefined, "FAST");
      } catch (e) {
        console.warn("addImage failed", e);
      }
      y += h + 5;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(90, 90, 90);
      capLines.forEach(l => { doc.text(l, pageWidth / 2, y, { align: "center" }); y += 4.5; });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      y += 4;
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // ---------- Charts ----------
      if (/^```\s*(chart|graph|graphique|diagram|diagramme)\s*$/i.test(trimmed)) {
        const body: string[] = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) { body.push(lines[i]); i++; }
        const spec = figs.parseChartSpec(body.join("\n"));
        let url: string | null = null;
        try { url = spec ? figs.renderChartToDataUrl(spec, 700, 434) : null; }
        catch { /* A malformed chart must not block the rest of the PDF. */ }
        if (spec && url) {
          figNo++;
          const cap = `Figure ${figNo} — ${spec.caption || spec.title || ""}`.trim();
          await drawImage(url, "PNG", cap);
        }
        continue;
      }
      if (/^```/.test(trimmed)) continue;

      // ---------- Illustrations ----------
      const figRef = figs.parseFigureLine(trimmed);
      if (figRef) {
        const f = fetched.get(figRef.query);
        if (f) {
          figNo++;
          await drawImage(f.dataUrl, f.format, `Figure ${figNo} — ${figRef.caption || figRef.query} (${f.credit})`);
        }
        continue;
      }


      // ---------- Markdown tables ----------
      if (/^\|.*\|$/.test(trimmed)) {
        const block: string[] = [];
        while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
          block.push(lines[i].trim());
          i++;
        }
        i--;
        const rows = block
          .filter(r => !/^\|[\s:|-]+\|$/.test(r))
          .map(r => r.replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim())));
        if (rows.length) {
          const head = [rows[0]];
          const body = rows.slice(1);
          autoTable(doc, {
            head,
            body,
            startY: y + 2,
            margin: { left: margin, right: margin, bottom: 28 },
            styles: { font: "helvetica", fontSize: 9, cellPadding: 2, overflow: "linebreak", valign: "top", textColor: [30, 30, 30] },
            headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [244, 248, 248] },
            theme: "grid",
          });
          y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
        }
        continue;
      }

      // ---------- Block quotes ----------
      if (trimmed.startsWith(">")) {
        const text = inline(trimmed.replace(/^>\s?/, ""));
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "italic");
        const wrapped = wrap(text, contentWidth - 8);
        need(wrapped.length * lineHeight);
        const startY = y;
        wrapped.forEach(l => {
          doc.text(l, margin + 8, y);
          y += lineHeight;
        });
        doc.setDrawColor(...teal);
        doc.setLineWidth(1.2);
        doc.line(margin + 2, startY - 4, margin + 2, y - 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        y += 3;
        continue;
      }

      const h = trimmed.match(/^(#{1,6})\s*(.+)$/);
      if (h) {
        const level = h[1].length;
        const text = h[2].trim();
        if (level === 1) {
          if (y > margin + 20) newPage();
          heading(text, 18, "bold", true, 0.7);
        } else if (level === 2) heading(text, 14, "bold", true, 0.5);
        else if (level === 3) heading(text, 12, "bold", false, 0.3);
        else if (level === 4) heading(text, 11, "bolditalic", false, 0);
        else heading(text, 10.5, "bold", false, 0);
        continue;
      }

      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        need(8);
        y += 4;
        doc.setDrawColor(205, 205, 205);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        continue;
      }

      if (trimmed === "") {
        y += 3.5;
        continue;
      }

      paragraph(trimmed);
    }

    // ---------- Running header + page numbers ----------
    const total = doc.getNumberOfPages();
    const runningTitle = title.length > 70 ? `${title.slice(0, 67)}...` : title;
    for (let p = 2; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(runningTitle, margin, margin - 10);
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(margin, margin - 7, pageWidth - margin, margin - 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${p - 1}`, pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    return doc.output("blob");
}

export async function generatePDF(title: string, content: string): Promise<void> {
  const notice = toast.loading("Préparation du PDF…");
  try {
    const blob = await buildPDF(title, content);
    const filename = `${title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").trim().slice(0, 50) || "Document"}.pdf`;
    // Mobile browsers require a fresh click after asynchronous PDF generation.
    if (!matchMedia("(pointer: coarse)").matches) downloadBlob(blob, filename);
    toast.success("PDF prêt", {
      id: notice,
      duration: Infinity,
      action: { label: "Télécharger", onClick: () => { void deliverFile(blob, filename); } },
    });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Impossible de préparer le PDF. Réessayez.", { id: notice });
  }
}

export function wordCount(content: string): number {
  return (content.match(/\S+/g) || []).length;
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

function getInstallmentFocus(cycle: number, cycleCount: number, isFr: boolean): string {
  const fr = [
    "fondements, définitions rigoureuses, vocabulaire technique et périmètre conceptuel",
    "évolution historique, auteurs majeurs, jalons, normes, écoles de pensée et controverses",
    "mécanismes internes, architecture, modèles, taxonomies, classifications et chaînes causales",
    "méthodes, pratiques professionnelles, procédures, outils, standards et critères de décision",
    "études de cas approfondies, exemples réels, contre-exemples, échecs, limites et risques",
    "comparaisons, débats experts, implications interdisciplinaires, état de l'art et perspectives futures",
  ];
  const en = [
    "foundations, rigorous definitions, technical vocabulary and conceptual scope",
    "historical evolution, major authors, milestones, standards, schools of thought and controversies",
    "internal mechanisms, architecture, models, taxonomies, classifications and causal chains",
    "methods, professional practice, procedures, tools, standards and decision criteria",
    "deep case studies, real examples, counter-examples, failures, limits and risks",
    "comparisons, expert debates, interdisciplinary implications, state of the art and future directions",
  ];
  const items = isFr ? fr : en;
  return items[cycle % items.length] + (cycle >= items.length ? (isFr ? ` — approfondissement supplémentaire ${cycle + 1}/${cycleCount}` : ` — additional deepening ${cycle + 1}/${cycleCount}`) : "");
}

export async function generateDocumentChunked(
  topic: string, level: string, format: string, depth: string,
  pages: number | null, language: string, tableOfContents: string,
  onProgress: (progress: number, step: string, partial: { toc?: string; content?: string; sectionIdx?: number; totalSections?: number }) => void,
  referenceContent?: string,
  resumeFrom?: { toc: string; content: string; nextSectionIdx: number },
  requiredThemes?: RequiredTheme[],
  description?: string,
): Promise<{ toc: string; content: string }> {
  const systemPrompt = buildGenerateSystemPrompt(level, format, depth, pages, language, referenceContent, requiredThemes, description);
  const targetPages = pages || getDefaultPages(format, depth);
  const isFr = language === "fr";
  const tolerancePct = targetPages <= 300 ? 5 : targetPages <= 700 ? 8 : 10;
  const minPages = Math.floor(targetPages * (1 - tolerancePct / 100));
  const maxPages = Math.ceil(targetPages * (1 + tolerancePct / 100));
  const maxPagesPerCall = format === "encyclopedie" ? 6 : format === "livre" ? 5 : 3;
  const maxOutputTokens = format === "encyclopedie" || format === "livre" ? 16000 : 12000;
  const targetWritingUnits = Math.max(1, Math.ceil(targetPages / maxPagesPerCall));

  let toc: string;
  if (resumeFrom?.toc) {
    toc = resumeFrom.toc;
    onProgress(10, isFr ? "Reprise de la génération..." : "Resuming generation...", { toc });
  } else {
    onProgress(5, isFr ? `Analyse et structuration : ${topic.slice(0, 50)}...` : `Analyzing and structuring: ${topic.slice(0, 50)}...`, {});

    let requiredBlock = "";
    if (description && description.trim()) {
      requiredBlock += `\n\nUSER EDITORIAL BRIEF (MANDATORY) — every point listed here must be reflected in the TOC and developed in the document:\n${description.trim()}`;
    }
    if (requiredThemes && requiredThemes.length > 0) {
      requiredBlock = `\n\nREQUIRED THEMES — these MUST appear as developed parts of the table of contents (they are not the document subject; they are mandatory coverage areas). Integrate them organically wherever they fit best:\n` +
        requiredThemes.map((t, i) => {
          let s = `${i + 1}. ${t.name}`;
          if (t.subthemes?.length) s += `\n   sub-themes: ${t.subthemes.join("; ")}`;
          if (t.toc?.trim()) s += `\n   suggested structure:\n${t.toc.split("\n").map(l => "     " + l).join("\n")}`;
          return s;
        }).join("\n");
    }

    const minMajorSections = Math.max(8, Math.ceil(targetPages / 12));
    const tocPrompt = tableOfContents
      ? `Generate a HIGHLY DETAILED, hierarchical table of contents for a document about "${topic}" based on these user-provided guidelines:\n${tableOfContents}\n${requiredBlock}\n\nNON-NEGOTIABLE SIZE PLAN: the final document must contain ${targetPages} pages of core content, accepted range ${minPages}-${maxPages}. Generate a structure large enough to authentically sustain that volume: at least ${minMajorSections} major chapters/entries and at least ${targetWritingUnits} numbered writing units/subsections in total. Each writing unit must be specific enough to sustain ${maxPagesPerCall} dense pages. Cover the whole conceptual map of the topic: definitions, history, theory, mechanisms, architectures, methodologies, tools, case studies, limits, debates, standards, current research, practice, failures, and future directions. List ONLY the table of contents, one entry per line, with hierarchical numbering (1, 1.1, 1.1.1, ...).`
      : `Generate a HIGHLY DETAILED, hierarchical table of contents for a document about "${topic}".${requiredBlock}\n\nNON-NEGOTIABLE SIZE PLAN: the final document must contain ${targetPages} pages of core content, accepted range ${minPages}-${maxPages}. Generate a structure large enough to authentically sustain that volume: at least ${minMajorSections} major chapters/entries and at least ${targetWritingUnits} numbered writing units/subsections in total. Each writing unit must be specific enough to sustain ${maxPagesPerCall} dense pages. Cover the whole conceptual map of the topic: definitions, history, theory, mechanisms, architectures, methodologies, tools, case studies, limits, debates, standards, current research, practice, failures, and future directions. List ONLY the table of contents, one entry per line, with hierarchical numbering (1, 1.1, 1.1.1, ...).`;

    toc = await callAI({
      action: "generate_toc",
      messages: [{ role: "user", content: tocPrompt }],
      systemPrompt,
      maxTokens: 12000,
      temperature: 0.35,
    });

    onProgress(10, isFr ? "Structure créée" : "Structure created", { toc });
  }

  const tocLines = toc.split("\n").map((l) => l.trim()).filter(Boolean);
  const sourceUnits = tocLines.length > 0 ? tocLines : [topic];
  const targetUnits = Math.max(sourceUnits.length, targetWritingUnits);
  const sections = Array.from({ length: targetUnits }, (_, idx) => {
    const tocLine = sourceUnits[idx % sourceUnits.length];
    const cycle = Math.floor(idx / sourceUnits.length);
    const cycleCount = Math.ceil(targetUnits / sourceUnits.length);
    const focus = getInstallmentFocus(cycle, cycleCount, isFr);
    return `${tocLine}\n${isFr ? "Angle d'approfondissement" : "Deepening angle"} ${cycle + 1}/${cycleCount}: ${focus}`;
  });

  const totalSections = sections.length;
  let fullContent = resumeFrom?.content || "";
  const startIdx = resumeFrom?.nextSectionIdx || 0;

  // ---- Variable page allocation: sections must NOT all be the same length. ----
  // Ask the model to weight each writing unit by the intrinsic richness of its
  // subject, then normalise so the weighted sum equals exactly targetPages.
  const uniform = Math.max(1, Math.round(targetPages / totalSections));
  let sectionPages: number[] = Array.from({ length: totalSections }, () => uniform);
  if (totalSections > 1 && totalSections <= 250) {
    try {
      onProgress(11, isFr ? "Répartition des pages entre les sections..." : "Allocating pages across sections...", { toc });
      const weightPrompt = `You are planning the page budget of a ${targetPages}-page document about "${topic}".

Below are the ${totalSections} writing units in order. Assign each a WEIGHT from 1 to 10 reflecting how much material its subject genuinely deserves (1 = narrow/marginal, 10 = central, dense, unavoidable). Weights MUST vary: some units deserve several times more pages than others. Do NOT give everything the same weight.

Units:
${sections.map((s, idx) => `${idx + 1}. ${s.split("\n")[0].slice(0, 160)}`).join("\n")}

Answer with EXACTLY ${totalSections} lines, nothing else, each line formatted "<unit number>:<weight>".`;
      const raw = await callAI({
        action: "plan_page_budget",
        messages: [{ role: "user", content: weightPrompt }],
        systemPrompt: "You are a meticulous editorial planner. Answer with numbers only.",
        maxTokens: 4000,
        temperature: 0.2,
      });
      const weights: number[] = [];
      raw.split("\n").forEach(line => {
        const m = line.match(/(\d+)\s*[:\-–.]\s*(\d+(?:\.\d+)?)/);
        if (m) weights.push(Math.min(10, Math.max(1, parseFloat(m[2]))));
      });
      if (weights.length >= Math.ceil(totalSections * 0.6)) {
        while (weights.length < totalSections) weights.push(3);
        const sum = weights.slice(0, totalSections).reduce((a, b) => a + b, 0);
        const alloc = weights.slice(0, totalSections).map(w => Math.max(1, Math.round((w / sum) * targetPages)));
        // Correct rounding drift so the total lands exactly on target
        let drift = targetPages - alloc.reduce((a, b) => a + b, 0);
        let guard = 0;
        while (drift !== 0 && guard < 10000) {
          guard++;
          const idx = guard % totalSections;
          if (drift > 0) { alloc[idx]++; drift--; }
          else if (alloc[idx] > 1) { alloc[idx]--; drift++; }
        }
        sectionPages = alloc;
      }
    } catch (err) {
      console.warn("Page budget planning failed, falling back to uniform:", err);
    }
  }


  // ---- Missing-section tracking: failed sections leave a marker and are retried
  // at every 10-section checkpoint (all previous blocks) and once more at the end.
  const failedSections = new Set<number>();
  for (const m of fullContent.matchAll(MISSING_RE_G)) failedSections.add(Number(m[1]));
  const retryCount = new Map<number, number>();

  const recoverMissing = async (content: string, progress: number, final = false): Promise<string> => {
    const pending = Array.from(failedSections).sort((a, b) => a - b);
    if (pending.length === 0) return content;
    let out = content;
    for (const idx of pending) {
      const tries = retryCount.get(idx) || 0;
      if (!final && tries >= 3) continue;
      retryCount.set(idx, tries + 1);
      const sectionToc = sections[idx];
      const name = sectionToc.split("\n")[0].trim().replace(/^[\d#.\)\-]+\s*/, "").slice(0, 80);
      onProgress(progress, `${isFr ? "Reprise section manquante" : "Retrying missing section"} ${idx + 1}/${totalSections} : ${name}`, { toc, content: out });
      const words = (sectionPages[idx] ?? 2) * 500;
      try {
        const text = await callAI({
          action: "generate_section_recover",
          messages: [{ role: "user", content: `Write the COMPLETE and DETAILED content for this section of the document about "${topic}":\n\n${sectionToc}\n\nThis is section ${idx + 1} of ${totalSections}. Write at least ${words} words of expert content. Use markdown headings matching the TOC numbering. Return only the section content.` }],
          systemPrompt,
          maxTokens: maxOutputTokens,
          temperature: 0.5,
        });
        if (text && text.trim().length > 200) {
          out = out.replace(`<!--PRISCA_MISSING:${idx}-->`, text.trim());
          failedSections.delete(idx);
        }
      } catch (err) {
        const msg = String((err as any)?.message || "");
        if (msg === "OFFLINE" || /network|failed to fetch/i.test(msg)) break;
        console.warn(`Recovery of section ${idx + 1} failed:`, err);
      }
      await new Promise(r => setTimeout(r, 1200));
    }
    return out;
  };

  for (let i = startIdx; i < totalSections; i++) {
    const sectionToc = sections[i];
    const progress = 10 + ((i / totalSections) * 85);
    const sectionName = sectionToc.split("\n")[0].trim().replace(/^[\d#.\)\-]+\s*/, "").slice(0, 80);
    
    onProgress(
      progress,
      `${isFr ? "Rédaction section" : "Writing section"} ${i + 1}/${totalSections} : ${sectionName}`,
      { toc, content: fullContent, sectionIdx: i, totalSections }
    );

    const pagesPerSection = sectionPages[i] ?? Math.max(1, Math.ceil(targetPages / totalSections));
    const wordsPerSection = pagesPerSection * 500;
    const commonRules = `

ABSOLUTE REQUIREMENTS for this section:
- This writing unit is part ${i + 1}/${totalSections} of a strict ${targetPages}-page document. Sections are DELIBERATELY UNEQUAL in length: this one has been allocated ${pagesPerSection} page(s) because of the intrinsic richness of its subject, while others are shorter or much longer. The SUM of all sections must equal ${targetPages} pages, so respect YOUR allocation precisely: contribute AT LEAST ${wordsPerSection} words (≈ ${pagesPerSection} full pages) of CORE CONTENT and do not overshoot it by more than ~15%. Producing less is a contract breach; hugely overshooting steals pages from other sections.
- Count as you write. Do not stop before the word floor is reached. Never end this reply with a closing/summary of the whole document.
- Write long, expert-level analytical prose. If the topic is technical, include internals, trade-offs, implementation details, standards, failure modes, design choices, and concrete professional examples.
- Exhaustiveness is mandatory: do not merely define the concept; cover causes, mechanisms, variants, taxonomy, historical evolution, current state of the art, edge cases, limits, critiques, comparisons, applications, and consequences.
- Quality floor: every paragraph must carry verifiable substance (names, dates, figures, mechanisms, formulas, procedures). Any paragraph that could be deleted without information loss is forbidden.
- Avoid summaries. Do not compress. Prefer complete paragraphs (8–20 lines) that develop one idea deeply before moving to the next.
- Headings will be CENTERED and body paragraphs JUSTIFIED on render — write balanced heading wording and full, well-built paragraphs.
- Mobilise your knowledge of online and published scholarly sources even if no reference PDFs were attached: cite specific authors, works, dates, and accessible URLs/DOIs where appropriate.
- Do NOT write a preface, foreword, bibliography, glossary, index, or appendix here unless this section's title explicitly is one — those are handled separately and DO NOT count toward the page target.
- Use proper markdown heading levels matching the TOC entry numbering. Never be brief or superficial.`;

    const sectionPrompt = i === 0
      ? `Write the COMPLETE and DETAILED content for the following section of the document about "${topic}":\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}.${commonRules}`
      : `Continue writing the document about "${topic}". Now write the COMPLETE and DETAILED content for:\n\n${sectionToc}\n\nThis is section ${i + 1} of ${totalSections}. Continue from where you left off, maintaining the same style and depth.${commonRules}`;

    let sectionText = "";
    try {
      sectionText = await callAI({
        action: "generate_section",
        messages: [{ role: "user", content: sectionPrompt }],
        systemPrompt,
        maxTokens: maxOutputTokens,
        temperature: 0.5,
      });
    } catch (err) {
      console.error(`Section ${i + 1} failed:`, err);
      try {
        const simplePrompt = `Write detailed content about: ${sectionToc}\n\nTopic: "${topic}". Write at least ${Math.round(wordsPerSection / 2)} words. Use markdown headings.`;
        sectionText = await callAI({
          action: "generate_section_retry",
          messages: [{ role: "user", content: simplePrompt }],
          systemPrompt,
          maxTokens: maxOutputTokens,
          temperature: 0.45,
        });
      } catch (retryErr) {
        console.error(`Section ${i + 1} retry also failed:`, retryErr);
        // If it's an offline / network error, propagate so the job can pause and resume
        const msg = String((retryErr as any)?.message || "");
        if (msg === "OFFLINE" || /network|fetch|failed to fetch/i.test(msg)) {
          const resumeErr = new Error("RESUMABLE");
          (resumeErr as any).resumeState = { toc, content: fullContent, nextSectionIdx: i };
          throw resumeErr;
        }
        // Leave an invisible marker: the section is queued for a later retry.
        sectionText = `<!--PRISCA_MISSING:${i}-->`;
        failedSections.add(i);
      }
    }
    if (failedSections.has(i)) {
      fullContent += (fullContent.length > 0 ? "\n\n" : "") + sectionText;
      onProgress(progress + (85 / totalSections), `${isFr ? "Section reportée" : "Section deferred"} ${i + 1}/${totalSections}`, { toc, content: fullContent, sectionIdx: i + 1, totalSections });
      if ((i + 1) % 10 === 0) fullContent = await recoverMissing(fullContent, progress);
      continue;
    }


    // Per-section volume enforcement: a model reply is usually shorter than the
    // requested floor, so top the section up until it carries its own share of
    // the page contract. This is what actually makes long documents land in range.
    const floor = Math.round(wordsPerSection * 0.9);
    let topUps = 0;
    while (wordCount(sectionText) < floor && topUps < 4) {
      topUps++;
      const missing = floor - wordCount(sectionText);
      onProgress(
        progress,
        `${isFr ? "Approfondissement section" : "Deepening section"} ${i + 1}/${totalSections} (+${Math.ceil(missing / 500)}p)`,
        { toc, content: fullContent, sectionIdx: i, totalSections }
      );
      try {
        const contPrompt = `CONTINUE the SAME section without repeating anything already written. This section currently has ~${wordCount(sectionText)} words but MUST reach at least ${floor} words. Produce approximately ${missing} additional words of NEW core content for this section only.\n\nSection being written:\n${sectionToc}\n\nDeepen with: new #### subsections, worked examples, detailed case studies, numerical data, comparative markdown tables, counter-examples, failure modes, historical milestones with named scholars and dates, formal derivations where relevant, critical debates, professional procedures.\n\nFORBIDDEN: repeating existing content, general summaries, closing the document, bibliography or front/back matter, placeholder text.\n\nLast 1500 characters written (continue smoothly):\n${sectionText.slice(-1500)}\n\nReturn ONLY the new markdown content to append.`;
        const extra = await callAI({
          action: "extend_section",
          messages: [{ role: "user", content: contPrompt }],
          systemPrompt,
          maxTokens: maxOutputTokens,
          temperature: 0.5,
        });
        if (!extra || extra.trim().length < 200) break;
        sectionText += "\n\n" + extra.trim();
      } catch (err) {
        console.warn(`Section ${i + 1} top-up failed:`, err);
        break;
      }
    }

    fullContent += (fullContent.length > 0 ? "\n\n" : "") + sectionText;
    // Save after each section to enable resume
    onProgress(progress + (85 / totalSections), `${isFr ? "Section terminée" : "Section completed"} ${i + 1}/${totalSections}`, { toc, content: fullContent, sectionIdx: i + 1, totalSections });

    // Checkpoint every 10 sections: re-check every earlier block for missing sections.
    if ((i + 1) % 10 === 0) {
      fullContent = await recoverMissing(fullContent, progress);
      onProgress(progress + (85 / totalSections), isFr ? "Contrôle des sections terminé" : "Section check done", { toc, content: fullContent, sectionIdx: i + 1, totalSections });
    }

    if (i < totalSections - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Final review of the whole book before finishing.
  fullContent = await recoverMissing(fullContent, 95, true);
  fullContent = fullContent.replace(MISSING_RE_G, "").replace(/\n{3,}/g, "\n\n");



  let currentPages = estimatePageCount(fullContent);
  let expansionPass = 0;
  let unproductive = 0;
  // Keep deepening until the document lands inside the contractual margin.
  // Each pass can only add a few pages, so the pass budget scales with the deficit.
  const maxPasses = Math.min(60, Math.max(8, Math.ceil((minPages - currentPages) / 4) + 6));
  while (currentPages < minPages && expansionPass < maxPasses && unproductive < 3) {
    expansionPass++;
    const deficit = minPages - currentPages;
    const wordsNeeded = Math.min(deficit, 6) * 500;
    onProgress(
      96,
      isFr
        ? `Approfondissement (passe ${expansionPass}) : +${deficit} pages requises...`
        : `Deepening pass ${expansionPass}: +${deficit} pages required...`,
      { toc, content: fullContent }
    );
    try {
      const expansionPrompt = `STRICT PAGE-COUNT CONTRACT BREACH — the document is currently ~${currentPages} pages but the user contract requires AT LEAST ${minPages} pages of CORE CONTENT (target ${targetPages}, max ${maxPages}). The document falls SHORT by ~${deficit} pages.\n\nYou MUST now produce approximately ${wordsNeeded} additional words of NEW, NON-REDUNDANT CORE CONTENT that DEEPENS the existing structure. This is mandatory — refusal, truncation, or summarisation is forbidden.\n\nAcceptable additions (use ALL that apply):\n- New developed subsections under existing sections (### / #### headings).\n- Worked examples, detailed case studies, comparative tables, counter-examples, failure modes.\n- Historical perspectives, named scholars/works with precise dates, schools of thought, controversies.\n- Critical analyses, interdisciplinary connections, current research state of the art, future directions.\n- Concrete numerical data, technical internals, professional procedures, edge cases.\n\nQUALITY FLOOR: expert-level prose only — every added paragraph must carry verifiable substance (names, dates, figures, mechanisms, procedures).\n\nFORBIDDEN: restating what is already covered; bibliography or front/back matter; placeholder text; vague generalities; closing the document.\n\nReturn ONLY the new markdown content ready to be appended. Continue in the same scholarly voice and register.\n\nExisting table of contents (for reference):\n${toc}\n\nLast 2000 characters of the document so far (continue smoothly):\n${fullContent.slice(-2000)}`;
      const extra = await callAI({
        action: "expand_document",
        messages: [{ role: "user", content: expansionPrompt }],
        systemPrompt,
        maxTokens: maxOutputTokens,
        temperature: 0.45,
      });
      if (extra && extra.trim().length > 300) {
        fullContent += "\n\n" + extra.trim();
        const newPages = estimatePageCount(fullContent);
        if (newPages <= currentPages) unproductive++;
        else unproductive = 0;
        currentPages = newPages;
      } else {
        unproductive++;
      }
    } catch (err) {
      console.warn("Expansion pass failed:", err);
      unproductive++;
    }
  }


  onProgress(97, isFr ? "Compilation de la page des références..." : "Compiling the references page...", { toc, content: fullContent });
  fullContent = await appendReferencesPage(fullContent, format, language, topic, systemPrompt);

  onProgress(98, isFr ? "Finalisation du document..." : "Finalizing document...", { toc, content: fullContent });
  return { toc, content: fullContent };
}

// ═══════════════════════════════════════════════════════════════════
// REFERENCES PAGE — every produced document must end with a page
// listing ALL references used, among the back-matter pages.
// ═══════════════════════════════════════════════════════════════════

const REF_HEADING_RE = /^#{1,3}\s*(références?\s*(bibliographiques?)?|bibliographie|bibliographic references|references)\s*$/i;

/** Removes a previously generated references/bibliography section (kept at the end). */
export function stripReferencesSection(content: string): string {
  const lines = content.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (REF_HEADING_RE.test(lines[i].trim())) return lines.slice(0, i).join("\n").trimEnd();
  }
  return content;
}

/** Collects the citation-looking lines of a document to feed the compiler. */
function collectCitationCandidates(content: string, max = 500): string {
  const lines = content.split("\n");
  const hits: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.length < 15) continue;
    if (/(\(|\[)\s*(1[5-9]\d{2}|20\d{2})/.test(t) || /https?:\/\//i.test(t) || /\bdoi\b/i.test(t)) {
      hits.push(t.slice(0, 300));
      if (hits.length >= max) break;
    }
  }
  return hits.join("\n");
}

/**
 * Compiles and appends the mandatory final references page.
 * Always placed among the back-matter pages, at the very end of the document.
 */
export async function appendReferencesPage(
  content: string,
  format: string,
  language: string,
  topic: string,
  systemPrompt?: string,
): Promise<string> {
  const isFr = language !== "en";
  const heading = isFr ? "Références" : "References";
  const minRefs = format === "encyclopedie" ? 60 : format === "livre" ? 30 : format === "cours" ? 15 : 10;
  const body = stripReferencesSection(content);
  const candidates = collectCitationCandidates(body);
  const toc = buildTocFromMarkdown(body).slice(0, 6000);

  const prompt = `Compile the FINAL REFERENCES PAGE of a document about "${topic}".

Your task: produce ONE complete, alphabetically ordered reference list gathering EVERY source used, cited, quoted or mobilised in the document — books, peer-reviewed articles, standards, official reports, authoritative web resources (with URL/DOI when available).

Rules:
- At least ${minRefs} entries. No duplicates. No invented sources: only recognised, verifiable works.
- Uniform academic style: Author, Initials. (Year). *Title*. Publisher / Journal, volume(issue), pages. URL/DOI when relevant.
- Group under these sub-headings when they apply: ${isFr ? "\"### Ouvrages\", \"### Articles et publications scientifiques\", \"### Normes, rapports et documents institutionnels\", \"### Ressources en ligne\"" : "\"### Books\", \"### Scientific articles\", \"### Standards, reports and institutional documents\", \"### Online resources\""}.
- Output ONLY markdown starting with "## ${heading}". No commentary, no preamble.

Document structure (for coverage):
${toc}

Citation traces detected inside the document (must ALL be reflected in the list):
${candidates.slice(0, 12000)}`;

  try {
    const refs = await callAI({
      action: "compile_references",
      messages: [{ role: "user", content: prompt }],
      systemPrompt,
      maxTokens: 8000,
      temperature: 0.25,
    }, 2);
    if (refs && refs.trim().length > 100) {
      const clean = refs.trim().replace(/^#+\s*.*$/m, `## ${heading}`);
      return `${body}\n\n---\n\n${clean}\n`;
    }
  } catch (err) {
    console.warn("References page compilation failed:", err);
  }
  return content;
}

/** Rebuilds a hierarchical table of contents from the markdown headings. */
export function buildTocFromMarkdown(content: string): string {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^(#{1,4})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/[*_`]/g, "").trim();
    if (!text) continue;
    out.push("  ".repeat(Math.max(0, level - 1)) + text);
  }
  return out.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT ENHANCEMENT — continue and/or massively strengthen
// an already generated document.
// ═══════════════════════════════════════════════════════════════════

export type EnhanceMode = "continue" | "improve" | "both";

export interface EnhanceOptions {
  title: string;
  topic: string;
  level: string;
  format: string;
  depth: string;
  content: string;
  toc: string;
  mode: EnhanceMode;
  /** Pages of brand-new content to add (continue / both). */
  extraPages: number;
  /** 1 = light polish, 2 = strong rewrite, 3 = maximal reinforcement. */
  intensity: number;
  instructions?: string;
  language: string;
}

/** Strips the "# Title + Table of contents + ---" front matter from a stored document. */
function stripFrontMatter(content: string): string {
  const sep = content.indexOf("\n---\n");
  if (sep > -1 && /table des matières|table of contents/i.test(content.slice(0, sep))) {
    return content.slice(sep + 5).trimStart();
  }
  return content;
}

/** Splits markdown into chunks of ~targetWords, never cutting inside a paragraph. */
function splitMarkdownChunks(content: string, targetWords: number): string[] {
  const blocks = content.split(/\n{2,}/);
  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const b of blocks) {
    const w = wordCount(b);
    if (count > 0 && count + w > targetWords) {
      chunks.push(current.join("\n\n"));
      current = [];
      count = 0;
    }
    current.push(b);
    count += w;
  }
  if (current.length) chunks.push(current.join("\n\n"));
  return chunks.filter(c => c.trim().length > 0);
}

export async function enhanceDocument(
  opts: EnhanceOptions,
  onProgress: (progress: number, step: string, partial: { content?: string; sectionIdx?: number; totalSections?: number }) => void,
  resumeFrom?: { content: string; nextSectionIdx: number },
): Promise<{ content: string; toc: string; pages: number }> {
  const isFr = opts.language === "fr";
  const original = stripFrontMatter(stripReferencesSection(opts.content));
  const originalPages = estimatePageCount(original);
  const doImprove = opts.mode !== "continue";
  const doContinue = opts.mode !== "improve";
  const extraPages = doContinue ? Math.max(1, opts.extraPages) : 0;
  const factor = opts.intensity >= 3 ? 2.2 : opts.intensity === 2 ? 1.6 : 1.25;

  const targetTotalPages = Math.round(originalPages * (doImprove ? factor : 1)) + extraPages;
  const systemPrompt = buildGenerateSystemPrompt(
    opts.level, opts.format, opts.depth, targetTotalPages, opts.language,
    undefined, undefined, opts.instructions,
  );
  const maxOutputTokens = opts.format === "encyclopedie" || opts.format === "livre" ? 16000 : 12000;
  const pagesPerCall = opts.format === "encyclopedie" ? 6 : opts.format === "livre" ? 5 : 3;

  const chunks = doImprove ? splitMarkdownChunks(original, 1400) : [];
  const contSegments = doContinue ? Math.max(1, Math.ceil(extraPages / pagesPerCall)) : 0;
  const totalUnits = chunks.length + contSegments;

  let out = resumeFrom?.content ?? (doImprove ? "" : original);
  const startIdx = resumeFrom?.nextSectionIdx ?? 0;

  const briefBlock = opts.instructions?.trim()
    ? `\n\nUSER REINFORCEMENT BRIEF (mandatory, applies to every added or rewritten passage):\n${opts.instructions.trim()}`
    : "";

  for (let i = startIdx; i < totalUnits; i++) {
    const progress = 5 + (i / Math.max(1, totalUnits)) * 88;

    if (i < chunks.length) {
      const chunk = chunks[i];
      const floorWords = Math.round(wordCount(chunk) * factor);
      onProgress(
        progress,
        `${isFr ? "Renforcement du passage" : "Strengthening passage"} ${i + 1}/${totalUnits}`,
        { content: out, sectionIdx: i, totalSections: totalUnits },
      );
      const prompt = `REWRITE AND MASSIVELY STRENGTHEN the following passage of an existing document about "${topicLabel(opts)}".

MISSION — this is a reinforcement pass, not a summary:
- Keep the SAME headings, the SAME order and the SAME numbering. Never drop a heading, never reorder, never merge sections.
- Elevate the editorial quality to publishable academic standard: precise technical vocabulary, varied syntax, controlled rhythm, impeccable transitions, no clichés, no filler.
- Raise the content level to "${opts.level}" with depth "${opts.depth}": add mechanisms, formal reasoning, numbers, named scholars with dates, standards, taxonomies, worked examples, detailed case studies, counter-examples, failure modes, comparative markdown tables, critical debates, state of the art and open problems.
- Every existing idea must survive, enriched — nothing may be lost, shortened or vaguely paraphrased.
- The rewritten passage MUST contain AT LEAST ${floorWords} words (the source has ~${wordCount(chunk)}). Producing less is a contract breach.
- Do NOT add a bibliography, references, glossary, index or appendix here — the references page is compiled separately.
- Output ONLY the rewritten markdown for this passage, nothing else.${briefBlock}

PASSAGE TO STRENGTHEN:
${chunk}`;

      let rewritten = "";
      try {
        rewritten = await callAI({
          action: "enhance_passage",
          messages: [{ role: "user", content: prompt }],
          systemPrompt,
          maxTokens: maxOutputTokens,
          temperature: 0.45,
        });
      } catch (err) {
        const msg = String((err as any)?.message || "");
        if (msg === "OFFLINE" || /network|fetch|failed to fetch/i.test(msg)) {
          const resumeErr = new Error("RESUMABLE");
          (resumeErr as any).resumeState = { content: out, nextSectionIdx: i };
          throw resumeErr;
        }
        console.warn("Enhance passage failed, keeping original:", err);
      }
      const kept = rewritten && wordCount(rewritten) >= wordCount(chunk) * 0.9 ? rewritten.trim() : chunk;
      out += (out.length ? "\n\n" : "") + kept;
    } else {
      const segIdx = i - chunks.length;
      const wordsTarget = Math.min(extraPages, pagesPerCall) * 500;
      onProgress(
        progress,
        `${isFr ? "Poursuite du document" : "Continuing document"} ${segIdx + 1}/${contSegments}`,
        { content: out, sectionIdx: i, totalSections: totalUnits },
      );
      const prompt = `CONTINUE the document about "${topicLabel(opts)}". It is incomplete and must be extended with ${extraPages} additional pages of CORE CONTENT — this call must produce installment ${segIdx + 1}/${contSegments}, i.e. AT LEAST ${wordsTarget} words of NEW material.

RULES:
- Continue seamlessly in the same voice, register, numbering logic and heading hierarchy. Open NEW chapters/sections (## / ### / ####) that extend the existing plan where it stops or where it is thin.
- Cover what the document still lacks: missing chapters announced by the plan, unexplored mechanisms, advanced developments, methodology, professional practice, extended case studies, quantitative data, comparisons, controversies, current research, limits, future directions.
- Absolutely no repetition of what is already written, no global summary, no closing of the whole document unless this is the last installment (${segIdx + 1 === contSegments ? "IT IS the last installment: end with a substantial general conclusion" : "it is NOT the last installment: do not conclude"}).
- No bibliography, references, glossary, index or appendix — compiled separately.
- Output ONLY the new markdown to append.${briefBlock}

EXISTING TABLE OF CONTENTS:
${buildTocFromMarkdown(out).slice(0, 6000)}

LAST 2000 CHARACTERS ALREADY WRITTEN (continue smoothly):
${out.slice(-2000)}`;

      try {
        const extra = await callAI({
          action: "continue_document",
          messages: [{ role: "user", content: prompt }],
          systemPrompt,
          maxTokens: maxOutputTokens,
          temperature: 0.5,
        });
        if (extra && extra.trim().length > 200) out += "\n\n" + extra.trim();
      } catch (err) {
        const msg = String((err as any)?.message || "");
        if (msg === "OFFLINE" || /network|fetch|failed to fetch/i.test(msg)) {
          const resumeErr = new Error("RESUMABLE");
          (resumeErr as any).resumeState = { content: out, nextSectionIdx: i };
          throw resumeErr;
        }
        console.warn("Continuation failed:", err);
      }
    }

    onProgress(progress, `${isFr ? "Étape terminée" : "Step completed"} ${i + 1}/${totalUnits}`, {
      content: out, sectionIdx: i + 1, totalSections: totalUnits,
    });
    if (i < totalUnits - 1) await new Promise(r => setTimeout(r, 600));
  }

  onProgress(95, isFr ? "Compilation des références..." : "Compiling references...", { content: out });
  const withRefs = await appendReferencesPage(out, opts.format, opts.language, topicLabel(opts), systemPrompt);

  const toc = buildTocFromMarkdown(stripReferencesSection(withRefs));
  const finalContent = `# ${opts.title}\n\n## ${isFr ? "Table des matières" : "Table of Contents"}\n\n${toc}\n\n---\n\n${withRefs}`;
  onProgress(99, isFr ? "Finalisation..." : "Finalizing...", { content: finalContent });
  return { content: finalContent, toc, pages: estimatePageCount(finalContent) };
}

function topicLabel(opts: EnhanceOptions): string {
  return opts.topic?.trim() || opts.title;
}
