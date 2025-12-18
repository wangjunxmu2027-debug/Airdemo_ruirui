import React from 'react';
import { EVALUATION_DIMENSIONS_UI } from '../constants';

interface Props {
  currentStep: number; // 0 to EVALUATION_DIMENSIONS_UI.length + 1
}

const ProgressDisplay: React.FC<Props> = ({ currentStep }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-2xl mx-auto animate-fade-in">
      <div className="bg-blue-600 p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">正在进行 AI 深度复盘</h3>
        <p className="text-blue-100 text-sm">Gemini 3 正在逐字分析会议记录，请稍候...</p>
      </div>
      <div className="p-8 space-y-6">
        {EVALUATION_DIMENSIONS_UI.map((dim, index) => {
          let status: 'waiting' | 'active' | 'done' = 'waiting';
          if (currentStep > index) status = 'done';
          if (currentStep === index) status = 'active';

          return (
            <div key={dim.id} className={`flex items-start gap-4 transition-all duration-500 ${status === 'waiting' ? 'opacity-40' : 'opacity-100'}`}>
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {status === 'done' && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {status === 'active' && (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                )}
                {status === 'waiting' && (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-semibold text-lg ${status === 'active' ? 'text-blue-700' : 'text-slate-800'}`}>
                    {dim.title}
                  </h4>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    权重: {dim.weight}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{dim.desc}</p>
              </div>
            </div>
          );
        })}
        
        {currentStep >= EVALUATION_DIMENSIONS_UI.length && (
           <div className="flex items-center justify-center pt-4 text-blue-600 font-medium animate-pulse">
             正在生成最终评分报告...
           </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDisplay;