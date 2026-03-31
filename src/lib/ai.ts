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
  return `You are ScribeAI, an expert educational content writer. You write in ${lang}.
You must generate content adapted to the "${level}" academic level.
The document format is "${format}".
The depth level is "${depth}".
${pages ? `The target length is approximately ${pages} pages.` : ""}

Guidelines per format:
- article: Formal, academic style, concise but thorough. Under 25 pages.
- support: Educational with clear examples, moderate formality. Under 100 pages.
- cours: Very educational with many examples, illustrations described in text, exercises. Under 100 pages.
- livre: Narrative, comprehensive, formal yet engaging. Over 100 pages of content.

Guidelines per depth:
- bas: Cover the core concept clearly and simply.
- intermediaire: Cover the concept and related topics.
- avance: Full mastery of everything around the concept.
- expert: Exhaustive coverage of everything related directly and indirectly.

Use markdown formatting with proper headings, sections, and structure.
Include a clear table of contents at the beginning.`;
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
  return `You are ScribeAI, an expert educational evaluator. Generate an evaluation document in ${lang}.
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
  // Dynamic import to avoid SSR issues
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;
    
    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(title, pageWidth);
    doc.text(titleLines, margin, margin + 10);
    
    // Content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Strip markdown for PDF (basic)
    const cleanContent = content
      .replace(/^#{1,6}\s+(.+)$/gm, (_, text) => `\n${text.toUpperCase()}\n`)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^[-*]\s/gm, "• ");
    
    const lines = doc.splitTextToSize(cleanContent, pageWidth);
    let y = margin + 10 + titleLines.length * 8 + 10;
    
    for (const line of lines) {
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5.5;
    }
    
    doc.save(`${title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").slice(0, 50)}.pdf`);
  });
}
