import { type FC, memo } from "react"
import ReactMarkdown, { type Options } from "react-markdown"

// Function to sanitize any potentially problematic HTML tags like <think>
function sanitizeHtmlTags(content: string): string {
  if (!content || typeof content !== 'string') return content;
  
  return content
    .replace(/<think/gi, "&lt;think")
    .replace(/<\/think/gi, "&lt;/think")
    .replace(/<Think/gi, "&lt;Think")
    .replace(/<\/Think/gi, "&lt;/Think");
}

// Using the recommended approach where className is applied to a wrapper div
export const MemoizedReactMarkdown: FC<Options & { className?: string }> = memo(
  ({ className, children, ...props }) => {
    // Sanitize the content before passing to ReactMarkdown
    const sanitizedChildren = typeof children === 'string' ? sanitizeHtmlTags(children) : children;
    
    if (className) {
      return (
        <div className={className}>
          <ReactMarkdown {...props}>{sanitizedChildren}</ReactMarkdown>
        </div>
      )
    }
    
    return <ReactMarkdown {...props}>{sanitizedChildren}</ReactMarkdown>
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
)

