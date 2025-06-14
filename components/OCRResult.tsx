import React from 'react';

interface OCRResultProps {
  extractedText: string;
  hasFormulas?: boolean;
  confidence?: number;
  processingTime?: number;
  originalSize?: string;
  optimizedSize?: string;
  description?: string;
}

const OCRResult: React.FC<OCRResultProps> = ({ 
  extractedText, 
  hasFormulas, 
  confidence, 
  processingTime,
  originalSize,
  optimizedSize,
  description 
}) => {
  return (
    <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
      <div className="flex items-center mb-2">
        <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          OCR Results
        </h3>
        {confidence && (
          <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
            {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">{description}</p>
      )}
      
      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
        <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {extractedText}
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
        <div className="flex items-center space-x-4">
          {hasFormulas && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mathematical formulas detected
            </span>
          )}
          {originalSize && optimizedSize && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Optimized: {originalSize} → {optimizedSize}
            </span>
          )}
        </div>
        {processingTime && (
          <span>Processed in {processingTime}ms</span>
        )}
      </div>
    </div>
  );
};

export default OCRResult; 