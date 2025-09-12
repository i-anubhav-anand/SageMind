CHAT_PROMPT = """\
Generate a comprehensive and informative answer for a given question based on the provided web Search Results (URL, Page Title, Summary). Only use information from the provided search results. Use an unbiased and journalistic tone.

Cite the answer using [number] notation. Cite sentences with their relevant citation number. Place citations at the end of the sentence. You can do multiple citations in a row with the format [number1][number2].

For scientific topics (like astronomy and lunar eclipses):
1. Include specific dates, times, and locations when available
2. Explain the phenomenon in clear, accessible language
3. Structure your response with headings for different aspects (e.g., "Next Lunar Eclipse", "Viewing Information")

ONLY cite inline.
DO NOT include a reference section, DO NOT include URLs.
DO NOT repeat the question.


You can use markdown formatting. You should include bullets to list the information in your answer.

<context>
{my_context}
</context>
---------------------

Make sure to match the language of the user's question.

Question: {my_query}
Answer (use markdown formatting with headings, bullets, and tables when appropriate): \
"""

RELATED_QUESTION_PROMPT = """\
Given a question and search result context, generate 3 follow-up questions the user might ask. Use the original question and context.

Instructions:
- Generate exactly 3 questions.
- These questions should be concise, and simple.
- Ensure the follow-up questions are relevant to the original question and context.
Make sure to match the language of the user's question.

Original Question: {query}
<context>
{context}
</context>

Output:
related_questions: A list of EXACTLY three concise, simple follow-up questions
"""

HISTORY_QUERY_REPHRASE = """
Given the following conversation and a follow up input, rephrase the follow up into a SHORT, \
standalone query (which captures any relevant context from previous messages).
IMPORTANT: EDIT THE QUERY TO BE CONCISE. Respond with a short, compressed phrase. \
If there is a clear change in topic, disregard the previous messages.
Strip out any information that is not relevant for the retrieval task.

Chat History:
{chat_history}

Make sure to match the language of the user's question.

Follow Up Input: {question}
Standalone question (Respond with only the short combined query):
""".strip()


QUERY_PLAN_PROMPT = """\
I need a simple search plan to answer this query: {query}

Create EXACTLY 2 steps:
1. First step to research the key information
2. Second step to summarize and answer the question

RESPOND ONLY WITH THIS FORMAT (just raw JSON, nothing else):
{{
  "steps": [
    {{
      "id": 0,
      "step": "Research information about {query}",
      "dependencies": []
    }},
    {{
      "id": 1, 
      "step": "Summarize findings to answer the query",
      "dependencies": [0]
    }}
  ]
}}

VERY IMPORTANT:
- Return valid, properly formatted JSON
- Include the outer "steps" array
- Include exactly these fields: id, step, dependencies
- Do not add explanations or text outside the JSON
- Do not use markdown code blocks
"""

SEARCH_QUERY_PROMPT = """\
Generate search queries to gather information for executing the given step.

You will be provided with:
1. A specific step to execute
2. The user's original query
3. Context from previous steps (if available)

Use this information to create targeted search queries that will help complete the current step effectively.

IMPORTANT: Create specific and focused search queries. For example, if researching about lunar eclipses, use queries like "next lunar eclipse dates 2024" or "upcoming lunar eclipse schedule".

Input:
---
User's original query: {user_query}
---
Context from previous steps:
{prev_steps_context}

Current step to execute: {current_step}
---

RESPOND IN THIS FORMAT:
{{
  "search_queries": [
    "first search query here",
    "second search query here",
    "third search query here"
  ]
}}

VERY IMPORTANT:
- Return valid, properly formatted JSON 
- Include the outer "search_queries" array
- Include 2-3 specific, focused search queries
- Do not add explanations or text outside the JSON
"""
