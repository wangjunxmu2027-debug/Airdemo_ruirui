import { SUPABASE_CONFIG, FEISHU_CONFIG, BITABLE_FIELDS } from './supabaseConfig';
import { AnalysisResult } from './types';
import { generateShareableLink } from './reportUtils';

const getScoreLevel = (score: number): string => {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  return '需改进';
};

export const createBitableRecord = async (
  analysisResult: AnalysisResult,
  title: string,
  analyst: string = '未知'
): Promise<{ recordId: string; reportLink: string }> => {
  if (!FEISHU_CONFIG.webhookUrl) {
    throw new Error('未配置飞书 Webhook URL');
  }

  try {
    const dimensionMap: Record<string, number> = {};
    analysisResult.dimensions.forEach(dim => {
      const key = dim.name.split(' ')[0];
      dimensionMap[key] = dim.score;
    });

    // 构造基础数据
    const reportData = {
      [BITABLE_FIELDS.TITLE]: title,
      [BITABLE_FIELDS.CREATED_TIME]: new Date().toISOString(),
      [BITABLE_FIELDS.ANALYST]: analyst,
      [BITABLE_FIELDS.TOTAL_SCORE]: analysisResult.totalScore,
      [BITABLE_FIELDS.SCORE_LEVEL]: getScoreLevel(analysisResult.totalScore),
      [BITABLE_FIELDS.VALUE_DELIVERY]: dimensionMap['价值传递清晰度'] || 0,
      [BITABLE_FIELDS.INDUSTRY_FIT]: dimensionMap['行业与场景贴合度'] || 0,
      [BITABLE_FIELDS.CUSTOMER_INTERACTION]: dimensionMap['客户反馈与互动'] || 0,
      [BITABLE_FIELDS.OBJECTION_HANDLING]: dimensionMap['异议处理与推进'] || 0,
      [BITABLE_FIELDS.PROFESSIONALISM]: dimensionMap['语言表达与专业度'] || 0,
      [BITABLE_FIELDS.EXECUTIVE_SUMMARY]: analysisResult.executiveSummary,
      [BITABLE_FIELDS.GROWTH_SUGGESTION]: analysisResult.generalSuggestions,
      [BITABLE_FIELDS.DIFFICULT_QUESTIONS_COUNT]: analysisResult.difficultQuestions?.length || 0,
      // 这里的 REPORT_LINK 会由 Edge Function 生成并覆盖
    };

    // 获取当前应用的基础 URL
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const response = await fetch(
      `${SUPABASE_CONFIG.edgeFunctionUrl}/feishu-proxy/save-and-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: FEISHU_CONFIG.webhookUrl,
          reportData: reportData,
          originalData: analysisResult, // 新增：发送原始数据用于存库
          appUrl: appUrl
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`服务调用失败: ${errorText}`);
    }

    const result = await response.json();
    return { recordId: result.reportId, reportLink: result.shortLink };
  } catch (error) {
    console.error('保存记录失败:', error);
    throw error;
  }
};

export const getBitableRecord = async (recordId: string): Promise<any | null> => {
  try {
    const response = await fetch(
      `${SUPABASE_CONFIG.edgeFunctionUrl}/feishu-proxy/get-report?id=${recordId}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      console.error('获取报告失败:', response.statusText);
      return null;
    }

    const result = await response.json();
    
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
