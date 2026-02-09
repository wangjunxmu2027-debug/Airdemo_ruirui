import React, { useEffect, useState } from 'react';
import { captureScreenshot } from '../screenshotUtils';
import AnalysisDashboard from './AnalysisDashboard';
import { AnalysisResult } from '../types';
import { getBitableRecord } from '../bitableService';
import { parseReportLink, decodeReportData } from '../reportUtils';

const ReportView: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const { recordId, title: urlTitle } = parseReportLink();

      if (!recordId && !urlTitle) {
        setError('未找到报告参数');
        setLoading(false);
        return;
      }

      if (urlTitle) {
        setTitle(decodeURIComponent(urlTitle));
      }

      if (recordId) {
        try {
          const record = await getBitableRecord(recordId);
          // 兼容多种数据结构：
          // 1. Supabase: record 是 AnalysisResult 对象，或者包含 data 属性
          // 2. Feishu: record.fields.result
          const analysisData = record?.fields?.result || record?.data || record;
          
          if (analysisData && (analysisData.totalScore !== undefined || analysisData.executiveSummary)) {
            setResult(analysisData);
            // 如果是 Supabase 存储的，标题可能在 record.title
            if (record.title && !title) setTitle(record.title);
          } else {
            console.error('无效的报告数据:', record);
            setError('未找到有效的报告数据');
          }
        } catch (err) {
          console.error(err);
          setError('加载报告失败');
        }
      }

      setLoading(false);
    };

    loadReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-feishu-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-feishu-blue border-t-transparent"></div>
          <p className="mt-4 text-feishu-subtext">正在加载报告...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-feishu-bg flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-feishu-text mb-2">加载失败</h2>
          <p className="text-feishu-subtext mb-4">{error || '报告数据不存在'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-feishu-blue text-white px-6 py-2 rounded-lg hover:bg-feishu-hover transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

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
      const safeTitle = (title || '复盘报告').replace(/[\\/:*?"<>|]/g, '_');
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

  return (
    <div className="min-h-screen bg-feishu-bg pb-12">
      <nav className="bg-white border-b border-feishu-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="bg-feishu-blue rounded-lg p-1.5 shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-semibold text-feishu-text tracking-tight">
                  售前汇报<span className="text-feishu-subtext font-normal ml-1">智能复盘</span>
                </span>
                {title && <p className="text-xs text-feishu-subtext">{title}</p>}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-feishu-blue rounded-full"></div>
              <h1 className="text-2xl font-bold text-feishu-text">复盘报告</h1>
            </div>
            <div className="flex items-center gap-3">
              {captureError && <span className="text-xs text-red-500">{captureError}</span>}
              <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="px-4 py-2 text-sm text-white bg-feishu-blue hover:bg-feishu-hover border border-transparent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
              >
                {isCapturing ? '正在生成...' : '一键生成长截图'}
              </button>
            </div>
          </div>
          <AnalysisDashboard result={result} />
        </div>
      </main>
    </div>
  );
};

export default ReportView;
