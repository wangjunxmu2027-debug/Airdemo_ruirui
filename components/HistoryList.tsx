import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { generateMarkdown } from '../utils';

interface Props {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const HistoryList: React.FC<Props> = ({ history, onSelect, onDelete }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    const markdown = generateMarkdown(item.result);
    navigator.clipboard.writeText(markdown).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error("Copy failed", err);
    });
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-feishu-border feishu-shadow">
        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-feishu-text mb-1">暂无历史记录</h3>
        <p className="text-feishu-subtext text-sm">开始第一次质检分析后，结果将自动保存在这里。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-feishu-border feishu-shadow overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-feishu-border bg-gray-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-blue-100 rounded text-feishu-blue">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h3 className="text-base font-bold text-feishu-text">历史复盘记录</h3>
        </div>
        <span className="text-xs text-feishu-subtext">共 {history.length} 条记录</span>
      </div>
      
      <div className="divide-y divide-gray-100">
        {history.map((item) => {
          const score = item.result.totalScore;
          const isCopied = copiedId === item.id;

          return (
            <div 
              key={item.id} 
              onClick={() => onSelect(item)}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="text-base font-semibold text-feishu-text truncate group-hover:text-feishu-blue transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-xs text-gray-400 font-normal whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full">
                      {new Date(item.timestamp).toLocaleString('zh-CN')}
                    </span>
                 </div>
                 <p className="text-sm text-feishu-subtext truncate pr-8">{item.result.executiveSummary}</p>
              </div>

              <div className="flex items-center gap-8">
                 <div className="flex flex-col items-end">
                    <span className={`text-2xl font-bold font-mono ${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {score}
                    </span>
                    <span className="text-xs text-gray-400">总分</span>
                 </div>
                 
                 {/* Action Buttons */}
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleCopy(e, item)}
                      className={`p-2 rounded-full transition-all flex items-center gap-1 ${isCopied ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-feishu-blue hover:bg-blue-50'}`}
                      title="复制到飞书云文档"
                    >
                      {isCopied ? (
                        <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                           </svg>
                           <span className="text-xs font-bold">已复制</span>
                        </>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      )}
                    </button>

                    <button 
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      title="删除记录"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                 </div>
                 
                 <div className="text-gray-300 group-hover:text-feishu-blue transform group-hover:translate-x-1 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryList;