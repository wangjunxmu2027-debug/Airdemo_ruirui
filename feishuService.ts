
/**
 * Service to interact with Feishu/Lark Documents.
 * Updated to support fetching public "Internet Visible" documents using a reader proxy.
 */

/**
 * Fetches the content of a public Feishu/Lark document.
 * Prerequisite: The document must be shared as "Anyone with the link can read" (Internet Visible).
 */
export const fetchFeishuDocContent = async (url: string): Promise<string> => {
  if (!url) {
    throw new Error("链接不能为空");
  }

  // We use r.jina.ai as a bridge to read public web pages and convert them to clean markdown
  // This avoids CORS issues on the client side for public documents and provides clean text.
  const proxyUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'X-Return-Format': 'markdown'
      }
    });

    if (!response.ok) {
      throw new Error(`无法访问文档 (Status: ${response.status})`);
    }

    const text = await response.text();

    // Basic validation to check if we hit a login wall
    if (text.includes("Feishu") && (text.includes("Login") || text.includes("登录"))) {
      throw new Error("读取失败：文档似乎需要登录。请确保在飞书文档右上角【分享】设置中，开启【互联网上获得链接的任何人可阅读】。");
    }
    
    if (text.length < 50) {
       throw new Error("读取到的文档内容过短，请检查链接是否正确或权限是否公开。");
    }

    return text;
  } catch (error: any) {
    console.error("Fetch error:", error);
    throw new Error(error.message || "获取文档失败，请检查网络连接或文档权限。");
  }
};

/**
 * Extracts a specific section from the text content.
 * Simple heuristic: Find the keyword, take text until the end or next major section.
 */
export const extractSectionFromContent = (content: string, keyword: string): string => {
  if (!keyword) return content;
  
  // Normalize content to avoid case sensitivity issues
  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  const startIndex = lowerContent.indexOf(lowerKeyword);
  
  if (startIndex === -1) {
    console.warn(`Keyword "${keyword}" not found in doc content. Returning full content.`);
    return content;
  }

  // Find the start of the line containing the keyword
  const actualStart = startIndex;
  
  return content.substring(actualStart);
};
