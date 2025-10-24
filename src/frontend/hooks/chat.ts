// Function to sanitize the model content as early as possible
const sanitizeModelThinkingContent = (content: string): string => {
  if (!content) return "";
  
  try {
    // First sanitize any thinking tags that might cause rendering issues
    return content
      // Replace <think> tags and their content (multiline)
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      // Handle self-closing think tags
      .replace(/<think\s*\/>/g, "")
      // Handle any remaining opening or closing think tags with attributes
      .replace(/<\/?think[^>]*>/g, "")
      // Handle potential malformed tags
      .replace(/think>[\s\S]*?<\/think/g, "")
      // Handle with capital T as well
      .replace(/<Think>[\s\S]*?<\/Think>/g, "")
      .replace(/<\/?Think[^>]*>/g, "");
  } catch (e) {
    console.error("Error sanitizing model content:", e);
    return content;
  }
};

const handleStreamEvent = (event: ChatResponseEvent) => {
  // ... existing code ...

  // Process TextChunk events
  if (event.type === StreamEvent.TEXT_CHUNK) {
    const textChunkEvent = event as TextChunkStream;
    let chunk = textChunkEvent.text;
    
    // For DeepSeek or any model that might use thinking tags, sanitize early
    if (model.includes("deepseek") || stateRef.current.content.includes("<think>")) {
      chunk = sanitizeModelThinkingContent(chunk);
    }
    
    // Add the chunk to the content
    stateRef.current.content += chunk;
    
    // Update the streaming message
    setStreamingMessage({
      ...stateRef.current,
    });
    
    // If not already streaming, set streaming to true
    if (!isStreamingMessage) {
      setIsStreamingMessage(true);
    }
  }
  
  // ... rest of the existing code ...
} 