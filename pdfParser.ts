import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    if (!fullText || fullText.length < 10) {
      throw new Error('无法从 PDF 中提取有效文本，请确保 PDF 包含可选择的文字内容（非扫描件）');
    }
    
    return fullText;
  } catch (error: any) {
    console.error('PDF 解析错误:', error);
    if (error.message?.includes('Invalid PDF')) {
      throw new Error('无效的 PDF 文件，请检查文件是否损坏');
    }
    throw new Error(`PDF 解析失败: ${error.message || '未知错误'}`);
  }
}

export function isValidPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
