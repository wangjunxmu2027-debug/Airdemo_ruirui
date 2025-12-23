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

    // 生成包含完整数据的分享链接
    const reportLink = generateShareableLink(analysisResult, title);

    // 构造发送给 Webhook 的数据
    // 注意：这里的数据结构需要与飞书自动化流程中配置的接收格式一致
    // 建议在飞书自动化中选择 "Webhook 触发" -> "接收 JSON 数据"
    const webhookData = {
      [BITABLE_FIELDS.TITLE]: title,
      [BITABLE_FIELDS.CREATED_TIME]: new Date().toISOString(), // Webhook 通常接受 ISO 字符串
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
      [BITABLE_FIELDS.REPORT_LINK]: reportLink,
    };

    const response = await fetch(
      `${SUPABASE_CONFIG.edgeFunctionUrl}/feishu-proxy/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: FEISHU_CONFIG.webhookUrl,
          data: webhookData
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook 调用失败: ${errorText}`);
    }

    // Webhook 成功触发，返回一个虚拟的 recordId（因为 Webhook 不返回 ID）
    return { recordId: 'webhook-triggered', reportLink };
  } catch (error) {
    console.error('通过 Webhook 保存记录失败:', error);
    throw error;
  }
};

export const getBitableRecord = async (recordId: string): Promise<any | null> => {
  // Webhook 模式下不支持获取记录，除非保留原有的 API 逻辑
  console.warn("Webhook 模式不支持直接通过 ID 获取记录");
  return null;
};
