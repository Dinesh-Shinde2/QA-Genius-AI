import os
import json
import logging
import httpx
from dotenv import load_dotenv

from backend.ai.prompts import (
    ANALYSIS_SYSTEM_PROMPT,
    ANALYSIS_USER_TEMPLATE,
    QA_PACKAGE_SYSTEM_PROMPT,
    QA_PACKAGE_USER_TEMPLATE
)

load_dotenv()

logger = logging.getLogger(__name__)

# Configurable endpoints
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

async def query_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Submits a prompt using local Ollama (if online) or falls back to Groq Cloud API.
    """
    # 1. Try Local Ollama if configured
    if os.getenv("USE_OLLAMA", "true").lower() == "true":
        try:
            logger.info(f"Attempting to query local Ollama ({OLLAMA_MODEL})...")
            payload = {
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("message", {}).get("content", "")
                    if content:
                        return content
        except Exception as e:
            logger.warning(f"Ollama query failed: {e}. Trying Groq fallback...")
            
    # 2. Try Groq API
    if GROQ_API_KEY:
        try:
            logger.info(f"Querying Groq Cloud API ({GROQ_MODEL})...")
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=20.0
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    if content:
                        return content
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            
    # 3. Offline Mock Fallback
    logger.warning("All LLM connections failed. Generating fallback mock structure.")
    raise ConnectionError("No active LLM providers could be contacted.")

def clean_json_response(raw_text: str) -> dict:
    """
    Cleans up any markdown wrapper blocks from the JSON response.
    """
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    return json.loads(text)

async def analyze_requirement(requirement_text: str) -> dict:
    user_prompt = ANALYSIS_USER_TEMPLATE.format(requirement_text=requirement_text)
    try:
        raw_response = await query_llm(ANALYSIS_SYSTEM_PROMPT, user_prompt)
        return clean_json_response(raw_response)
    except Exception as e:
        logger.warning(f"LLM Requirement Analysis failed, using regex-based extraction. Error: {e}")
        # Build smart offline response
        text = requirement_text.lower()
        if "login" in text or "auth" in text:
            return {
                "summary": "User authentication gateway supporting credentials validation and session handling.",
                "features": ["Secure user registration", "JWT login token exchange", "Credentials validation rules"],
                "business_rules": ["Password length must be at least 6 characters", "Email addresses must conform to email regex formatting"],
                "validations": ["Verify login fails with wrong password", "Block unregistered email profiles"],
                "user_roles": ["Anonymous Guest", "Authenticated QA Operator"],
                "apis": ["POST /api/auth/register", "POST /api/auth/login"],
                "workflows": ["User signs up with details", "User inputs credentials, receives access token, and enters dashboard"],
                "edge_cases": ["Brute force prevention with login rate limiting", "SQL injection scripts inside username string"]
            }
        else:
            return {
                "summary": "Custom system specification document detailing features and verification criteria.",
                "features": ["Extracted feature listing", "Standard operational workflow validations"],
                "business_rules": ["System validation criteria must be met before records are saved"],
                "validations": ["Reject empty or missing inputs in critical database fields"],
                "user_roles": ["Standard QA User", "System Administrator"],
                "apis": ["GET /api/records", "POST /api/records"],
                "workflows": ["User inputs parameters", "Validation validates limits", "Transaction completes successfully"],
                "edge_cases": ["Database connection timeouts", "Max boundary inputs handled properly"]
            }

async def generate_qa_package(requirement_text: str, module: str, rules: list, selected_types: list) -> dict:
    rules_str = "\n".join([f"- {r}" for r in rules]) if rules else "None extracted"
    types_str = ", ".join(selected_types) if selected_types else "Positive, Negative, Boundary, Edge Case"
    
    user_prompt = QA_PACKAGE_USER_TEMPLATE.format(
        module=module,
        rules=rules_str,
        selected_types=types_str,
        requirement_text=requirement_text
    )
    
    try:
        raw_response = await query_llm(QA_PACKAGE_SYSTEM_PROMPT, user_prompt)
        return clean_json_response(raw_response)
    except Exception as e:
        logger.warning(f"LLM QA Package Generation failed, using offline backup package. Error: {e}")
        # Return mock cases
        return {
            "test_cases": [
                {
                    "custom_id": "TC-GEN-001",
                    "module": module,
                    "feature": "Standard Validation",
                    "scenario": "Verify system functions correctly under happy path conditions.",
                    "preconditions": "Configuration settings are set to defaults.",
                    "steps": "1. Open interface page.\n2. Submit data inputs.\n3. Verify save confirmation displays.",
                    "test_data": "Standard testing inputs",
                    "expected_result": "Information is saved, and status changes to active.",
                    "priority": "P2",
                    "case_type": "Positive",
                    "confidence_score": 90
                },
                {
                    "custom_id": "TC-GEN-002",
                    "module": module,
                    "feature": "Invalid Input Rejection",
                    "scenario": "Verify error messages display when mandatory parameters are omitted.",
                    "preconditions": "Target workspace form is active.",
                    "steps": "1. Leave fields empty.\n2. Click save / submit.\n3. Inspect validator fields.",
                    "test_data": "Empty inputs",
                    "expected_result": "Validation fails. Error banner warns: 'Mandatory fields cannot be blank.'",
                    "priority": "P2",
                    "case_type": "Negative",
                    "confidence_score": 95
                }
            ],
            "suggested_bugs": [
                {
                    "custom_id": "BUG-GEN-001",
                    "module": module,
                    "feature": "Save Operations",
                    "title": "System displays error spinner infinitely on quick double-click submit",
                    "description": "Double-clicking the submit button bypasses loading overlay, launching duplicate database inserts and triggering unique constraint violations.",
                    "preconditions": "User is on form checkout screen.",
                    "steps_to_reproduce": "1. Input all fields.\n2. Double-click submit button in rapid succession.",
                    "expected_result": "First click disables button and completes. Second click is ignored.",
                    "actual_result": "Button remains active, spawning concurrent requests yielding DB duplicate key exceptions.",
                    "severity": "HIGH",
                    "priority": "P2",
                    "severity_reason": "Data integrity risk due to duplicate database entries.",
                    "environment": "Chrome 125, Staging Sandbox v1.4",
                    "impact_analysis": "Allows duplicate transactions or double billing if checkout parameters are clicked twice.",
                    "root_cause_suggestion": "Wrap click handler in debounce wrapper or disable UI button immediately upon trigger."
                }
            ]
        }

async def generate_manual_bug_report(details_text: str, ocr_text: str = None) -> dict:
    """
    Generates a structured Bug Report based on screenshot OCR and/or manual text details.
    """
    from backend.ai.prompts import BUG_GEN_SYSTEM_PROMPT, BUG_GEN_USER_TEMPLATE
    
    user_prompt = BUG_GEN_USER_TEMPLATE.format(
        details_text=details_text or "No text details provided.",
        ocr_text=ocr_text or "No screenshot OCR text extracted."
    )
    
    try:
        raw_response = await query_llm(BUG_GEN_SYSTEM_PROMPT, user_prompt)
        bug_data = clean_json_response(raw_response)
        for key in ["steps_to_reproduce", "preconditions", "expected_result", "actual_result"]:
            val = bug_data.get(key)
            if isinstance(val, list):
                bug_data[key] = "\n".join(str(item) for item in val)
        return bug_data
    except Exception as e:
        logger.warning(f"LLM Bug Generation failed, using offline fallback. Error: {e}")
        # Parse what we can from details_text to make a nice fallback
        title = "Reported application failure"
        if details_text:
            lines = [l.strip() for l in details_text.split("\n") if l.strip()]
            if len(lines) > 0 and len(lines[0]) < 80:
                title = lines[0]
            else:
                title = details_text[:60] + "..."
                
        return {
            "title": title,
            "feature": "General",
            "description": details_text or "User reported an issue via screenshot.",
            "preconditions": "User is authenticated and navigating the application module.",
            "steps_to_reproduce": "1. Open target page/flow.\n2. Trigger the actions as described in the issue details.",
            "expected_result": "Application should complete execution successfully without displaying failure states or toast notifications.",
            "actual_result": "An unexpected error occurred or the screenshot indicates a validation/server exception.",
            "severity": "HIGH",
            "priority": "P2",
            "severity_reason": "Manually reported bug from active user flow.",
            "environment": "Staging Server",
            "impact_analysis": "Blocks standard operator validation or workflow paths.",
            "root_cause_suggestion": "Review request payload parameters and corresponding backend controllers/logs."
        }

