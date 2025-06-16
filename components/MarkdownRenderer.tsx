'use client';

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  darkMode?: boolean;
}

const MarkdownRenderer = memo(({ content, className = '', darkMode = true }: MarkdownRendererProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const processedContent = useMemo(() => {
    let cleanedContent = content?.trim() || '';
    
    // Enhanced math delimiter processing
    // Ensure proper spacing around block math
    cleanedContent = cleanedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      const trimmedMath = mathContent.trim();
      return `\n\n$$${trimmedMath}$$\n\n`;
    });
    
    // Ensure inline math doesn't have extra spaces
    cleanedContent = cleanedContent.replace(/\$\s+(.*?)\s+\$/g, '$$$1$$');
    
    return cleanedContent;
  }, [content]);

  if (!processedContent) {
    return null;
  }

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none text-gray-100 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Custom code block rendering with copy functionality
          code({ node, inline: inlineProp, className, children, ...props }: any) {
            const inline = !className;
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <div className="relative group">
                  <button
                    onClick={() => handleCopyCode(codeString)}
                    className="absolute top-2 right-2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Copy code"
                  >
                    {copiedCode === codeString ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </button>
                  <SyntaxHighlighter
                    style={darkMode ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg"
                    customStyle={{
                      margin: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            // Inline code
            return (
              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          
          // Enhanced link handling
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                {...props}
              >
                {children}
                {isExternal && (
                  <ExternalLinkIcon className="w-3 h-3 inline ml-1" />
                )}
              </a>
            );
          },
          
          // Enhanced table styling
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          
          th({ children, ...props }) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 bg-gray-100 dark:bg-gray-800 font-semibold text-left" {...props}>
                {children}
              </th>
            );
          },
          
          td({ children, ...props }) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" {...props}>
                {children}
              </td>
            );
          },
          
          // Enhanced math block styling
          div({ className, children, ...props }) {
            if (className === 'math math-display') {
              return (
                <div 
                  className="my-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 overflow-x-auto shadow-sm" 
                  {...props}
                >
                  <div className="text-center text-lg">
                    {children}
                  </div>
                </div>
              );
            }
            return <div className={className} {...props}>{children}</div>;
          },
          
          // Enhanced inline math styling
          span({ className, children, ...props }) {
            if (className === 'math math-inline') {
              return (
                <span 
                  className="px-1.5 py-0.5 bg-blue-50 dark:bg-gray-700 rounded border border-blue-200 dark:border-gray-600 font-mono text-blue-900 dark:text-blue-100" 
                  {...props}
                >
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          },
          
          // Enhanced blockquote styling
          blockquote({ children, ...props }) {
            return (
              <blockquote 
                className="border-l-4 border-blue-500 pl-6 py-2 my-4 bg-blue-50 dark:bg-gray-800 rounded-r-lg italic text-gray-700 dark:text-gray-300"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          
          // Enhanced header styling
          h1({ children, ...props }) {
            return (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-600 pb-2" {...props}>
                {children}
              </h1>
            );
          },
          
          h2({ children, ...props }) {
            return (
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6" {...props}>
                {children}
              </h2>
            );
          },
          
          h3({ children, ...props }) {
            return (
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4" {...props}>
                {children}
              </h3>
            );
          },
          
          // Enhanced list styling with better spacing and structure
          ul({ children, ...props }) {
            return (
              <ul className="space-y-2 my-4 ml-6" {...props}>
                {children}
              </ul>
            );
          },
          
          ol({ children, ...props }) {
            return (
              <ol className="space-y-2 my-4 ml-6" {...props}>
                {children}
              </ol>
            );
          },
          
          li({ children, ...props }) {
            return (
              <li className="text-gray-700 dark:text-gray-300 leading-relaxed relative before:content-['•'] before:absolute before:-ml-4 before:text-blue-500 before:font-bold" {...props}>
                {children}
              </li>
            );
          },
          
          // Enhanced paragraph styling
          p({ children, ...props }) {
            return (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4" {...props}>
                {children}
              </p>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

// Helper Icons
const CopyIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ExternalLinkIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer; 