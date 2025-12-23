import { AnalysisResult } from './types';

export interface ReportLinkData {
  id: string;
  title: string;
  result: AnalysisResult;
}

export const generateReportLink = (recordId: string, title: string): string => {
  // 优先使用环境变量中配置的线上域名，否则使用当前页面域名
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const encodedTitle = encodeURIComponent(title);
  return `${baseUrl}/report?id=${recordId}&title=${encodedTitle}`;
};

export const parseReportLink = (): { recordId: string | null; title: string | null } => {
  // 兼容两种模式：
  // 1. /r/xxx (短链接)
  // 2. /report?id=xxx&title=xxx (旧模式)
  
  const path = window.location.pathname;
  // 处理 /r/xxx
  const rMatch = path.match(/\/r\/([^/]+)/);
  if (rMatch) {
    return { recordId: rMatch[1], title: null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    recordId: params.get('id'),
    title: params.get('title'),
  };
};

export const encodeReportData = (result: AnalysisResult): string => {
  const jsonString = JSON.stringify(result);
  return btoa(encodeURIComponent(jsonString));
};

export const decodeReportData = (encoded: string): AnalysisResult | null => {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonString) as AnalysisResult;
  } catch (error) {
    console.error('解码报告数据失败:', error);
    return null;
  }
};

export const generateShareableLink = (result: AnalysisResult, title: string): string => {
  // 优先使用环境变量中配置的线上域名，否则使用当前页面域名
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const encodedData = encodeReportData(result);
  const encodedTitle = encodeURIComponent(title);
  return `${baseUrl}/share?data=${encodedData}&title=${encodedTitle}`;
};
