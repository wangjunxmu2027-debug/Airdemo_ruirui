import { HistoryItem, AnalysisResult } from './types';

const STORAGE_KEY = 'presales_qa_history_v1';

export const saveHistoryItem = (result: AnalysisResult, title: string): HistoryItem[] => {
  const history = getHistory();
  const newItem: HistoryItem = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    title: title || `未命名分析 ${new Date().toLocaleDateString()}`,
    result
  };
  const newHistory = [newItem, ...history];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to save history", e);
  }
  return newHistory;
};

export const getHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
};

export const deleteHistoryItem = (id: string): HistoryItem[] => {
  const history = getHistory().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};