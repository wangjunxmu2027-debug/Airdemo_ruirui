import { SUPABASE_CONFIG } from './supabaseConfig';
import { FEISHU_CONFIG, BITABLE_FIELDS } from './feishuConfig';
import { AnalysisResult } from './types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

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
    // 优先使用 AI 提取的字段，如果未提取到则回退到默认值
    // Customer Name: AI提取 > 文件名
    const customerName = analysisResult.customerName || title;
    
    // Reporter: AI提取 > 默认"售前顾问"
    const reporter = analysisResult.reporterName || analyst || '售前顾问';
    
    // Summary: AI提取 > 执行摘要前50字
    const summary = analysisResult.reportSummary || (analysisResult.executiveSummary ? analysisResult.executiveSummary.slice(0, 100) + '...' : '无摘要');

    // 构造极简数据 - 仅包含用户指定的字段
    const meetingDate = extractMeetingDate(analysisResult);
    const reportDate = meetingDate || new Date().toLocaleDateString('zh-CN');
    const reportData = {
      [BITABLE_FIELDS.CUSTOMER_NAME]: customerName,
      [BITABLE_FIELDS.REPORTER]: reporter,
      [BITABLE_FIELDS.REPORT_DATE]: reportDate,
      [BITABLE_FIELDS.SUMMARY]: summary,
      [BITABLE_FIELDS.SCREENSHOT]: screenshotUrl,
      [BITABLE_FIELDS.SCORE]: analysisResult.totalScore,
      // 报告链接字段在 Edge Function 中生成并填充
    };

    // 获取当前应用的基础 URL
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const { data, error } = await supabase.functions.invoke('feishu-proxy/save-and-webhook', {
      body: {
        webhookUrl: FEISHU_CONFIG.webhookUrl,
        reportData: reportData,
        originalData: analysisResult,
        appUrl: appUrl
      }
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
    const { data, error } = await supabase.functions.invoke(`feishu-proxy/get-report?id=${recordId}`, {
      method: 'GET'
    });

    if (error) {
      console.error('获取报告失败:', error.message || error);
      return null;
    }

    const result = data;
    
    // Edge Function 返回格式: { data: { id, title, data: AnalysisResult, ... } }
    // 我们需要返回内部的 AnalysisResult
    if (result.data && result.data.data) {
      return result.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('获取报告异常:', error);
    return null;
  }
};
