import * as pdfjsLib from 'pdfjs-dist';

// 设置 PDF.js worker
// 使用 CDN 版本的 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * 从 PDF 文件中提取文本内容
 * @param file PDF 文件
 * @returns 提取的文本内容
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 加载 PDF 文档
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // 遍历所有页面提取文本
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // 提取文本项
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // 清理文本
    fullText = fullText
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/\n\s*\n/g, '\n\n')  // 规范化换行
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

/**
 * 检查文件是否为有效的 PDF
 * @param file 文件对象
 */
export function isValidPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
