
import React, { useCallback, useState } from 'react';
import { AnalysisInput } from '../types';
import { fetchFeishuDocContent } from '../feishuService';
import { extractMeetingDateFromText } from '../utils';

interface Props {
  onAnalyze: (input: AnalysisInput) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<Props> = ({ onAnalyze, isLoading }) => {
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'feishu'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Feishu URL local state
  const [feishuUrl, setFeishuUrl] = useState('');
  const [isFeishuLoading, setIsFeishuLoading] = useState(false);
  const [feishuError, setFeishuError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setFileName(file.name);
    
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Content = result.split(',')[1];
        onAnalyze({ type: 'pdf', content: base64Content, title: file.name });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextInput(text);
        const meetingDate = extractMeetingDateFromText(text);
        onAnalyze({ type: 'text', content: text, title: file.name, meetingDate: meetingDate || undefined });
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onAnalyze]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleFeishuImport = async () => {
    if (!feishuUrl) {
      setFeishuError("请填写飞书文档链接");
      return;
    }
    
    setIsFeishuLoading(true);
    setFeishuError(null);

    try {
      const docContent = await fetchFeishuDocContent(feishuUrl);
      const today = new Date().toLocaleDateString('zh-CN');
      const meetingDate = extractMeetingDateFromText(docContent);
      onAnalyze({ type: 'text', content: docContent, title: `飞书文档导入 - ${today}`, meetingDate: meetingDate || undefined });
    } catch (error: any) {
      console.error(error);
      setFeishuError(error.message || "获取文档内容失败，请检查链接权限");
    } finally {
      setIsFeishuLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-feishu-border overflow-hidden feishu-shadow">
      {/* Tabs */}
      <div className="flex border-b border-feishu-border bg-gray-50/50">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-4 text-sm font-medium transition-all ${
            activeTab === 'file' 
              ? 'bg-white text-feishu-blue border-t-2 border-t-feishu-blue' 
              : 'text-feishu-subtext hover:text-feishu-text hover:bg-gray-100'
          }`}
        >
          上传文档 (PDF/Txt)
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-4 text-sm font-medium transition-all ${
            activeTab === 'text' 
              ? 'bg-white text-feishu-blue border-t-2 border-t-feishu-blue' 
              : 'text-feishu-subtext hover:text-feishu-text hover:bg-gray-100'
          }`}
        >
          粘贴文本
        </button>
        <button
          onClick={() => setActiveTab('feishu')}
          className={`flex-1 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'feishu' 
              ? 'bg-white text-feishu-blue border-t-2 border-t-feishu-blue' 
              : 'text-feishu-subtext hover:text-feishu-text hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
             <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          飞书云文档
        </button>
      </div>

      <div className="p-8 min-h-[320px]">
        {/* FILE TAB */}
        {activeTab === 'file' && (
          <div className="h-full flex flex-col space-y-6">
            {/* Guide Section */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
              <h4 className="text-sm font-bold text-feishu-text mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-feishu-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                如何开始复盘
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-blue-200 text-feishu-blue rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">1</span>
                  <p className="text-xs text-feishu-subtext leading-relaxed">从智能纪要文档库中找到对应的会议逐字稿文档</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-blue-200 text-feishu-blue rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                  <p className="text-xs text-feishu-subtext leading-relaxed">将文档导出或<b>下载为 PDF</b> 格式</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-white border border-blue-200 text-feishu-blue rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">3</span>
                  <p className="text-xs text-feishu-subtext leading-relaxed">将导出的 PDF 文件<b>拖拽至下方</b>区域启动复盘</p>
                </div>
              </div>
            </div>

            <div
              className={`relative flex-1 border border-dashed rounded-xl p-12 text-center transition-all duration-200 group flex flex-col items-center justify-center min-h-[160px] ${
                dragActive 
                  ? 'border-feishu-blue bg-blue-50/30' 
                  : 'border-gray-300 hover:border-feishu-blue hover:bg-gray-50/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <div className="space-y-4 pointer-events-none">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragActive ? 'bg-blue-100 text-feishu-blue' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-feishu-blue'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-feishu-text mb-1">
                    {fileName ? `已选择: ${fileName}` : "点击或拖拽 PDF 文件到此处"}
                  </p>
                  <p className="text-[10px] text-feishu-subtext">支持 PDF, TXT, MD 格式（建议优先使用 PDF 以获得最佳分析效果）</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4 h-full flex flex-col">
            <textarea
              className="w-full flex-1 p-4 text-sm text-feishu-text border border-feishu-border rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-feishu-blue resize-none placeholder-gray-400 transition-shadow min-h-[200px]"
              placeholder="请在此粘贴会议逐字稿内容，建议包含发言人信息..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <button
                onClick={() => onAnalyze({ type: 'text', content: textInput, title: `文本分析 - ${new Date().toLocaleTimeString('zh-CN')}` })}
                disabled={isLoading || !textInput.trim()}
                className="bg-feishu-blue hover:bg-feishu-hover text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>正在分析...</span>
                  </>
                ) : (
                  <span>开始质检</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* FEISHU DOC TAB */}
        {activeTab === 'feishu' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-2">
               <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <div>
                 <p className="font-semibold">使用说明</p>
                 <p className="opacity-90 leading-relaxed">
                   请输入<span className="font-bold">互联网可见</span>的飞书云文档 (DocX/Wiki) 链接。
                 </p>
                 <p className="opacity-75 mt-1 text-xs">
                   请在飞书文档右上角点击【分享】，将权限设置为 <code className="bg-blue-100 px-1 rounded">互联网上获得链接的任何人可阅读</code>。
                 </p>
               </div>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-feishu-text mb-1.5">飞书公开链接</label>
                   <input 
                      type="text" 
                      placeholder="https://your-domain.feishu.cn/docx/..."
                      value={feishuUrl}
                      onChange={(e) => setFeishuUrl(e.target.value)}
                      className="w-full p-2.5 text-sm border border-feishu-border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-feishu-blue outline-none transition-all"
                   />
                </div>

                {feishuError && (
                  <div className="text-red-500 text-sm flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     {feishuError}
                  </div>
                )}
             </div>

             <div className="flex justify-end pt-2">
              <button
                onClick={handleFeishuImport}
                disabled={isFeishuLoading || isLoading || !feishuUrl}
                className="bg-feishu-blue hover:bg-feishu-hover text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center space-x-2"
              >
                {isFeishuLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>正在同步...</span>
                  </>
                ) : (
                  <span>获取并质检</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
