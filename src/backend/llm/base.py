import os
import json
import re
from abc import ABC, abstractmethod

import instructor
from dotenv import load_dotenv
from instructor.client import T
from litellm import completion
from litellm.utils import validate_environment
from llama_index.core.base.llms.types import (
    CompletionResponse,
    CompletionResponseAsyncGen,
)
from llama_index.llms.litellm import LiteLLM

load_dotenv()


def repair_json(json_string):
    """Attempt to repair malformed JSON by fixing common issues."""
    try:
        # First try to parse as is
        return json.loads(json_string)
    except json.JSONDecodeError as e:
        print(f"Original JSON parse error: {str(e)}")
        print(f"Attempting to repair malformed JSON: {json_string[:200]}...")
        
        # Clean the input - remove potential markdown code markers
        json_string = re.sub(r'^```(?:json)?|```$', '', json_string.strip())
        
        try:
            # Handle case where we have a single object instead of an array
            # Pattern: starts with { and has "id": 0 pattern
            if re.match(r'\s*{', json_string) and re.search(r'"id"\s*:\s*0', json_string):
                print("Detected single object format instead of array format, converting...")
                # Convert object to array
                json_string = f"[{json_string}]"
                
            # Handle multiple objects not in an array (multiple {...} patterns)
            if not json_string.strip().startswith('[') and json_string.count('{') > 1:
                print("Detected multiple objects not in array, wrapping in array...")
                json_string = f"[{json_string}]"
            
            # Fix dependencies multi-line arrays: ["dependencies": [\n 0, \n 1 \n]]
            json_string = re.sub(r'"dependencies"\s*:\s*\[\s*\n\s*(\d+)\s*,?\s*\n\s*(\d+)?\s*\n\s*\]', 
                                lambda m: f'"dependencies": [{m.group(1)}{", " + m.group(2) if m.group(2) else ""}]', 
                                json_string)
            
            # Fix single-value multi-line arrays: ["dependencies": [\n 0 \n]]
            json_string = re.sub(r'"dependencies"\s*:\s*\[\s*\n\s*(\d+)\s*\n\s*\]', 
                                r'"dependencies": [\1]', 
                                json_string)
            
            # Fix arrays with inconsistent spacing around values
            json_string = re.sub(r'"dependencies"\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]', 
                                r'"dependencies": [\1, \2]', 
                                json_string)
            
            # Fix any misformatted dependencies arrays (handles various formats)
            json_string = re.sub(r'"dependencies"\s*:\s*("[^"]*"|[^,\]\}]+)', 
                                r'"dependencies": [\1]', 
                                json_string)
                                 
            # Remove trailing commas in objects
            json_string = re.sub(r',(\s*})', r'\1', json_string)
            
            # Remove trailing commas in arrays
            json_string = re.sub(r',(\s*])', r'\1', json_string)
            
            # Ensure proper quotes for keys
            json_string = re.sub(r'(\w+)(\s*:)', r'"\1"\2', json_string)
            
            # If we still have a single object with steps inside it
            if re.search(r'\{\s*"steps"\s*:', json_string):
                try:
                    # Try to extract the steps array directly
                    steps_match = re.search(r'"steps"\s*:\s*(\[.+?\])', json_string, re.DOTALL)
                    if steps_match:
                        extracted_steps = steps_match.group(1)
                        print(f"Extracted steps array directly: {extracted_steps[:100]}...")
                        json_string = extracted_steps
                except Exception as extract_err:
                    print(f"Steps extraction failed: {extract_err}")
            
            # If the content is an array of objects but not wrapped in { "steps": ... }
            if json_string.strip().startswith('[') and json_string.strip().endswith(']'):
                try:
                    # Try parsing as array first
                    parsed = json.loads(json_string)
                    # If it's an array of objects, wrap it in the right structure if needed
                    if isinstance(parsed, list) and all(isinstance(item, dict) for item in parsed):
                        if not any(i.get('steps') for i in parsed):  # Only if not already wrapped
                            json_string = f'{{"steps": {json_string}}}'
                except Exception as parse_err:
                    print(f"Array parsing failed: {parse_err}")
            
            print(f"Repaired JSON: {json_string[:200]}...")
            
            # Try to parse the cleaned JSON
            return json.loads(json_string)
        except Exception as repair_error:
            print(f"JSON repair failed: {repair_error}")
            
            # Last resort: try to build the JSON manually by extracting key pieces
            try:
                # Extract steps manually using regex
                steps = []
                step_pattern = re.compile(r'{\s*"id"\s*:\s*(\d+)\s*,\s*"step"\s*:\s*"([^"]+)"\s*,\s*"dependencies"\s*:\s*(\[[^\]]*\])', re.DOTALL)
                matches = step_pattern.findall(json_string)
                
                if not matches:
                    # Try with a more lenient pattern
                    step_pattern = re.compile(r'id"\s*:\s*(\d+).*?step"\s*:\s*"([^"]+)".*?dependencies"\s*:\s*(\[[^\]]*\]|\[\]|null)', re.DOTALL)
                    matches = step_pattern.findall(json_string)
                
                for id_str, step_text, dependencies_str in matches:
                    # Clean up dependencies to make sure it's valid JSON
                    clean_deps = re.sub(r'\s+', ' ', dependencies_str).strip()
                    if clean_deps == 'null' or clean_deps == '':
                        clean_deps = '[]'
                    try:
                        deps = json.loads(clean_deps)
                    except:
                        deps = []
                        
                    steps.append({
                        "id": int(id_str),
                        "step": step_text,
                        "dependencies": deps
                    })
                
                if steps:
                    return {"steps": steps}
                    
                # If we still failed, look for any JSON object patterns
                obj_pattern = re.compile(r'{[^{}]*}')
                objects = obj_pattern.findall(json_string)
                if objects:
                    # Try to salvage any valid JSON objects
                    valid_objects = []
                    for obj in objects:
                        try:
                            valid_objects.append(json.loads(obj))
                        except:
                            pass
                    if valid_objects:
                        return {"steps": valid_objects}
            except Exception as manual_error:
                print(f"Manual JSON reconstruction failed: {manual_error}")
            
            # If all else fails, raise the original error
            raise e


class BaseLLM(ABC):
    @abstractmethod
    async def astream(self, prompt: str) -> CompletionResponseAsyncGen:
        pass

    @abstractmethod
    def complete(self, prompt: str) -> CompletionResponse:
        pass

    @abstractmethod
    def structured_complete(self, response_model: type[T], prompt: str) -> T:
        pass


class EveryLLM(BaseLLM):
    def __init__(
        self,
        model: str,
    ):
        os.environ.setdefault("OLLAMA_API_BASE", "http://localhost:11434")

        validation = validate_environment(model)
        if validation["missing_keys"]:
            raise ValueError(f"Missing keys: {validation['missing_keys']}")

        self.llm = LiteLLM(model=model)
        # Use MD_JSON mode for all local models (ollama) to handle less structured outputs
        if 'ollama' in model:
            self.client = instructor.from_litellm(completion, mode=instructor.Mode.MD_JSON)
        elif 'groq' in model:
            self.client = instructor.from_litellm(completion, mode=instructor.Mode.MD_JSON)
        else:
            self.client = instructor.from_litellm(completion)

    async def astream(self, prompt: str) -> CompletionResponseAsyncGen:
        return await self.llm.astream_complete(prompt)

    def complete(self, prompt: str) -> CompletionResponse:
        return self.llm.complete(prompt)

    def structured_complete(self, response_model: type[T], prompt: str) -> T:
        # Add explicit instructions for better JSON formatting when using Ollama models
        if 'ollama' in self.llm.model:
            prompt = f"{prompt}\n\nIMPORTANT: Your response must be properly formatted JSON that can be parsed. Do not include any text outside the JSON structure. Format arrays on a single line without line breaks, like: [1, 2, 3] not as multi-line arrays."
            
            try:
                # First try with instructor
                return self.client.chat.completions.create(
                    model=self.llm.model,
                    messages=[{"role": "user", "content": prompt}],
                    response_model=response_model,
                )
            except Exception as e:
                print(f"Instructor parsing failed: {str(e)}")
                # If that fails, try with our custom JSON repair
                response = completion(
                    model=self.llm.model,
                    messages=[{"role": "user", "content": prompt}],
                )
                
                content = response.choices[0].message.content
                print(f"Raw response content: {content[:200]}...")
                
                try:
                    # Extract JSON from markdown if needed
                    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
                    if json_match:
                        json_str = json_match.group(1)
                        print(f"Extracted JSON from markdown: {json_str[:100]}...")
                    else:
                        json_str = content
                        
                    # Try to repair and parse the JSON
                    json_obj = repair_json(json_str)
                    
                    # Create an instance of the response model
                    result = response_model.model_validate(json_obj)
                    print(f"Successfully parsed with custom repair method!")
                    return result
                except Exception as json_err:
                    print(f"JSON repair failed: {json_err}")
                    
                    # Special handling for QueryPlan as ultimate fallback
                    if response_model.__name__ == 'QueryPlan' and hasattr(response_model, 'extract_steps_from_text'):
                        try:
                            print("Attempting direct text extraction for QueryPlan")
                            # Try the direct extraction method
                            return response_model.extract_steps_from_text(content)
                        except Exception as extract_err:
                            print(f"Direct extraction failed: {extract_err}")
                    
                    raise e  # Re-raise the original error if our repair failed
        else:
            # For other models use the normal approach
            return self.client.chat.completions.create(
                model=self.llm.model,
                messages=[{"role": "user", "content": prompt}],
                response_model=response_model,
            )
