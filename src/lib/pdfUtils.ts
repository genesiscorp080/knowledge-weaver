import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractPdfText(file: File): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    text += pageText + '\n\n';
  }
  
  return { text: text.trim(), pageCount: pdf.numPages };
}

export function estimatePageCount(content: string): number {
  // Based on jsPDF rendering: ~35 lines per page, ~80 chars per line ≈ 2800 chars per page
  const lines = content.split('\n');
  let totalLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      totalLines += 0.5; // empty line takes less space
    } else if (trimmed.startsWith('#')) {
      totalLines += 3; // headings take more space
    } else {
      // Estimate wrapped lines (80 chars per line)
      totalLines += Math.max(1, Math.ceil(trimmed.length / 80));
    }
  }
  
  return Math.max(1, Math.ceil(totalLines / 35) + 1); // +1 for title page
}
