import asyncio
from typing import Optional

from backend.llm.base import EveryLLM
from backend.constants import get_model_string
from backend.schemas import ChatModel

# Prompt for generating short, descriptive chat titles
TITLE_GENERATION_PROMPT = """Based on the following conversation, generate a very short, descriptive title (maximum 6-8 words) that captures the main topic or question being discussed. The title should be clear, concise, and helpful for identifying this conversation later.

Conversation:
User: {user_message}
Assistant: {assistant_message}

Generate only the title, nothing else. Do not use quotes or special formatting.

Examples:
- "Steps to start a small business"
- "Travel tips for visiting Japan in winter"
- "How to handle difficult work conversations"
- "Exploring creative writing prompts and themes"
- "Understanding basic health insurance terms"

Title:"""


async def generate_chat_title(
    user_message: str, 
    assistant_message: str, 
    model: ChatModel = ChatModel.GPT_4o_mini
) -> Optional[str]:
    """
    Generate a short, descriptive title for a chat conversation using LLM.
    
    Args:
        user_message: The user's question/message
        assistant_message: The assistant's response  
        model: The model to use for title generation
        
    Returns:
        Generated title string or None if generation fails
    """
    try:
        model_name = get_model_string(model)
        llm = EveryLLM(model=model_name)
        
        # Truncate messages if they're too long to avoid token limits
        user_truncated = user_message[:500] if len(user_message) > 500 else user_message
        assistant_truncated = assistant_message[:1000] if len(assistant_message) > 1000 else assistant_message
        
        formatted_prompt = TITLE_GENERATION_PROMPT.format(
            user_message=user_truncated,
            assistant_message=assistant_truncated
        )
        
        # Use sync completion for title generation (simpler)
        response = llm.complete(formatted_prompt)
        title = response.text.strip()
        
        # Clean up the title
        title = title.replace('"', '').replace("'", '').strip()
        
        # Ensure title isn't too long
        if len(title) > 100:
            title = title[:97] + "..."
            
        # Don't return empty or too short titles
        if len(title) < 3:
            return None
            
        return title
        
    except Exception as e:
        print(f"Error generating chat title: {e}")
        return None


def generate_chat_title_sync(
    user_message: str, 
    assistant_message: str, 
    model: ChatModel = ChatModel.GPT_4o_mini
) -> Optional[str]:
    """
    Synchronous version of generate_chat_title for use in non-async contexts.
    """
    try:
        # Run the async function in a new event loop
        return asyncio.run(generate_chat_title(user_message, assistant_message, model))
    except Exception as e:
        print(f"Error in sync title generation: {e}")
        return None 