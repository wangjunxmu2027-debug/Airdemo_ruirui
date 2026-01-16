
import { SUPABASE_CONFIG } from './supabaseConfig';

/**
 * Service to interact with Feishu/Lark Documents.
 * Updated to support fetching public "Internet Visible" documents using a reader proxy.
 */

/**
 * Fetches the content of a public Feishu/Lark document.
 * Priority: 1. Edge Function (Official API/Backend Proxy) -> 2. Jina Reader (Frontend Proxy)
 */
export const fetchFeishuDocContent = async (url: string): Promise<string> => {
  if (!url) {
    throw new Error("链接不能为空");
  }

  let text = "";
  let method = "";

  // 1. Try Supabase Edge Function first
  try {
    console.log("Attempting to fetch via Edge Function...");
    const edgeUrl = `${SUPABASE_CONFIG.edgeFunctionUrl}/fetch-feishu-doc`;
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.content) {
        text = data.content;
        method = "Edge Function";
        console.log("✅ Successfully fetched via Edge Function");
      }
    } else {
      console.warn(`Edge Function failed (${response.status}), falling back...`);
    }
  } catch (err) {
    console.warn("Edge Function error:", err);
  }

  // 2. Fallback to Jina Reader (Frontend Proxy)
  if (!text) {
    console.log("Falling back to Jina Reader (Frontend)...");
    const proxyUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'X-Return-Format': 'markdown' }
      });

      if (!response.ok) {
        throw new Error(`无法访问文档 (Status: ${response.status})`);
      }

      text = await response.text();
      method = "Jina Reader";
    } catch (error: any) {
      console.error("Fetch error:", error);
      throw new Error(error.message || "获取文档失败，请检查网络连接或文档权限。");
    }
  }

  // Basic validation to check if we hit a login wall
  if (text.includes("Feishu") && (text.includes("Login") || text.includes("登录"))) {
    throw new Error("读取失败：文档似乎需要登录。请确保在飞书文档右上角【分享】设置中，开启【互联网上获得链接的任何人可阅读】。");
  }
  
  if (text.length < 50) {
      throw new Error("读取到的文档内容过短，请检查链接是否正确或权限是否公开。");
  }

  // Auto-save URL on successful fetch
  try {
    localStorage.setItem('lastFeishuDocUrl', url);
    console.log(`✅ 已自动保存文档链接到 localStorage (${method}):`, url);
  } catch (err) {
    console.warn("保存链接到 localStorage 失败:", err);
  }

  return text;
};

/**
 * Extracts a specific section from text content.
 * Simple heuristic: Find keyword, take text until end or next major section.
 */
export const extractSectionFromContent = (content: string, keyword: string): string => {
  if (!keyword) return content;
  
  // Debug: Log content preview (extended to 2000 chars for better debugging)
  console.log("Doc content preview (first 2000 chars):", content.substring(0, 2000));
  console.log("Full content length:", content.length);
  
  // Clean up content: Remove common header noise from Jina Reader output
  // Jina Reader often includes navigation links at the start for Feishu docs
  let cleanContent = content;
  
  // Strategy 1: If there is a "Evaluation Criteria" or "评估标准" header, start from there
   // This is specific to our use case but very effective
   const criticalHeaders = ["Task", "请阅读上传的售前交流会议录音转写文档", "Evaluation Criteria", "评估标准", "Context Awareness", "评分前置原则"];
   for (const header of criticalHeaders) {
     const idx = cleanContent.indexOf(header);
     if (idx !== -1) {
         console.log(`Auto-detected start anchor: "${header}"`);
         // Keep the header itself
         cleanContent = cleanContent.substring(idx);
         break;
     }
   }

  const lowerContent = cleanContent.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  // 1. Try exact match
  let startIndex = lowerContent.indexOf(lowerKeyword);
  
  // 2. If not found, try matching without markdown symbols (basic fuzzy match)
  if (startIndex === -1) {
    // Remove common markdown symbols from keyword for matching: **, ##, #, etc.
    const cleanKeyword = lowerKeyword.replace(/[*#]/g, '').trim();
    if (cleanKeyword !== lowerKeyword) {
        startIndex = lowerContent.indexOf(cleanKeyword);
    }
  }

  if (startIndex === -1) {
    console.warn(`Keyword "${keyword}" not found in doc content. Returning full content.`);
    return cleanContent;
  }

  // Find the start of the line containing the keyword to include header context
  const actualStart = startIndex;
  
  return cleanContent.substring(actualStart);
};

/**
 * Validates if the content is valid for analysis.
 * Returns error message if invalid, null if valid.
 */
export const validateDocContent = (content: string): string | null => {
  if (!content || content.trim() === '') {
    return "文档内容为空，请检查文档链接或权限。";
  }

  if (content.length < 100) {
    return "文档内容过短，请检查是否读取到了完整内容。";
  }

  if (content.includes("Feishu") || content.includes("Login") || content.includes("登录")) {
    return "文档似乎需要登录才能访问。请尝试直接粘贴文档内容。";
  }

  return null;
};
