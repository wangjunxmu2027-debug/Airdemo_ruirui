
import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import AnalysisDashboard from './components/AnalysisDashboard';
import ProgressDisplay from './components/ProgressDisplay';
import HistoryList from './components/HistoryList';
import PromptSettings from './components/PromptSettings';
import { AnalysisResult, AnalysisStatus, AnalysisInput, HistoryItem } from './types';
import { analyzeTranscript } from './geminiService';
import { EVALUATION_DIMENSIONS_UI } from './constants';
import { saveHistoryItem, getHistory, deleteHistoryItem } from './storage';
import { createBitableRecord } from './bitableService';
import { extractMeetingDateFromText } from './utils';
import { captureScreenshot } from './screenshotUtils';
import ReportView from './components/ReportView';

function App() {
  // Simple routing for report view
  const isReportView = window.location.pathname.startsWith('/r/') || window.location.pathname.startsWith('/report');
  if (isReportView) {
    return <ReportView />;
  }

  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'history'>('home');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Config State
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>('');

  // Bitable State
  const [bitableRecordId, setBitableRecordId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSavingToBitable, setIsSavingToBitable] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [hasAutoPushed, setHasAutoPushed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Simulation logic for progress steps
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (status === AnalysisStatus.ANALYZING) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < EVALUATION_DIMENSIONS_UI.length) {
            return prev + 1;
          }
          return prev;
        });
      }, 3500); 
    }

    return () => clearInterval(interval);
  }, [status]);

  // Auto Push to Feishu when Analysis is Complete
  useEffect(() => {
    if (status === AnalysisStatus.COMPLETE && result && !hasAutoPushed) {
      // Delay to ensure dashboard is rendered and charts are animated
      const timer = setTimeout(() => {
        handlePushToFeishu();
        setHasAutoPushed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, result, hasAutoPushed]);

  // Load history on mount
  useEffect(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleAnalyze = async (input: AnalysisInput) => {
    setStatus(AnalysisStatus.ANALYZING);
    setErrorMsg(null);
    setCurrentTitle(input.title || '未命名分析');
    setHasAutoPushed(false); // Reset auto-push state
    
    try {
      const data = await analyzeTranscript(input, {
        systemInstruction: customPrompt || undefined
      });
      const meetingDate = input.meetingDate || (input.type === 'text' ? extractMeetingDateFromText(input.content) : null);
      if (meetingDate) {
        data.meetingDate = meetingDate;
      }
      setResult(data);
      setStatus(AnalysisStatus.COMPLETE);
      
      // Save to History
      const updatedHistory = saveHistoryItem(data, input.title || '未命名分析');
      setHistoryItems(updatedHistory);

      // Auto-save removed to allow screenshot
    } catch (err: any) {
      console.error(err);
      setStatus(AnalysisStatus.ERROR);
      setErrorMsg(err.message || "分析失败，请检查API Key或文件格式后重试。");
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const base64 = await captureScreenshot('dashboard-capture-area');
      if (!base64) {
        setCaptureError('生成截图失败，请重试');
        setIsCapturing(false);
        return;
      }
      const dataUrl = `data:image/png;base64,${base64}`;
      const link = document.createElement('a');
      const safeTitle = (currentTitle || '复盘报告').replace(/[\\/:*?"<>|]/g, '_');
      link.download = `${safeTitle}_长截图.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setCaptureError('生成截图失败，请重试');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePushToFeishu = async () => {
    if (!result) return;
    setIsPushing(true);
    try {
        // 直接创建记录，链接由 Edge Function 生成并填充到截图字段
        const { recordId, reportLink } = await createBitableRecord(
          result,
          currentTitle,
          '售前顾问',
          '' // 占位，后端会注入真实链接
        );
        setBitableRecordId(recordId);
        setShareLink(reportLink);
        console.log("✅ Auto-pushed to Feishu successfully");
    } catch (e: any) {
        console.error("Auto-push failed:", e);
    } finally {
        setIsPushing(false);
    }
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这条复盘记录吗？')) {
      const updated = deleteHistoryItem(id);
      setHistoryItems(updated);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setResult(item.result);
    setStatus(AnalysisStatus.COMPLETE);
    setView('home'); // Go to dashboard view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setErrorMsg(null);
    setCurrentStep(0);
    setView('home');
  };

  const navToHistory = () => {
    setView('history');
    setHistoryItems(getHistory()); // Refresh
  };

  return (
    <div className="min-h-screen bg-feishu-bg pb-12 relative">
      {/* Settings Modal */}
      {showSettings && (
        <PromptSettings 
          currentPrompt={customPrompt}
          onPromptChange={setCustomPrompt}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Navbar - Minimalist Feishu Style */}
      <nav className="bg-white border-b border-feishu-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
                <div className="bg-feishu-blue rounded-lg p-1.5 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-feishu-text tracking-tight">
                  售前汇报<span className="text-feishu-subtext font-normal ml-1">智能复盘</span>
                </span>
              </div>

              <div className="hidden md:flex items-center space-x-1">
                 <button 
                   onClick={() => setView('home')}
                   className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'home' ? 'text-feishu-blue bg-blue-50' : 'text-feishu-subtext hover:text-feishu-text hover:bg-gray-100'}`}
                 >
                   开始质检
                 </button>
                 <button 
                   onClick={navToHistory}
                   className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'history' ? 'text-feishu-blue bg-blue-50' : 'text-feishu-subtext hover:text-feishu-text hover:bg-gray-100'}`}
                 >
                   历史记录
                 </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  onClick={() => setShowSettings(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${customPrompt ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                  title="配置复盘标准"
               >
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                 {customPrompt ? '标准: 自定义' : '标准: 默认'}
               </button>

               <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-feishu-blue rounded-full border border-blue-100">
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                 </svg>
                 <span className="text-xs font-medium">Gemini 3 Deep Research</span>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {view === 'history' ? (
           <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-feishu-text">历史记录</h2>
                <button 
                  onClick={reset} 
                  className="bg-feishu-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-feishu-hover transition-colors shadow-sm"
                >
                  新建复盘
                </button>
              </div>
              <HistoryList 
                history={historyItems} 
                onSelect={handleSelectHistory} 
                onDelete={handleDeleteHistory}
              />
           </div>
        ) : (
          <>
            {/* Header Section - Simplistic & Atmospheric */}
            {status === AnalysisStatus.IDLE && (
              <div className="text-center max-w-4xl mx-auto mb-12 animate-fade-in-up">
                <h1 className="text-4xl font-extrabold text-feishu-text mb-6 tracking-tight leading-tight">
                  复盘，为了下一次更精彩的
                  <span className="text-feishu-blue"> 赢单</span>
                </h1>
                <p className="text-lg text-feishu-subtext max-w-2xl mx-auto leading-relaxed">
                  基于飞书售汇报质量评估标准，深度解析会议细节。
                </p>
                {customPrompt && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    已启用自定义复盘标准
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Dimensions Grid */}
            {status === AnalysisStatus.IDLE && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-12 animate-fade-in-up delay-100">
                {EVALUATION_DIMENSIONS_UI.map((dim) => (
                  <div key={dim.id} className="bg-white p-6 rounded-2xl border border-feishu-border hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default">
                    <div className="flex flex-col items-center text-center h-full">
                      <div className="text-feishu-blue mb-4 bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                         <span className="font-bold text-base">{dim.weight.replace('分','')}</span>
                      </div>
                      <h3 className="font-bold text-feishu-text mb-2 text-base">{dim.title}</h3>
                      <p className="text-xs text-feishu-subtext leading-relaxed opacity-80">{dim.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main Action Area */}
            <div className="max-w-4xl mx-auto">
              {status === AnalysisStatus.IDLE && (
                <FileUpload 
                  onAnalyze={handleAnalyze} 
                  isLoading={false}
                />
              )}

              {status === AnalysisStatus.ANALYZING && (
                 <ProgressDisplay currentStep={currentStep} />
              )}
              
              {/* Error Message */}
              {status === AnalysisStatus.ERROR && (
                 <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-fade-in">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-red-700 flex-1">
                      <div className="font-semibold mb-1">分析中断</div> 
                      {errorMsg}
                      <button onClick={reset} className="block mt-2 text-feishu-blue font-medium hover:underline">重试</button>
                    </div>
                 </div>
              )}
            </div>

            {/* Results Area */}
            {status === AnalysisStatus.COMPLETE && result && (
              <div className="space-y-6 mt-8 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-feishu-blue rounded-full"></div>
                    <h2 className="text-xl font-bold text-feishu-text">复盘报告</h2>
                  </div>
                  
                  <div className="flex gap-3">
                    {captureError && (
                      <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        {captureError}
                      </div>
                    )}
                    {isSavingToBitable && (
                      <div className="px-4 py-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        正在保存到多维表格...
                      </div>
                    )}
                    {shareLink && !isSavingToBitable && (
                      <div className="px-4 py-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        已保存到多维表格
                        <button
                          onClick={() => window.open(shareLink, '_blank')}
                          className="ml-2 text-emerald-700 hover:text-emerald-900 underline"
                        >
                          查看记录
                        </button>
                      </div>
                    )}
                    <button
                      onClick={handleCapture}
                      disabled={isCapturing}
                      className="px-4 py-2 text-sm text-white bg-feishu-blue hover:bg-feishu-hover border border-transparent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isCapturing ? '正在生成...' : '一键生成长截图'}
                    </button>
                    <button 
                      onClick={navToHistory}
                      className="px-4 py-2 text-sm text-feishu-subtext hover:text-feishu-text bg-white border border-feishu-border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      查看历史
                    </button>
                    <button 
                      onClick={reset}
                      className="px-4 py-2 text-sm text-white bg-feishu-blue hover:bg-feishu-hover border border-transparent rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      分析下一个
                    </button>
                  </div>
                </div>
                
                <AnalysisDashboard result={result} />
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

export default App;
