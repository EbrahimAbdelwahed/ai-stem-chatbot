import React, { useState } from 'react';

interface CodePreviewProps {
  code: string;
  jsx?: string;
}

// Component that displays both the code and its live preview
export default function CodePreview({ code, jsx }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  
  // For real implementation, you'd use something like React's dynamic import
  // or libraries like react-live to render the JSX
  const PreviewContent = () => {
    if (!jsx) {
      return (
        <div className="flex h-full items-center justify-center text-gray-400">
          <p>No preview available yet</p>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full overflow-auto p-6">
        {/* This would be replaced with actual dynamic component rendering */}
        <div 
          className="preview-container bg-gray-900 p-4 rounded-lg border border-gray-800"
          dangerouslySetInnerHTML={{ __html: jsx }} 
        />
      </div>
    );
  };
  
  const CodeContent = () => {
    if (!code) {
      return (
        <div className="flex h-full items-center justify-center text-gray-400">
          <p>No code generated yet</p>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full overflow-auto">
        <pre className="p-4 text-sm font-mono text-gray-300 bg-gray-900 rounded-lg">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-800">
        <button
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'preview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
        <button
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'code'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
        <div className="ml-auto flex items-center pr-4">
          <button
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
            title="Copy code"
            onClick={() => {
              if (code) {
                navigator.clipboard.writeText(code);
              }
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? <PreviewContent /> : <CodeContent />}
      </div>
    </div>
  );
} 