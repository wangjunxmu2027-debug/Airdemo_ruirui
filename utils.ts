import { AnalysisResult } from './types';

export const generateMarkdown = (result: AnalysisResult): string => {
  let markdown = `# 售前汇报智能复盘报告\n\n`;
  markdown += `**综合得分**: ${result.totalScore}/100\n\n`;
  markdown += `## 执行摘要\n${result.executiveSummary}\n\n`;
  
  markdown += `## 维度详情\n`;
  result.dimensions.forEach(dim => {
    markdown += `### ${dim.name} (${dim.score}/${dim.maxScore})\n`;
    markdown += `**亮点**: ${dim.positiveObservations.join('; ') || '无'}\n`;
    markdown += `**扣分/改进**: ${dim.negativeObservations.join('; ') || '无'}\n`;
    markdown += `**建议**: ${dim.improvementSuggestions}\n\n`;
  });

  if (result.difficultQuestions && result.difficultQuestions.length > 0) {
    markdown += `## 高难度攻防实战复盘\n`;
    result.difficultQuestions.forEach((q, i) => {
       markdown += `### 问题 ${i+1}: ${q.customerChallenge}\n`;
       markdown += `**实际回答**: ${q.actualAnswer}\n`;
       markdown += `**专家建议**: ${q.expertSuggestion}\n\n`;
    });
  }

  markdown += `## 专业成长建议\n${result.generalSuggestions}\n`;
  
  return markdown;
};