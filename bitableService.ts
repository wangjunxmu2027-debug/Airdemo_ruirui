import { SUPABASE_CONFIG } from './supabaseConfig';
import { FEISHU_CONFIG, BITABLE_FIELDS } from './feishuConfig';
import { AnalysisResult } from './types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

const isDev = import.meta.env.DEV;
const EDGE_FUNCTION_BASE = isDev ? '/functions/v1' : SUPABASE_CONFIG.edgeFunctionUrl;

const extractMeetingDate = (analysisResult: AnalysisResult): string | null => {
  if (analysisResult.meetingDate) {
    const match = analysisResult.meetingDate.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})日?/);
    if (match) {
      const year = match[1];
      const month = String(Number(match[2]));
      const day = String(Number(match[3]));
      return `${year}/${month}/${day}`;
    }
  }
  const parts: string[] = [];
  if (analysisResult.reportSummary) parts.push(analysisResult.reportSummary);
  if (analysisResult.executiveSummary) parts.push(analysisResult.executiveSummary);
  if (analysisResult.summary) parts.push(analysisResult.summary);
  if (analysisResult.generalSuggestions) parts.push(analysisResult.generalSuggestions);
  if (analysisResult.dimensions?.length) {
    analysisResult.dimensions.forEach((dimension) => {
      parts.push(dimension.improvementSuggestions);
      parts.push(...dimension.positiveObservations);
      parts.push(...dimension.negativeObservations);
    });
  }
  const text = parts.join(' ');
  const match = text.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})日?/);
  if (!match) return null;
  const year = match[1];
  const month = String(Number(match[2]));
  const day = String(Number(match[3]));
  return `${year}/${month}/${day}`;
};

async function invokeEdgeFunction(functionName: string, body: any): Promise<{ data: any; error: any }> {
  const url = `${EDGE_FUNCTION_BASE}/${functionName}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'apikey': SUPABASE_CONFIG.anonKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message || 'Request failed' } };
  }
}

export const createBitableRecord = async (
  analysisResult: AnalysisResult,
  title: string,
  analyst: string = '未知',
  screenshotUrl: string = ''
): Promise<{ recordId: string; reportLink: string }> => {
  if (!FEISHU_CONFIG.webhookUrl) {
    throw new Error('未配置飞书 Webhook URL');
  }

  try {
    const customerName = analysisResult.customerName || title;
    const reporter = analysisResult.reporterName || analyst || '售前顾问';
    const summary = analysisResult.reportSummary || (analysisResult.executiveSummary ? analysisResult.executiveSummary.slice(0, 100) + '...' : '无摘要');

    const meetingDate = extractMeetingDate(analysisResult);
    const reportDate = meetingDate || new Date().toLocaleDateString('zh-CN');
    const reportData = {
      [BITABLE_FIELDS.CUSTOMER_NAME]: customerName,
      [BITABLE_FIELDS.REPORTER]: reporter,
      [BITABLE_FIELDS.REPORT_DATE]: reportDate,
      [BITABLE_FIELDS.SUMMARY]: summary,
      [BITABLE_FIELDS.SCREENSHOT]: screenshotUrl,
      [BITABLE_FIELDS.SCORE]: analysisResult.totalScore,
    };

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const { data, error } = await invokeEdgeFunction('feishu-proxy/save-and-webhook', {
      webhookUrl: FEISHU_CONFIG.webhookUrl,
      reportData: reportData,
      originalData: analysisResult,
      appUrl: appUrl
    });

    if (error) {
      throw new Error(`服务调用失败: ${error.message || '未知错误'}`);
    }

    return { recordId: data.reportId, reportLink: data.shortLink };
  } catch (error) {
    console.error('保存记录失败:', error);
    throw error;
  }
};


export const getBitableRecord = async (recordId: string): Promise<any | null> => {
  try {
    const url = `${EDGE_FUNCTION_BASE}/feishu-proxy/get-report?id=${recordId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'apikey': SUPABASE_CONFIG.anonKey
      }
    });

    if (!response.ok) {
      console.error('获取报告失败:', response.status);
      return null;
    }

    const result = await response.json();
    
    if (result.data && result.data.data) {
      return result.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('获取报告异常:', error);
    return null;
  }
};
