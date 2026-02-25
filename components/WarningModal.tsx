import React from 'react';

interface WarningModalProps {
  message: string;
  onClose: () => void;
}

const WarningModal: React.FC<WarningModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <div className="bg-amber-50 p-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">文档类型异常</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed text-center">
            {message}
          </p>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-feishu-blue text-white py-3 rounded-xl font-medium hover:bg-feishu-hover transition-colors shadow-sm"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningModal;
