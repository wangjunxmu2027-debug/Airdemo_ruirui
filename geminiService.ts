
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

export const validateDocument = (content: string): DocumentValidationResult => {
  if (content.length < 200) {
    return {
      isValid: false,
      errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
    };
  }

  // 飞书逐字稿特征检测
  const hasFeishuFeatures = /文字记录|关键词/.test(content);
  
  // 检测说话人标识模式 (人名 + 时间戳，如 "张龙虎 00:00" 或 "张龙虎00:00")
  const speakerPattern = /[\u4e00-\u9fa5a-zA-Z]{2,10}\s*\d{1,2}:\d{2}/g;
  const speakerMatches = content.match(speakerPattern);
  
  // 检测时间戳模式
  const timestampPattern = /\d{1,2}:\d{2}/g;
  const timestampMatches = content.match(timestampPattern);

  // 检测对话内容（中文句子）
  const hasDialogue = /[，。？！、]/.test(content) && content.length > 500;

  const speakerCount = speakerMatches ? speakerMatches.length : 0;
  const timestampCount = timestampMatches ? timestampMatches.length : 0;

  // 放宽条件：满足以下任一即为合格
  // 1. 有飞书特征 + 有时间戳
  // 2. 有说话人标识
  // 3. 有足够的时间戳 + 有对话内容
  // 4. 文档足够长（超过2000字）
  if (hasFeishuFeatures && timestampCount >= 1) {
    return { isValid: true };
  }

  if (speakerCount >= 1) {
    return { isValid: true };
  }

  if (timestampCount >= 5 && hasDialogue) {
    return { isValid: true };
  }

  if (content.length > 2000) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: "⚠️ 文档类型异常：检测到您上传的似乎是会议纪要或方案文件，而非沟通逐字稿。系统无法在此类文档上执行情绪感知和互动评估。请重新上传带有完整对话上下文和说话人标识的现场录音转写文档（逐字稿）。"
  };
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
        max_tokens: 8192
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

    return JSON.parse(content) as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing transcript:", error);
    throw error;
  }
};
