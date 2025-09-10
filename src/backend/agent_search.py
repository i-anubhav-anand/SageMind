# This code is messy, this was originally an experiment
import asyncio
from typing import AsyncIterator

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.chat import rephrase_query_with_history
from backend.constants import get_model_string
from backend.db.chat import save_turn_to_db
from backend.llm.base import BaseLLM, EveryLLM
from backend.prompts import CHAT_PROMPT, QUERY_PLAN_PROMPT, SEARCH_QUERY_PROMPT
from backend.related_queries import generate_related_queries
from backend.schemas import (
    AgentFinishStream,
    AgentQueryPlanStream,
    AgentReadResultsStream,
    AgentSearchFullResponse,
    AgentSearchQueriesStream,
    AgentSearchStep,
    AgentSearchStepStatus,
    BeginStream,
    ChatRequest,
    ChatResponseEvent,
    FinalResponseStream,
    RelatedQueriesStream,
    SearchResponse,
    SearchResult,
    SearchResultStream,
    StreamEndStream,
    StreamEvent,
    TextChunkStream,
)
from backend.search.search_service import perform_search
from backend.utils import PRO_MODE_ENABLED, is_local_model


class QueryPlanStep(BaseModel):
    id: int = Field(..., description="Unique id of the step")
    step: str
    dependencies: list[int] = Field(
        ...,
        description="List of step ids that this step depends on information from",
        default_factory=list,
    )
    
    @classmethod
    def model_validate_json(cls, json_data, *args, **kwargs):
        """Add pre-processing for the JSON validation to handle common issues."""
        try:
            import json
            import re
            
            # Handle multi-line arrays in dependencies
            if isinstance(json_data, str):
                json_data = re.sub(r'"dependencies"\s*:\s*\[\s*\n\s*(\d+)\s*\n\s*\]', r'"dependencies": [\1]', json_data)
            
            return super().model_validate_json(json_data, *args, **kwargs)
        except Exception:
            # If our pre-processing fails, try the original method
            return super().model_validate_json(json_data, *args, **kwargs)


class QueryPlan(BaseModel):
    steps: list[QueryPlanStep] = Field(
        ..., description="The steps to execute the query", min_length=1, max_length=5
    )
    
    @classmethod
    def model_validate_json(cls, json_data, *args, **kwargs):
        """Add pre-processing for the JSON validation to handle common issues."""
        try:
            import json
            import re

            # Handle string issues
            if isinstance(json_data, str):
                print(f"QueryPlan raw input: {json_data[:200]}...")
                
                # Clean and standardize
                json_data = json_data.strip()
                if json_data.startswith('```') and json_data.endswith('```'):
                    json_data = re.sub(r'^```(?:json)?|```$', '', json_data).strip()
                
                # Try to parse the JSON as is
                try:
                    parsed_data = json.loads(json_data)
                    
                    # If the JSON has a 'steps' key that is a list, use it
                    if isinstance(parsed_data, dict) and 'steps' in parsed_data and isinstance(parsed_data['steps'], list):
                        # Ensure each step has the required fields
                        for step in parsed_data['steps']:
                            if 'id' not in step or 'step' not in step:
                                # Add missing fields with defaults
                                if 'id' not in step and 'step_number' in step:
                                    step['id'] = step['step_number']
                                elif 'id' not in step:
                                    step['id'] = parsed_data['steps'].index(step)
                                    
                                if 'step' not in step and 'text' in step:
                                    step['step'] = step['text']
                                elif 'step' not in step and 'description' in step:
                                    step['step'] = step['description']
                                    
                                if 'dependencies' not in step:
                                    step['dependencies'] = []
                        
                        json_data = json.dumps(parsed_data)
                    # If we have a list directly, wrap it as steps
                    elif isinstance(parsed_data, list):
                        # Ensure each item in the list has the required fields
                        for i, step in enumerate(parsed_data):
                            if isinstance(step, dict):
                                if 'id' not in step:
                                    step['id'] = i
                                if 'step' not in step and 'text' in step:
                                    step['step'] = step['text']
                                if 'dependencies' not in step:
                                    step['dependencies'] = []
                        
                        json_data = json.dumps({"steps": parsed_data})
                except Exception as e:
                    print(f"Failed to parse JSON: {e}")
                    # Continue with regex-based extraction below
                
                # Handle the case where we get a single object instead of an array
                if json_data.startswith('{') and ('id' in json_data or 'step' in json_data) and 'steps' not in json_data:
                    print("Converting single QueryPlanStep object to array...")
                    json_data = f'{{"steps": [{json_data}]}}'
                
                # Fix bad indentation or formatting
                json_data = re.sub(r'"dependencies"\s*:\s*\[\s*\n\s*(\d+)\s*\n\s*\]', r'"dependencies": [\1]', json_data)
                json_data = re.sub(r',\s*\n\s*}', '}', json_data)
                
                # As a last resort, try to create a minimal valid structure
                try:
                    parsed = json.loads(json_data)
                except:
                    # If we can't parse it at all, create a minimal structure
                    print("Creating fallback QueryPlan structure...")
                    # Extract any text that looks like a search step
                    steps_text = re.findall(r'"([^"]+?(?:search|research|find|look|investigate)[^"]+)"', json_data)
                    if not steps_text:
                        steps_text = re.findall(r'"([^"]+)"', json_data)
                    
                    if steps_text:
                        fallback_steps = []
                        for i, text in enumerate(steps_text[:3]):  # Limit to 3 steps
                            fallback_steps.append({"id": i, "step": text, "dependencies": []})
                        json_data = json.dumps({"steps": fallback_steps})
                    else:
                        # Absolute last resort
                        json_data = '{"steps": [{"id": 0, "step": "Search for the information", "dependencies": []}]}'
            
            return super().model_validate_json(json_data, *args, **kwargs)
        except Exception as e:
            print(f"Error in QueryPlan model_validate_json: {e}")
            # If our pre-processing fails, try to create a minimal valid structure
            try:
                fallback_json = '{"steps": [{"id": 0, "step": "Search for information about this topic", "dependencies": []}]}'
                return super().model_validate_json(fallback_json, *args, **kwargs)
            except:
                # If that fails too, escalate the error
                raise
            
    @classmethod
    def extract_steps_from_text(cls, text):
        """Extract steps directly from text, bypassing JSON parsing.
        
        This is a fallback mechanism for when all other parsing methods fail.
        It attempts to extract step information directly using regex patterns.
        """
        import re
        
        print(f"Attempting direct extraction from text: {text[:200]}...")
        steps = []
        
        # Try to extract steps with this pattern: {"id": NUMBER, "step": "TEXT", "dependencies": [NUMBERS]}
        step_pattern = re.compile(r'{\s*"id"\s*:\s*(\d+)\s*,\s*"step"\s*:\s*"([^"]+)"\s*,\s*"dependencies"\s*:\s*(\[[^\]]*\])', re.DOTALL)
        matches = step_pattern.findall(text)
        
        if not matches:
            # Try with a more flexible pattern
            step_pattern = re.compile(r'"id"\s*:\s*(\d+).*?"step"\s*:\s*"([^"]+)".*?"dependencies"\s*:\s*(\[[^\]]*\]|\[\])', re.DOTALL)
            matches = step_pattern.findall(text)
        
        if matches:
            for id_str, step_text, dependencies_str in matches:
                try:
                    # Clean dependencies string
                    clean_deps = dependencies_str.replace('\n', '').replace(' ', '')
                    if clean_deps == '[]':
                        deps = []
                    else:
                        # Handle various formats of dependencies
                        nums = re.findall(r'\d+', clean_deps)
                        deps = [int(num) for num in nums]
                    
                    steps.append(QueryPlanStep(
                        id=int(id_str),
                        step=step_text,
                        dependencies=deps
                    ))
                except Exception as e:
                    print(f"Error processing step: {e}")
        
        if steps:
            print(f"Successfully extracted {len(steps)} steps directly from text")
            return cls(steps=steps)
        
        # If we couldn't extract steps, try a last resort approach
        # Look for anything that looks like a step definition
        step_texts = re.findall(r'"step"\s*:\s*"([^"]+)"', text)
        if step_texts:
            print(f"Extracted {len(step_texts)} step texts as last resort")
            steps = [
                QueryPlanStep(id=i, step=step_text, dependencies=[max(0, i-1)] if i > 0 else [])
                for i, step_text in enumerate(step_texts)
            ]
            return cls(steps=steps)
        
        # If all else fails, create a generic plan
        print("Creating generic fallback plan")
        return cls(steps=[
            QueryPlanStep(id=0, step="Research information about the query", dependencies=[]),
            QueryPlanStep(id=1, step="Summarize findings to answer the query", dependencies=[0])
        ])


class QueryStepExecution(BaseModel):
    search_queries: list[str] | None = Field(
        ...,
        description="The search queries to complete the step",
        min_length=1,
        max_length=3,
    )
    
    @classmethod
    def model_validate_json(cls, json_data, *args, **kwargs):
        """Add pre-processing for the JSON validation to handle common issues."""
        try:
            import json
            import re
            
            # Handle string issues
            if isinstance(json_data, str):
                # If it looks like an array of strings directly without object wrapper
                if re.match(r'\s*\[\s*".*"\s*.*\]', json_data):
                    try:
                        string_list = json.loads(json_data)
                        if isinstance(string_list, list) and all(isinstance(s, str) for s in string_list):
                            json_data = f'{{"search_queries": {json_data}}}'
                    except:
                        pass
                        
                # Fix escaped quotes in strings
                json_data = re.sub(r'\\+"', '"', json_data)
            
            return super().model_validate_json(json_data, *args, **kwargs)
        except Exception:
            # If our pre-processing fails, try the original method
            return super().model_validate_json(json_data, *args, **kwargs)


class StepContext(BaseModel):
    step: str
    context: str


def format_step_context(step_contexts: list[StepContext]) -> str:
    return "\n".join(
        [f"Step: {step.step}\nContext: {step.context}" for step in step_contexts]
    )


async def ranked_search_results_and_images_from_queries(
    queries: list[str],
) -> tuple[list[SearchResult], list[str]]:
    search_responses: list[SearchResponse] = await asyncio.gather(
        *(perform_search(query) for query in queries)
    )
    all_search_results = [response.results for response in search_responses]
    all_images = [response.images for response in search_responses]

    # interleave the search results, for fair ranking
    ranked_results: list[SearchResult] = [
        result for results in zip(*all_search_results) for result in results if result
    ]
    unique_results = list({result.url: result for result in ranked_results}.values())

    images = list({image: image for images in all_images for image in images}.values())
    return unique_results, images


def build_context_from_search_results(search_results: list[SearchResult]) -> str:
    context = "\n".join(str(result) for result in search_results)
    return context[:7000]


def format_context_with_steps(
    search_results_map: dict[int, list[SearchResult]],
    step_contexts: dict[int, StepContext],
) -> str:
    context = "\n".join(
        f"Everything below is context for step: {step_contexts[step_id].step}\nContext: {build_context_from_search_results(search_results_map[step_id])}\n{'-'*20}\n"
        for step_id in sorted(step_contexts.keys())
    )
    context = context[:10000]
    return context


async def stream_pro_search_objects(
    request: ChatRequest, llm: BaseLLM, query: str, session: Session
) -> AsyncIterator[ChatResponseEvent]:
    try:
        query_plan_prompt = QUERY_PLAN_PROMPT.format(query=query)
        query_plan = llm.structured_complete(
            response_model=QueryPlan, prompt=query_plan_prompt
        )
        print(query_plan)

        yield ChatResponseEvent(
            event=StreamEvent.AGENT_QUERY_PLAN,
            data=AgentQueryPlanStream(steps=[step.step for step in query_plan.steps]),
        )

        step_context: dict[int, StepContext] = {}
        search_result_map: dict[int, list[SearchResult]] = {}
        image_map: dict[int, list[str]] = {}
        agent_search_steps: list[AgentSearchStep] = []

        for idx, step in enumerate(query_plan.steps):
            step_id = step.id
            is_last_step = idx == len(query_plan.steps) - 1
            dependencies = step.dependencies

            relevant_context = [step_context[id] for id in dependencies]

            if not is_last_step:
                search_prompt = SEARCH_QUERY_PROMPT.format(
                    user_query=query,
                    current_step=step.step,
                    prev_steps_context=format_step_context(relevant_context),
                )
                try:
                    query_step_execution = llm.structured_complete(
                        response_model=QueryStepExecution, prompt=search_prompt
                    )
                    search_queries = query_step_execution.search_queries
                    if not search_queries:
                        raise HTTPException(
                            status_code=500,
                            detail="There was an error generating the search queries",
                        )
                except Exception as e:
                    print(f"Error in structured_complete for query step: {str(e)}")
                    search_queries = [f"Search for information about: {step.step}"]
            
                yield ChatResponseEvent(
                    event=StreamEvent.AGENT_SEARCH_QUERIES,
                    data=AgentSearchQueriesStream(
                        queries=search_queries, step_number=step_id
                    ),
                )

                (
                    search_results,
                    image_results,
                ) = await ranked_search_results_and_images_from_queries(search_queries)
                search_result_map[step_id] = search_results
                image_map[step_id] = image_results

                yield ChatResponseEvent(
                    event=StreamEvent.AGENT_READ_RESULTS,
                    data=AgentReadResultsStream(
                        results=search_results, step_number=step_id
                    ),
                )
                context = build_context_from_search_results(search_results)
                step_context[step_id] = StepContext(step=step.step, context=context)

                agent_search_steps.append(
                    AgentSearchStep(
                        step_number=step_id,
                        step=step.step,
                        queries=search_queries,
                        results=search_results,
                        status=AgentSearchStepStatus.DONE,
                    )
                )
            else:
                yield ChatResponseEvent(
                    event=StreamEvent.AGENT_FINISH,
                    data=AgentFinishStream(),
                )

                yield ChatResponseEvent(
                    event=StreamEvent.BEGIN_STREAM,
                    data=BeginStream(query=query),
                )

                # Get 12 results total, but distribute them evenly across dependencies
                relevant_result_map: dict[int, list[SearchResult]] = {
                    id: search_result_map[id] for id in dependencies
                }
                DESIRED_RESULT_COUNT = 12
                total_results = sum(
                    len(results) for results in relevant_result_map.values()
                )
                results_per_dependency = min(
                    DESIRED_RESULT_COUNT // len(dependencies),
                    total_results // len(dependencies),
                )
                for id in dependencies:
                    relevant_result_map[id] = search_result_map[id][:results_per_dependency]

                search_results = [
                    result for results in relevant_result_map.values() for result in results
                ]

                # Remove duplicates
                search_results = list(
                    {result.url: result for result in search_results}.values()
                )
                images = [image for id in dependencies for image in image_map[id][:2]]

                related_queries_task = None
                if not is_local_model(request.model):
                    related_queries_task = asyncio.create_task(
                        generate_related_queries(query, search_results, llm)
                    )

                yield ChatResponseEvent(
                    event=StreamEvent.SEARCH_RESULTS,
                    data=SearchResultStream(
                        results=search_results,
                        images=images,
                    ),
                )

                fmt_qa_prompt = CHAT_PROMPT.format(
                    my_context=format_context_with_steps(search_result_map, step_context),
                    my_query=query,
                )

                full_response = ""
                response_gen = await llm.astream(fmt_qa_prompt)
                async for completion in response_gen:
                    full_response += completion.delta or ""
                    yield ChatResponseEvent(
                        event=StreamEvent.TEXT_CHUNK,
                        data=TextChunkStream(text=completion.delta or ""),
                    )

                related_queries = await (
                    related_queries_task
                    if related_queries_task
                    else generate_related_queries(query, search_results, llm)
                )

                yield ChatResponseEvent(
                    event=StreamEvent.RELATED_QUERIES,
                    data=RelatedQueriesStream(related_queries=related_queries),
                )

                yield ChatResponseEvent(
                    event=StreamEvent.FINAL_RESPONSE,
                    data=FinalResponseStream(message=full_response),
                )

                agent_search_steps.append(
                    AgentSearchStep(
                        step_number=step_id,
                        step=step.step,
                        queries=[],
                        results=[],
                        status=AgentSearchStepStatus.DONE,
                    )
                )

                thread_id = save_turn_to_db(
                    session=session,
                    thread_id=request.thread_id,
                    user_message=request.query,
                    assistant_message=full_response,
                    agent_search_full_response=AgentSearchFullResponse(
                        steps=[step.step for step in agent_search_steps],
                        steps_details=agent_search_steps,
                    ),
                    model=request.model,
                    search_results=search_results,
                    image_results=images,
                    related_queries=related_queries,
                )

                yield ChatResponseEvent(
                    event=StreamEvent.STREAM_END,
                    data=StreamEndStream(thread_id=thread_id),
                )
                return

    except Exception as e:
        # If there's any error in the Pro Search, fall back to regular search
        print(f"Error in Pro Search mode, falling back to regular search: {str(e)}")
        yield ChatResponseEvent(
            event=StreamEvent.BEGIN_STREAM,
            data=BeginStream(query=query),
        )
        
        # Do a simple single search instead
        search_results, image_results = await ranked_search_results_and_images_from_queries([query])
        
        yield ChatResponseEvent(
            event=StreamEvent.SEARCH_RESULTS,
            data=SearchResultStream(
                results=search_results,
                images=image_results,
            ),
        )
        
        fmt_qa_prompt = CHAT_PROMPT.format(
            my_context=build_context_from_search_results(search_results),
            my_query=query,
        )

        full_response = ""
        response_gen = await llm.astream(fmt_qa_prompt)
        async for completion in response_gen:
            full_response += completion.delta or ""
            yield ChatResponseEvent(
                event=StreamEvent.TEXT_CHUNK,
                data=TextChunkStream(text=completion.delta or ""),
            )
            
        # Generate related queries
        related_queries = await generate_related_queries(query, search_results, llm)
        
        yield ChatResponseEvent(
            event=StreamEvent.RELATED_QUERIES,
            data=RelatedQueriesStream(related_queries=related_queries),
        )
        
        yield ChatResponseEvent(
            event=StreamEvent.FINAL_RESPONSE,
            data=FinalResponseStream(message=full_response),
        )
        
        thread_id = save_turn_to_db(
            session=session,
            thread_id=request.thread_id,
            user_message=request.query,
            assistant_message=full_response,
            model=request.model,
            search_results=search_results,
            image_results=image_results,
            related_queries=related_queries,
        )
        
        yield ChatResponseEvent(
            event=StreamEvent.STREAM_END,
            data=StreamEndStream(thread_id=thread_id),
        )
        return


async def stream_pro_search_qa(
    request: ChatRequest, session: Session
) -> AsyncIterator[ChatResponseEvent]:
    try:
        if not PRO_MODE_ENABLED:
            raise HTTPException(
                status_code=400,
                detail="Pro mode is not enabled. Please self-host to enable it.",
            )

        model_name = get_model_string(request.model)
        llm = EveryLLM(model=model_name)

        query = rephrase_query_with_history(request.query, request.history, llm)
        async for event in stream_pro_search_objects(request, llm, query, session):
            yield event
            await asyncio.sleep(0)

    except Exception as e:
        detail = str(e)
        raise HTTPException(status_code=500, detail=detail)
