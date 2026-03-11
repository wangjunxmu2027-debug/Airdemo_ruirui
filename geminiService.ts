
import { QA_CRITERIA_PROMPT } from "./constants";
import { AnalysisResult, AnalysisInput, AnalysisConfig, DocumentValidationResult } from "./types";

// API 配置 - 请在 .env.local 文件中设置 API_KEY 和 BASE_URL
const API_SECRET_KEY = process.env.API_KEY || "";
const BASE_URL = process.env.BASE_URL || "";
const MODEL = "gemini-3-pro-preview";

// JSON Schema for structured output
const responseSchema = {
  type: "object",
  properties: {
    customerName: { type: "string", description: "The specific customer/company name (e.g., 'Haitian', 'Jiannanchun'). Infer from context if not explicit." },
    reporterName: { type: "string", description: "The name of the main pre-sales consultant/reporter." },
    reportSummary: { type: "string", description: "Who was briefed and what? E.g., 'Chairman & Management: CXO Report', 'R&D Team: AI Capability Demo'." },
    meetingDate: { type: "string", description: "Meeting date in format YYYY/M/D, or 未知 if not found." },
    totalScore: { type: "number", description: "The total calculated score out of 100." },
    summary: { type: "string", description: "A brief summary of the pre-sales session." },
    executiveSummary: { type: "string", description: "A high-level verdict for the sales director." },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the dimension (e.g., Value Delivery Clarity)" },
          score: { type: "number", description: "Score awarded for this dimension." },
          maxScore: { type: "number", description: "Maximum possible score for this dimension." },
          positiveObservations: { 
            type: "array", 
            items: { type: "string" },
            description: "List of specific positive behaviors observed."
          },
          negativeObservations: { 
            type: "array", 
            items: { type: "string" },
            description: "List of specific negative behaviors or deductions applied."
          },
          improvementSuggestions: { type: "string", description: "Specific advice for this dimension." },
        },
        required: ["name", "score", "maxScore", "positiveObservations", "negativeObservations", "improvementSuggestions"]
      }
    },
    difficultQuestions: {
      type: "array",
      description: "Part 2: High Difficulty Defense Replay. Extract 1-3 hardest questions.",
      items: {
        type: "object",
        properties: {
           question: { type: "string", description: "The context of the difficult moment." },
           customerChallenge: { type: "string", description: "The specific question or challenge raised by the client." },
           actualAnswer: { type: "string", description: "What the salesperson actually said." },
           expertSuggestion: { type: "string", description: "How a senior expert would answer this." }
        },
        required: ["question", "customerChallenge", "actualAnswer", "expertSuggestion"]
      }
    },
    generalSuggestions: { type: "string", description: "Overall supplementary advice for the pre-sales consultant." }
  },
  required: ["totalScore", "summary", "executiveSummary", "dimensions", "generalSuggestions", "difficultQuestions", "customerName", "reporterName", "reportSummary", "meetingDate"]
};

const DOCUMENT_VALIDATION_PROMPT = `你是一个文档类型识别专家。请严格判断以下文本片段是否来自"飞书会议录音转写逐字稿"。

【飞书逐字稿的必须特征】（必须同时满足以下所有条件才算合格）：
1. 必须包含"文字记录"或"⽂字记录"标题
2. 必须包含"关键词"或"关键词"标记
3. 必须包含会议时长格式（如"1小时53分钟"、"1⼩时53分钟"）
4. 必须包含说话人名称+时间戳格式（如"张龙虎 00:00"、"张龙虎 00:00"）

【非逐字稿特征】（出现以下任一情况应拒绝）：
- 纯文本段落，没有说话人标识
- 会议纪要、摘要形式
- 方案文档、PPT文本
- 产品介绍、宣传材料
- 企业内部通知、公告
- 年报、财务报告

请只返回JSON，不要其他内容：
{"isValid":true} 或 {"isValid":false}`;

export const validateDocument = async (content: string): Promise<DocumentValidationResult> => {
  console.log('=== 开始文档校验 ===');
  console.log('文档长度:', content.length);
  console.log('前200字符:', content.slice(0, 200));
  
  if (content.length < 200) {
    console.log('文档长度不足200，拒绝');
    return {
      isValid: false,
      errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
    };
  }

  try {
    // 只读取前200个字符让LLM判断
    const textToAnalyze = content.slice(0, 200);
    console.log('发送给LLM的内容:', textToAnalyze);
    
    const messages = [
      {
        role: "system",
        content: DOCUMENT_VALIDATION_PROMPT
      },
      {
        role: "user",
        content: `请判断以下文档片段是否为飞书逐字稿：\n\n${textToAnalyze}`
      }
    ];

    console.log('API URL:', `${BASE_URL}/chat/completions`);
    console.log('API Key 存在:', !!API_SECRET_KEY);
    
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_SECRET_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0,
        max_tokens: 100,
        response_format: {
          type: "json_object"
        }
      })
    });

    console.log('API 响应状态:', response.status);
    
    if (!response.ok) {
      console.error("Validation API error:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      // API调用失败时，默认通过，避免阻断用户
      return { isValid: true };
    }

    const data = await response.json();
    console.log('API 响应数据:', data);
    console.log('choices:', data.choices);
    console.log('choices[0]:', data.choices?.[0]);
    console.log('message:', data.choices?.[0]?.message);
    
    let responseText = data.choices?.[0]?.message?.content || '';
    console.log('LLM 原始响应:', responseText);
    
    // 清理响应
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7);
    } else if (responseText.startsWith('```')) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3);
    }
    responseText = responseText.trim();
    console.log('清理后的响应:', responseText);

    // 尝试解析JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      // 如果JSON解析失败，尝试从文本中提取isValid值
      const isValidMatch = responseText.match(/"isValid"\s*:\s*(true|false)/);
      if (isValidMatch) {
        result = { isValid: isValidMatch[1] === 'true' };
        console.log('从文本中提取isValid:', result);
      } else {
        // 尝试匹配 true 或 false
        if (responseText.includes('true')) {
          result = { isValid: true };
          console.log('从文本中检测到true');
        } else if (responseText.includes('false')) {
          result = { isValid: false };
          console.log('从文本中检测到false');
        } else {
          // 无法解析，默认拒绝
          console.log('无法解析LLM响应，默认拒绝');
          return {
            isValid: false,
            errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
          };
        }
      }
    }
    console.log('解析后的结果:', result);

    if (!result.isValid) {
      console.log('LLM判断为非逐字稿，拒绝');
      return {
        isValid: false,
        errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
      };
    }

    console.log('LLM判断为逐字稿，通过');
    return { isValid: true };

  } catch (error) {
    console.error("Document validation error:", error);
    // 出错时默认拒绝
    return {
      isValid: false,
      errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
    };
  }
};

export const analyzeTranscript = async (input: AnalysisInput, config?: AnalysisConfig): Promise<AnalysisResult> => {
  if (!API_SECRET_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  try {
    // Determine System Instruction: Use custom if provided, otherwise default
    const systemPrompt = config?.systemInstruction 
      ? `You are a Senior Pre-sales Quality Assurance Expert. STRICTLY FOLLOW the user-provided evaluation criteria below:\n\n${config.systemInstruction}`
      : QA_CRITERIA_PROMPT;

    // Construct user message based on input type
    let userMessage: string;
    const messages: Array<{role: string, content: string | Array<any>}> = [];

    // Add system message
    messages.push({
      role: "system",
      content: systemPrompt
    });

    if (input.type === 'pdf') {
      // For PDF, we need to send as image/file content
      // Most OpenAI-compatible APIs support base64 images in content array
      userMessage = "Please analyze the meeting transcript contained in the attached PDF file.";
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage },
          { 
            type: "file",
            file: {
              filename: "transcript.pdf",
              file_data: `data:application/pdf;base64,${input.content}`
            }
          }
        ]
      });
    } else {
      userMessage = `Here is the meeting transcript to analyze:\n\n${input.content}`;
      messages.push({
        role: "user",
        content: userMessage
      });
    }

    // Add instruction for JSON output
    messages.push({
      role: "user", 
      content: `请按照以下JSON格式返回分析结果，所有字符串值必须使用简体中文：
${JSON.stringify(responseSchema, null, 2)}

请直接返回JSON，不要添加任何markdown代码块标记。`
    });

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_SECRET_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error:", errorData);
      throw new Error(`API请求失败 (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("API返回格式异常");
    }

    let content = data.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.slice(7);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Check if the response contains an error message about invalid document format
    if (content.includes('"error"') && (content.includes('Invalid document format') || content.includes('文档类型异常'))) {
      // 如果是直接的中文错误消息，直接抛出
      if (content.includes('⚠️ 文档类型异常')) {
        throw new Error(content);
      }
      // 如果是 JSON 格式的错误
      try {
        const parsedError = JSON.parse(content);
        throw new Error(parsedError.error);
      } catch (e) {
        // 如果 JSON 解析失败，直接抛出原始内容
        throw new Error(content);
      }
    }

    // 尝试解析 JSON，如果失败则尝试修复常见的 JSON 格式问题
    try {
      return JSON.parse(content) as AnalysisResult;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      
      // 尝试修复未闭合的字符串问题
      // 查找最后一个完整的对象闭合括号
      const lastBrace = content.lastIndexOf('}');
      if (lastBrace !== -1) {
        const truncatedContent = content.substring(0, lastBrace + 1);
        try {
          return JSON.parse(truncatedContent) as AnalysisResult;
        } catch (e) {
          console.error("修复后的 JSON 仍然解析失败");
        }
      }
      
      // 如果还是失败，抛出原始错误
      throw new SyntaxError(`JSON 解析失败：${parseError.message}. 原始内容：${content.substring(0, 500)}...`);
    }

  } catch (error) {
    console.error("Error analyzing transcript:", error);
    throw error;
  }
};
