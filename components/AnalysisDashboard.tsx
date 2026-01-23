import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import CustomRadarChart from './RadarChart';
import { generateMarkdown } from '../utils';

interface Props {
  result: AnalysisResult;
  onPushToFeishu?: () => void;
  isPushing?: boolean;
}

const ScoreCard: React.FC<{ title: string; score: number; max: number; color?: string }> = ({ title, score, max }) => {
  const percentage = Math.round((score / max) * 100);
  
  let textColor = 'text-feishu-blue';
  if (percentage < 60) textColor = 'text-red-500';
  else if (percentage < 80) textColor = 'text-amber-500';
  else textColor = 'text-emerald-500';

  return (
    <div className="p-5 rounded-xl border border-feishu-border bg-white flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
      <div className={`text-3xl font-bold ${textColor} font-mono tracking-tight`}>{score}</div>
      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 mb-2 overflow-hidden">
         <div className={`h-full rounded-full ${percentage < 60 ? 'bg-red-500' : percentage < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <span className="text-xs text-feishu-subtext font-medium">{title}</span>
    </div>
  );
};

// Simple Markdown Renderer to handle bolding and paragraphs without heavy dependencies
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="text-feishu-text leading-relaxed text-justify space-y-3">
      {content.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Handle bullet points
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const displayLine = isBullet ? trimmed.substring(2) : trimmed;

        // Handle bold syntax **text**
        const parts = displayLine.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i} className={`${isBullet ? 'pl-5 relative' : ''}`}>
            {isBullet && (
              <span className="absolute left-0 top-0 text-feishu-blue font-bold">•</span>
            )}
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

const AnalysisDashboard: React.FC<Props> = ({ result, onPushToFeishu, isPushing }) => {
  const [copied, setCopied] = useState(false);

  const handlePush = async () => {
    if (!onPushToFeishu) return;
    onPushToFeishu();
  };

  const handleExport = () => {
    const markdown = generateMarkdown(result);
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div id="dashboard-capture-area" className="space-y-6 animate-fade-in relative">
      
      {/* Header Summary */}
      <div className="bg-white rounded-xl p-8 border border-feishu-border feishu-shadow">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          <div className="flex-1 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-feishu-blue">AI 洞察</span>
                    <h2 className="text-xl font-bold text-feishu-text">执行摘要</h2>
                 </div>
                 
                 {/* Push Button */}
                 {onPushToFeishu && (
                   <button
                        onClick={handlePush}
                        disabled={isPushing}
                        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm bg-feishu-blue text-white hover:bg-feishu-hover border border-transparent disabled:opacity-50 mr-2`}
                    >
                        {isPushing ? (
                            <>
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            推送中...
                            </>
                        ) : (
                            <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            推送至飞书
                            </>
                        )}
                    </button>
                 )}

                 {/* Export Button */}
                 <button
                    onClick={handleExport}
                    className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                        copied 
                        ? 'bg-green-50 text-green-600 border border-green-200' 
                        : 'bg-white text-feishu-subtext hover:text-feishu-blue border border-gray-200 hover:border-feishu-blue'
                    }`}
                 >
                    {copied ? (
                        <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        已复制
                        </>
                    ) : (
                        <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        导出文档
                        </>
                    )}
                 </button>
              </div>
              <MarkdownRenderer content={result.executiveSummary} />
            </div>
            {/* Removed Key Summary Block */}
          </div>
          
          <div className="flex-shrink-0 w-full md:w-56 flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-feishu-subtext mb-2">综合得分</div>
            <div className={`text-6xl font-bold mb-2 tracking-tighter ${result.totalScore >= 80 ? 'text-emerald-500' : result.totalScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
              {result.totalScore}
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= Math.round(result.totalScore/20) ? (result.totalScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-gray-200'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Dimensions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visuals & Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-feishu-border shadow-sm">
            <h3 className="text-base font-bold text-feishu-text mb-6 pl-2 border-l-4 border-feishu-blue">能力雷达</h3>
            <CustomRadarChart data={result.dimensions} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             {result.dimensions.map((dim, idx) => (
                <ScoreCard key={idx} title={dim.name.split(' ')[0]} score={dim.score} max={dim.maxScore} />
             ))}
          </div>
        </div>

        {/* Right Column: Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl border border-feishu-border shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-feishu-border bg-gray-50/50 flex justify-between items-center">
               <h3 className="text-base font-bold text-feishu-text pl-2 border-l-4 border-feishu-blue">详细评估</h3>
             </div>
             <div className="divide-y divide-gray-100">
               {result.dimensions.map((dim, idx) => (
                 <div key={idx} className="p-6 hover:bg-gray-50/30 transition-colors">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-base font-bold text-feishu-text">{dim.name}</h4>
                      <div className="flex items-center gap-2">
                         <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-feishu-blue" style={{ width: `${(dim.score/dim.maxScore)*100}%` }}></div>
                         </div>
                         <span className="text-sm font-semibold text-feishu-text">{dim.score}/{dim.maxScore}</span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Positives */}
                     <div>
                       <h5 className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                         亮点
                       </h5>
                       {dim.positiveObservations.length > 0 ? (
                         <ul className="space-y-1.5">
                           {dim.positiveObservations.map((obs, i) => (
                             <li key={i} className="text-sm text-feishu-subtext pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-emerald-400 before:rounded-full">
                               {obs}
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="text-sm text-gray-300">-</p>
                       )}
                     </div>

                     {/* Negatives */}
                     <div>
                       <h5 className="text-xs font-bold text-rose-500 mb-2 flex items-center gap-1">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                         待改进
                       </h5>
                       {dim.negativeObservations.length > 0 ? (
                         <ul className="space-y-1.5">
                           {dim.negativeObservations.map((obs, i) => (
                             <li key={i} className="text-sm text-feishu-subtext pl-3 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-rose-400 before:rounded-full">
                               {obs}
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="text-sm text-gray-300">-</p>
                       )}
                     </div>
                   </div>

                   <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                     <p className="text-sm text-feishu-text italic bg-blue-50/50 p-2 rounded border border-blue-50">
                       <span className="font-semibold text-feishu-blue not-italic mr-1">建议:</span> 
                       {dim.improvementSuggestions}
                     </p>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

      </div>

      {/* Part 2: Difficult Questions Analysis (New Section) */}
      {result.difficultQuestions && result.difficultQuestions.length > 0 && (
         <div className="bg-white rounded-xl border border-feishu-border shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-feishu-border bg-amber-50/50 flex justify-between items-center">
               <h3 className="text-base font-bold text-feishu-text pl-2 border-l-4 border-amber-500">🔥 高难度攻防实战复盘 (Part 2)</h3>
             </div>
             <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                   {result.difficultQuestions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                         <div className="flex items-start gap-3 mb-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 font-bold text-sm flex items-center justify-center">{idx + 1}</span>
                            <div className="flex-1">
                               <h4 className="font-semibold text-feishu-text text-sm mb-1">客户挑战/提问</h4>
                               <p className="text-feishu-text text-base font-medium">{q.customerChallenge}</p>
                            </div>
                         </div>
                         
                         <div className="ml-9 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="p-3 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-feishu-subtext mb-1 uppercase tracking-wide">现场实际回答</div>
                                  <p className="text-sm text-feishu-text leading-relaxed">{q.actualAnswer}</p>
                               </div>
                               <div className="p-3 bg-emerald-50/50 rounded border border-emerald-100">
                                  <div className="text-xs text-emerald-600 mb-1 uppercase tracking-wide font-semibold">专家建议回答</div>
                                  <p className="text-sm text-feishu-text leading-relaxed">{q.expertSuggestion}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
         </div>
      )}

      {/* General Suggestions */}
      <div className="bg-gradient-to-r from-feishu-blue to-indigo-600 rounded-xl p-8 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            专业成长建议
          </h3>
          <p className="opacity-95 leading-relaxed text-blue-50">{result.generalSuggestions}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;