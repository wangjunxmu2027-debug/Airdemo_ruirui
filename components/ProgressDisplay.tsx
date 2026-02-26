import React from 'react';
import { EVALUATION_DIMENSIONS_UI, DOCUMENT_VALIDATION_STEP } from '../constants';

interface Props {
  currentStep: number; // -1: idle, 0: validating, 1-5: analyzing dimensions, 6: generating report
  validationStatus?: 'pending' | 'passed' | 'failed';
}

const ProgressDisplay: React.FC<Props> = ({ currentStep, validationStatus = 'pending' }) => {
  const isValidationStep = currentStep === 0 && validationStatus === 'pending';
  const validationDone = validationStatus === 'passed';
  const validationFailed = validationStatus === 'failed';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-2xl mx-auto animate-fade-in">
      <div className="bg-blue-600 p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">正在进行 AI 深度复盘</h3>
        <p className="text-blue-100 text-sm">Gemini 3 正在逐字分析会议记录，请稍候...</p>
      </div>
      <div className="p-8 space-y-6">
        {/* Document Validation Step */}
        <div className={`flex items-start gap-4 transition-all duration-500 ${isValidationStep || validationDone ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex-shrink-0 mt-1">
            {validationFailed && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" stroke-linejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {validationDone && !validationFailed && (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {isValidationStep && !validationDone && !validationFailed && (
              <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            )}
            {!isValidationStep && !validationDone && !validationFailed && (
              <div className="w-6 h-6 rounded-full border-2 border-slate-300"></div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h4 className={`font-semibold text-lg ${isValidationStep && !validationDone ? 'text-blue-700' : validationFailed ? 'text-red-600' : 'text-slate-800'}`}>
                {DOCUMENT_VALIDATION_STEP.title}
              </h4>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {DOCUMENT_VALIDATION_STEP.weight}
              </span>
            </div>
            <p className={`text-sm ${validationFailed ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
              {validationFailed ? '文档类型异常，请重新上传逐字稿' : DOCUMENT_VALIDATION_STEP.desc}
            </p>
          </div>
        </div>

        {/* Divider */}
        {validationDone && !validationFailed && (
          <div className="border-t border-slate-200 my-4"></div>
        )}

        {/* Evaluation Dimensions - only show after validation passed */}
        {validationDone && !validationFailed && EVALUATION_DIMENSIONS_UI.map((dim, index) => {
          const stepIndex = index + 1; // +1 because validation is step 0
          let status: 'waiting' | 'active' | 'done' = 'waiting';
          if (currentStep > stepIndex) status = 'done';
          if (currentStep === stepIndex) status = 'active';

          return (
            <div key={dim.id} className={`flex items-start gap-4 transition-all duration-500 ${status === 'waiting' ? 'opacity-40' : 'opacity-100'}`}>
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
        
        {validationDone && !validationFailed && currentStep >= EVALUATION_DIMENSIONS_UI.length + 1 && (
           <div className="flex items-center justify-center pt-4 text-blue-600 font-medium animate-pulse">
             正在生成最终评分报告...
           </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDisplay;
