"use client"

import type React from "react"
import { type FC, memo, useEffect, useState } from "react"
import { MemoizedReactMarkdown } from "./markdown"
import rehypeRaw from "rehype-raw"
import { Skeleton } from "./ui/skeleton"
import type { ChatMessage } from "../generated/types.gen"
import { rehypeSanitizeTags } from "./rehype-plugins/rehype-sanitize-tags"

export interface MessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

// Improve type safety for the citation function
const CitationText = ({ number, href }: { number: number; href: string }): string => {
  return `
  <button className="select-none no-underline">
  <a className="" href="${href}" target="_blank" rel="noopener noreferrer">
        <span className="relative -top-[0rem] inline-flex">
          <span className="h-[1rem] min-w-[1rem] items-center justify-center rounded-full text-center px-1 text-xs font-mono bg-muted text-[0.60rem] text-muted-foreground">
            ${number}
          </span>
        </span>
      </a>
    </button>`
}

// Simple components that don't try to animate individual words
const Paragraph = memo(({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => {
  return <p {...props}>{children}</p>
})

const ListItem = memo(({ children, ...props }: React.HTMLProps<HTMLLIElement>) => {
  return <li {...props}>{children}</li>
})

Paragraph.displayName = "Paragraph"
ListItem.displayName = "ListItem"

// Add a function to process the content and extract <think> tags instead of removing them
function extractThinkingContent(content: string): { processedContent: string; thinkingContent: string[] } {
  if (!content) return { processedContent: "", thinkingContent: [] };
  
  try {
    const thinkingContent: string[] = [];
    
    // Extract content within <think> tags
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let match;
    let processedContent = content;
    
    while ((match = thinkRegex.exec(content)) !== null) {
      // Store the thinking content
      if (match[1] && match[1].trim()) {
        thinkingContent.push(match[1].trim());
      }
    }
    
    // Now remove all think tags for the processed content - more aggressive pattern matching
    processedContent = processedContent
      // Remove think tags and their content (multiline)
      .replace(/<think\b[^>]*>[\s\S]*?<\/think\b[^>]*>/g, "")
      // Remove self-closing think tags
      .replace(/<think\b[^>]*\/>/g, "")
      // Handle malformed opening think tags
      .replace(/<think\b[^>]*>/g, "")
      // Handle malformed closing think tags
      .replace(/<\/think\b[^>]*>/g, "")
      // Extra insurance: Remove any think tags that might have slipped through
      .replace(/<\/?think[^>]*>/gi, "")
      // Handle potential think text without proper tags
      .replace(/think>[\s\S]*?<\/think/g, "")
      // Handle Think with capital T
      .replace(/<Think\b[^>]*>[\s\S]*?<\/Think\b[^>]*>/g, "")
      .replace(/<Think\b[^>]*\/>/g, "")
      .replace(/<Think\b[^>]*>/g, "")
      .replace(/<\/Think\b[^>]*>/g, "")
      .replace(/<\/?Think[^>]*>/gi, "");
      
    return { processedContent, thinkingContent };
  } catch (e) {
    console.error("Error extracting thinking content:", e);
    // Return original content if there's an error, but with all think tags removed
    return { 
      processedContent: sanitizeModelContent(content), 
      thinkingContent: [] 
    };
  }
}

// Original sanitization function still needed for complete removal in some cases
function sanitizeModelContent(content: string): string {
  if (!content) return "";
  
  try {
    // More aggressive pattern matching to ensure all think tags are removed
    let sanitized = content
      .replace(/<think\b[^>]*>[\s\S]*?<\/think\b[^>]*>/g, "")
      .replace(/<think\b[^>]*\/>/g, "")
      .replace(/<think\b[^>]*>/g, "")
      .replace(/<\/think\b[^>]*>/g, "")
      .replace(/<\/?think[^>]*>/gi, "")
      .replace(/think>[\s\S]*?<\/think/g, "")
      .replace(/<Think\b[^>]*>[\s\S]*?<\/Think\b[^>]*>/g, "")
      .replace(/<Think\b[^>]*\/>/g, "")
      .replace(/<Think\b[^>]*>/g, "")
      .replace(/<\/Think\b[^>]*>/g, "")
      .replace(/<\/?Think[^>]*>/gi, "");
      
    return sanitized;
  } catch (e) {
    console.error("Error sanitizing model content:", e);
    // If there's an error, do a simple string replacement as a last resort
    return content
      .replace(/<think/gi, "&lt;think")
      .replace(/<\/think/gi, "&lt;/think")
      .replace(/<Think/gi, "&lt;Think")
      .replace(/<\/Think/gi, "&lt;/Think");
  }
}

export const MessageComponent: FC<MessageProps> = ({ message, isStreaming = false }) => {
  const { content, sources } = message
  const [parsedMessage, setParsedMessage] = useState<string>(content || "")
  const [thinkingContent, setThinkingContent] = useState<string[]>([])
  const [showThinking, setShowThinking] = useState<boolean>(false)
  const [renderError, setRenderError] = useState<boolean>(false)

  // Final safety check to ensure no think tags render
  const safeRender = (content: string): string => {
    // This function ensures no think tags slip through
    return content
      .replace(/<think/gi, "&lt;think")
      .replace(/<\/think/gi, "&lt;/think")
      .replace(/<Think/gi, "&lt;Think")
      .replace(/<\/Think/gi, "&lt;/Think");
  };

  // Check if content has thinking tags
  const hasThinkTag = content && (
    content.includes("<think") || 
    content.includes("</think") || 
    content.includes("<Think") || 
    content.includes("</Think")
  );

  useEffect(() => {
    try {
      // If there are thinking tags, extract them instead of just removing
      if (hasThinkTag) {
        const { processedContent, thinkingContent } = extractThinkingContent(content);
        
        // Process citations
        const citationRegex = /(\[\d+\])/g;
        const newMessage = processedContent.replace(citationRegex, (match) => {
          const number = match.slice(1, -1);
          const source = sources?.find((source: { url: string }, idx: number) => idx + 1 === Number.parseInt(number));
          return CitationText({
            number: Number.parseInt(number),
            href: source?.url ?? "",
          });
        });
        
        // Final safety check before storing
        setParsedMessage(safeRender(newMessage));
        setThinkingContent(thinkingContent);
        setRenderError(false);
      } else {
        // No thinking tags, just process citations
        const citationRegex = /(\[\d+\])/g;
        const newMessage = content.replace(citationRegex, (match) => {
          const number = match.slice(1, -1);
          const source = sources?.find((source: { url: string }, idx: number) => idx + 1 === Number.parseInt(number));
          return CitationText({
            number: Number.parseInt(number),
            href: source?.url ?? "",
          });
        });
        
        // Still run the safety check just in case
        setParsedMessage(safeRender(newMessage));
        setThinkingContent([]);
        setRenderError(false);
      }
    } catch (error) {
      console.error("Error processing message content:", error);
      // Fallback to a simplified version without markdown
      setParsedMessage(safeRender(sanitizeModelContent(content || "")));
      setThinkingContent([]);
      setRenderError(true);
    }
  }, [content, sources, hasThinkTag]);

  // If there was a rendering error, use a simpler display method
  if (renderError) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {sanitizeModelContent(content) || ""}
      </div>
    );
  }

  return (
    <div>
      <div className={isStreaming ? "animate-pulse" : ""}>
        <MemoizedReactMarkdown
          components={{
            p: Paragraph,
            li: ListItem,
          }}
          className="prose dark:prose-invert inline leading-relaxed break-words"
          rehypePlugins={[rehypeSanitizeTags, rehypeRaw]}
          remarkPlugins={[]}
        >
          {parsedMessage}
        </MemoizedReactMarkdown>
      </div>
      
      {/* Thinking content dropdown */}
      {thinkingContent.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-all duration-200"
          >
            <span>{showThinking ? "Hide" : "Show"} Model Thinking</span>
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
              className={`transition-transform duration-200 ${showThinking ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {showThinking && (
            <div className="mt-2 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">Model Thinking Process:</h3>
              <div className="space-y-2">
                {thinkingContent.map((thought, index) => (
                  <div key={`thinking-${index}`} className="whitespace-pre-wrap text-sm break-words text-slate-700 dark:text-slate-300">
                    {safeRender(thought)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MessageComponentSkeleton = () => {
  return (
    <>
      <Skeleton className="w-full py-4 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
        <div className="flex flex-col gap-4">
          <Skeleton className="mx-5 h-2 bg-indigo-200/50 dark:bg-indigo-700/30" />
          <Skeleton className="mx-5 h-2 bg-indigo-200/50 dark:bg-indigo-700/30 mr-20" />
          <Skeleton className="mx-5 h-2 bg-indigo-200/50 dark:bg-indigo-700/30 mr-40" />
        </div>
      </Skeleton>
    </>
  )
}

