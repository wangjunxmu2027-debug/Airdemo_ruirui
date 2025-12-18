
export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  positiveObservations: string[];
  negativeObservations: string[];
  improvementSuggestions: string;
}

export interface DifficultQuestion {
  question: string;
  customerChallenge: string; // The challenge/question from the customer
  actualAnswer: string;      // What was actually said
  expertSuggestion: string;  // How it should have been answered
}

export interface AnalysisResult {
  totalScore: number;
  summary: string;
  dimensions: DimensionScore[];
  generalSuggestions: string;
  executiveSummary: string;
  difficultQuestions: DifficultQuestion[]; // New field for Part 2 of the PDF requirement
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface UploadState {
  text: string;
  fileName?: string;
}

export interface AnalysisInput {
  type: 'text' | 'pdf';
  content: string;
  title?: string;
}

export interface AnalysisConfig {
  systemInstruction?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  result: AnalysisResult;
}

// FeishuConfig removed as it is no longer required for public doc reading
export interface FeishuConfig {
  // Keeping interface for type compatibility during migration if needed, 
  // but it's effectively optional/empty now.
  appId?: string;
  appSecret?: string;
}
