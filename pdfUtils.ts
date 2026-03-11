import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// 设置 worker 源
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// 限制最大字符数，防止超过 API token 限制
const MAX_CONTENT_LENGTH = 50000; // 约 10k-15k tokens

export const extractTextFromPdfBase64 = async (base64Content: string): Promise<string> => {
  try {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdf = await pdfjsLib.getDocument({ 
      data: bytes
    }).promise;
    let fullText = '';
    
    // 根据 PDF 总页数动态调整提取页数，确保不超过字符限制
    const totalPages = pdf.numPages;
    let pagesToExtract = totalPages;
    
    // 如果页数很多，限制提取页数
    if (totalPages > 10) {
      pagesToExtract = Math.min(totalPages, 15); // 最多提取 15 页
    }
    
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      // 检查是否超过字符限制
      if (fullText.length + pageText.length > MAX_CONTENT_LENGTH) {
        console.log(`PDF 内容超过限制，已截断到第${i}页 (${fullText.length} 字符)`);
        break;
      }
      
      fullText += pageText + '\n';
    }
    
    console.log(`PDF 提取完成：${pdf.numPages}页，提取了${pagesToExtract}页，共${fullText.length}字符`);
    return fullText;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
};
