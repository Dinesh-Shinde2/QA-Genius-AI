import os
import re
import json
import logging
import asyncio
import sys

if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright
import pandas as pd
import io

from backend.ai.ai_service import query_llm

router = APIRouter(prefix="/api/locator", tags=["LocatorX"])
logger = logging.getLogger(__name__)

# Request models
class AnalyzeRequest(BaseModel):
    url: str
    auth_cookies: Optional[List[Dict[str, Any]]] = None
    locator_types: Optional[List[str]] = ["playwright", "xpath", "css"]

class POMRequest(BaseModel):
    elements: List[Dict[str, Any]]
    framework: str  # "playwright_js", "playwright_py", "selenium_java", "selenium_py"

class ScriptRequest(BaseModel):
    elements: List[Dict[str, Any]]
    url: str
    prompt: str
    framework: str

# Dynamic ID Helper
def is_dynamic_id(id_str: str) -> bool:
    if not id_str:
        return False
    if id_str.isdigit():
        return True
    if re.search(r'\bember\d+\b', id_str, re.I):
        return True
    if re.search(r'\bgwt-uid-\d+\b', id_str, re.I):
        return True
    if re.search(r'^:r[a-zA-Z0-9]+:$', id_str):
        return True
    if re.search(r'\b[0-9a-f]{6,}\b', id_str, re.I):
        return True
    return False

# Rule-based fallback builder
def build_fallback_locator(el: Dict[str, Any], index: int) -> Dict[str, Any]:
    tag = el.get("tag", "div")
    el_id = el.get("id", "")
    name = el.get("name", "")
    placeholder = el.get("placeholder", "")
    aria_label = el.get("ariaLabel", "")
    data_testid = el.get("dataTestId", "")
    text = el.get("text", "") or ""
    
    raw_label = el.get("label")
    if not raw_label:
        raw_text = el.get("text")
        raw_label = raw_text if raw_text else f"{tag}_{index}"
        
    label_str = str(raw_label)[:40]
    
    fb = {
        "elementLabel": label_str,
        "elementType": tag,
        "locatorStrategy": "Tag-based (fallback)",
        "confidence": "Low",
        "xpath": f"//{tag}",
        "cssSelector": tag,
        "playwrightLocator": f"locator('{tag}')"
    }
    
    # Determine best strategy
    if data_testid:
        fb["xpath"] = f"//*[@data-testid='{data_testid}']"
        fb["cssSelector"] = f"[data-testid='{data_testid}']"
        fb["playwrightLocator"] = f"getByTestId('{data_testid}')"
        fb["locatorStrategy"] = "Attribute-based"
        fb["confidence"] = "High"
    elif el_id and not is_dynamic_id(el_id):
        fb["xpath"] = f"//*[@id='{el_id}']"
        fb["cssSelector"] = f"#{el_id}"
        fb["playwrightLocator"] = f"locator('#{el_id}')"
        fb["locatorStrategy"] = "ID-based"
        fb["confidence"] = "High"
    elif name:
        fb["xpath"] = f"//input[@name='{name}']" if tag == "input" else f"//*[@name='{name}']"
        fb["cssSelector"] = f"[name='{name}']"
        fb["playwrightLocator"] = f"locator('[name=\"{name}\"]')"
        fb["locatorStrategy"] = "Name-based"
        fb["confidence"] = "Medium"
    elif aria_label:
        fb["xpath"] = f"//*[@aria-label='{aria_label}']"
        fb["cssSelector"] = f"[aria-label='{aria_label}']"
        fb["playwrightLocator"] = f"getByLabel('{aria_label}')"
        fb["locatorStrategy"] = "AriaLabel-based"
        fb["confidence"] = "Medium"
    elif placeholder:
        fb["xpath"] = f"//input[@placeholder='{placeholder}']" if tag == "input" else f"//*[@placeholder='{placeholder}']"
        fb["cssSelector"] = f"[placeholder='{placeholder}']"
        fb["playwrightLocator"] = f"getByPlaceholder('{placeholder}')"
        fb["locatorStrategy"] = "Placeholder-based"
        fb["confidence"] = "Medium"
    elif text and len(text) < 40:
        escaped_text = text.replace("'", "\\'")
        fb["xpath"] = f"//{tag}[normalize-space()='{escaped_text}']"
        fb["cssSelector"] = f"{tag}:has-text('{escaped_text}')"
        fb["playwrightLocator"] = f"getByRole('{tag}', {{ name: '{escaped_text}' }})" if tag in ["button", "link", "heading"] else f"getByText('{escaped_text}')"
        fb["locatorStrategy"] = "Text-based"
        fb["confidence"] = "Medium"
    else:
        fb["xpath"] = f"({tag})[{index + 1}]"
        fb["cssSelector"] = f"{tag}:nth-of-type({index + 1})"
        fb["playwrightLocator"] = f"locator('{tag}').nth({index})"
        fb["locatorStrategy"] = "Index-based"
        fb["confidence"] = "Low"
        
    return fb

def quoted_strings(fragment: str) -> List[str]:
    matches = re.findall(r'(["\'])(.*?)\1', fragment)
    return [m[1].replace('\\"', '"').replace("\\'", "'") for m in matches]

def option_string(fragment: str, key: str) -> Optional[str]:
    m = re.search(r'' + key + r'\s*:\s*(["\'])(.*?)\1', fragment)
    return m.group(2).replace('\\"', '"').replace("\\'", "'") if m else None

def resolve_playwright_locator_py(page, loc_str: str):
    loc = loc_str.strip()
    exact = "exact: true" in loc or "exact: True" in loc
    
    if loc.startswith("getByRole("):
        qs = quoted_strings(loc)
        if not qs:
            return None
        role = qs[0]
        name = option_string(loc, "name")
        opts = {}
        if name is not None:
            opts["name"] = name
        if exact:
            opts["exact"] = True
        return page.get_by_role(role, **opts) if opts else page.get_by_role(role)
        
    by_exact = {
        "getByLabel(": page.get_by_label,
        "getByPlaceholder(": page.get_by_placeholder,
        "getByText(": page.get_by_text,
        "getByAltText(": page.get_by_alt_text,
        "getByTitle(": page.get_by_title,
    }
    for prefix, method in by_exact.items():
        if loc.startswith(prefix):
            qs = quoted_strings(loc)
            if qs:
                opts = {"exact": True} if exact else {}
                return method(qs[0], **opts)
                
    if loc.startswith("getByTestId("):
        qs = quoted_strings(loc)
        if qs:
            return page.get_by_test_id(qs[0])
            
    if loc.startswith("locator("):
        qs = quoted_strings(loc)
        if qs:
            return page.locator(qs[0])
            
    return None

async def verify_locator_python(page, xpath: Optional[str], css: Optional[str], pw_loc_str: Optional[str]) -> Dict[str, Any]:
    results = {"xpathOk": False, "cssOk": False, "pwOk": False, "xpathMatchCount": 0, "cssMatchCount": 0, "pwMatchCount": 0}
    
    if xpath:
        try:
            count = await page.locator(f"xpath={xpath}").count()
            results["xpathOk"] = count == 1
            results["xpathMatchCount"] = count
        except Exception:
            results["xpathOk"] = False
            
    if css:
        try:
            count = await page.locator(css).count()
            results["cssOk"] = count == 1
            results["cssMatchCount"] = count
        except Exception:
            results["cssOk"] = False
            
    if pw_loc_str:
        try:
            loc_obj = resolve_playwright_locator_py(page, pw_loc_str)
            if loc_obj:
                count = await loc_obj.count()
                results["pwOk"] = count >= 1
                results["pwMatchCount"] = count
        except Exception:
            results["pwOk"] = False
            
    return results

async def generate_locators_ai(chunk: List[Dict[str, Any]], locator_types: List[str]) -> List[Dict[str, Any]]:
    want_xpath = "xpath" in locator_types
    want_css = "css" in locator_types
    want_pw = "playwright" in locator_types
    
    output_fields = ['"ref": number']
    if want_xpath:
        output_fields.append('"xpath": string')
    if want_css:
        output_fields.append('"cssSelector": string')
    if want_pw:
        output_fields.append('"playwrightLocator": string')
        
    type_instructions = []
    if want_xpath:
        type_instructions.append(
            "- XPath STRICT RULES:\n"
            "  * ALWAYS wrap text comparisons in normalize-space(): //tag[normalize-space()=\"text\"]\n"
            "  * NEVER use @class or contains(@class,...) — classes are dynamic and will break\n"
            "  * NEVER use positional predicates like [1],[2] unless absolutely no other option\n"
            "  * PREFER: @id, @name, @type, @placeholder, @aria-label, @data-testid, @href, @value"
        )
    if want_css:
        type_instructions.append(
            "- CSS STRICT RULES:\n"
            "  * PREFER: #id, [name=\"\"], [type=\"\"], [placeholder=\"\"], [aria-label=\"\"], [data-testid=\"\"]\n"
            "  * NEVER use class selectors (.btn, .primary) — they are dynamic"
        )
    if want_pw:
        type_instructions.append(
            "- Playwright built-in STRICT RULES:\n"
            "  * Priority: getByRole > getByLabel > getByPlaceholder > getByTestId > getByText > locator()\n"
            "  * For getByRole name: use the VISIBLE TEXT exactly as shown in the element text field\n"
            "  * getByRole examples: getByRole('button', { name: 'Sign In' }), getByRole('link', { name: 'Home' })"
        )
        
    chunk_for_prompt = [{"ref": idx, **el} for idx, el in enumerate(chunk)]
    type_instructions_str = '\n'.join(type_instructions)
    output_fields_str = ',\n  '.join(output_fields)

    system_prompt = (
        "You are a senior test automation engineer. Generate locators for these VISIBLE web elements.\n\n"
        f"LOCATOR TYPES REQUESTED: {', '.join(locator_types)}\n\n"
        "PRIORITY ORDER (apply to all types):\n"
        "1. data-testid / data-cy -> High confidence\n"
        "2. Stable semantic ID (not auto-generated) -> High confidence\n"
        "3. name / aria-label / placeholder -> Medium confidence\n"
        "4. Visible text (short, unique) -> Medium confidence\n"
        "5. Positional index -> Low confidence (last resort only)\n\n"
        "TYPE-SPECIFIC RULES:\n"
        f"{type_instructions_str}\n\n"
        "Skip dynamic IDs: ember123, gwt-uid-4, :r0:, long hex strings, pure numbers."
    )
    
    user_prompt = (
        f"ELEMENTS:\n{json.dumps(chunk_for_prompt, indent=2)}\n\n"
        "Return JSON with key \"locators\". Return EXACTLY ONE item per element above, and "
        "copy that element's \"ref\" value into the item's \"ref\" field. Each item MUST include:\n"
        "{\n"
        "  \"ref\": number,\n"
        "  \"elementLabel\": string,\n"
        "  \"elementType\": string,\n"
        "  \"locatorStrategy\": string,\n"
        "  \"confidence\": \"High\" | \"Medium\" | \"Low\",\n"
        f"  {output_fields_str}\n"
        "}"
    )
    
    try:
        res_txt = await query_llm(system_prompt, user_prompt)
        cleaned_txt = res_txt.strip()
        if cleaned_txt.startswith("```json"):
            cleaned_txt = cleaned_txt[7:]
        if cleaned_txt.endswith("```"):
            cleaned_txt = cleaned_txt[:-3]
        data = json.loads(cleaned_txt.strip())
        locators = data.get("locators", [])
        if not isinstance(locators, list):
            locators = [locators]
        return locators
    except Exception as e:
        logger.error(f"Failed to query LLM or parse JSON: {e}")
        return []

# Browser visible element extraction script
EXTRACTION_JS = """
() => {
    const els = document.querySelectorAll(
        'a, button, input, select, textarea, label, ' +
        '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
        '[role="tab"], [role="menuitem"], [role="textbox"], ' +
        '[data-testid], [data-cy], [name], h1, h2, h3'
    );
    const seen = new Set();
    const results = [];
    els.forEach((el, idx) => {
        if (!el.isConnected) return;
        if (el.tagName === 'INPUT' && el.type === 'hidden') return;
        if (el.getAttribute('aria-hidden') === 'true') return;
        if (['SCRIPT', 'STYLE', 'BASE', 'NOSCRIPT'].includes(el.tagName)) return;
        const cls = (el.getAttribute('class') || '').toLowerCase();
        if (/\\b(sr-only|visually-hidden|screen-reader-only)\\b/.test(cls)) return;

        const rect = el.getBoundingClientRect();
        const hasUsefulAttr = el.id || el.getAttribute('name') ||
                              el.getAttribute('aria-label') || el.getAttribute('placeholder') ||
                              el.getAttribute('data-testid') || el.getAttribute('data-cy') ||
                              el.getAttribute('role') || el.getAttribute('href');
        const ownStyle = window.getComputedStyle(el);
        if (ownStyle.display === 'none' && !hasUsefulAttr && rect.width === 0 && rect.height === 0) return;

        const tag         = el.tagName.toLowerCase();
        const id          = el.id || '';
        const name        = el.getAttribute('name') || '';
        const type        = el.getAttribute('type') || '';
        const placeholder = el.getAttribute('placeholder') || '';
        const ariaLabel   = el.getAttribute('aria-label') || '';
        const role        = el.getAttribute('role') || '';
        const dataTestId  = el.getAttribute('data-testid') || el.getAttribute('data-cy') || '';
        const href        = (el.getAttribute('href') || '').slice(0, 100);
        const altText     = el.getAttribute('alt') || '';
        const rawText     = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80);

        const fp = `${tag}|${id}|${name}|${rawText.slice(0,40)}|${placeholder}|${ariaLabel}`;
        if (seen.has(fp)) return;
        seen.add(fp);

        const label = dataTestId || ariaLabel || placeholder || rawText || name || altText || id || `${tag}[${idx}]`;
        results.push({ tag, id, name, type, placeholder, ariaLabel, role, dataTestId, href, altText, text: rawText, label: label.slice(0, 60), index: idx });
    });
    return results;
}
"""

async def analyze_page_core(target_url: str, auth_cookies: Optional[List[Dict[str, Any]]], locator_types: List[str]) -> List[Dict[str, Any]]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True,
            viewport={"width": 1280, "height": 800}
        )
        
        # Load custom session cookies if provided
        if auth_cookies:
            await context.add_cookies(auth_cookies)
            
        page = await context.new_page()
        
        # Navigate to target page
        await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
        
        # Settle wait
        await page.wait_for_timeout(2000)
        
        # Extract elements from DOM
        elements = await page.evaluate(EXTRACTION_JS)
        logger.info(f"LocatorX: Extracted {len(elements)} elements")
        
        if not elements:
            await browser.close()
            return []
            
        # Filter dynamic IDs in element metadata
        for el in elements:
            if el.get("id") and is_dynamic_id(el["id"]):
                el["id"] = ""
                
        # Generate locators using AI in chunks of 25
        CHUNK_SIZE = 25
        all_locators = []
        for i in range(0, len(elements), CHUNK_SIZE):
            chunk = elements[i:i+CHUNK_SIZE]
            chunk_locators = await generate_locators_ai(chunk, locator_types)
            
            # Align chunk locators to elements using the "ref" echoed back
            covered_idx = set()
            for loc in chunk_locators:
                ref_idx = loc.get("ref")
                if isinstance(ref_idx, int) and 0 <= ref_idx < len(chunk):
                    idx = ref_idx
                else:
                    idx = None
                    
                if idx is not None and idx not in covered_idx:
                    covered_idx.add(idx)
                    src_el = chunk[idx]
                    
                    # Populate element details
                    el_entry = {**src_el}
                    if "xpath" in locator_types:
                        el_entry["xpath"] = loc.get("xpath", "")
                    if "css" in locator_types:
                        el_entry["cssSelector"] = loc.get("cssSelector", "")
                    if "playwright" in locator_types:
                        el_entry["playwrightLocator"] = loc.get("playwrightLocator", "")
                        
                    el_entry["locatorStrategy"] = loc.get("locatorStrategy", "AI-suggested")
                    el_entry["confidence"] = loc.get("confidence", "Medium")
                    all_locators.append(el_entry)
                    
            # Backfill anything skipped by the AI using rules
            for idx, el in enumerate(chunk):
                if idx not in covered_idx:
                    fallback = build_fallback_locator(el, i + idx)
                    el_entry = {**el, **fallback}
                    all_locators.append(el_entry)
                    
        # Live verification loop in the active browser page
        # Test each selector on the current page to determine unique match
        for el in all_locators:
            xpath = el.get("xpath")
            css = el.get("cssSelector")
            pw_str = el.get("playwrightLocator")
            
            v_res = await verify_locator_python(page, xpath, css, pw_str)
            el["xpathOk"] = v_res["xpathOk"]
            el["cssOk"] = v_res["cssOk"]
            el["pwOk"] = v_res["pwOk"]
            el["xpathCount"] = v_res["xpathMatchCount"]
            el["cssCount"] = v_res["cssMatchCount"]
            el["pwCount"] = v_res["pwMatchCount"]
            
        await browser.close()
        return all_locators

def run_in_proactor_thread(url: str, auth_cookies: Optional[List[Dict[str, Any]]], locator_types: List[str]) -> List[Dict[str, Any]]:
    import sys
    import asyncio
    import threading
    
    result = []
    exception = []
    
    def worker():
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            res = loop.run_until_complete(analyze_page_core(url, auth_cookies, locator_types))
            result.append(res)
        except Exception as e:
            exception.append(e)
        finally:
            loop.close()
            
    thread = threading.Thread(target=worker)
    thread.start()
    thread.join()
    
    if exception:
        raise exception[0]
    return result[0]

@router.post("/analyze")
def analyze_page(req: AnalyzeRequest):
    target_url = req.url.strip() if req.url else ""
    if not target_url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    if not (target_url.startswith("http://") or target_url.startswith("https://")):
        target_url = "https://" + target_url

    logger.info(f"LocatorX: Analyzing URL: {target_url}")
    try:
        all_locators = run_in_proactor_thread(target_url, req.auth_cookies, req.locator_types)
        return {"elements": all_locators}
    except Exception as e:
        logger.error(f"LocatorX Analysis Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LocatorX failed to analyze page: {str(e) or type(e).__name__}"
        )

# Helper to extract code from raw LLM responses (stripping JSON envelopes or markdown blocks)
def extract_raw_code(res_txt: str) -> str:
    txt = res_txt.strip()
    if txt.startswith("```"):
        first_nl = txt.find("\n")
        if first_nl != -1:
            txt = txt[first_nl+1:]
        if txt.endswith("```"):
            txt = txt[:-3]
        txt = txt.strip()
        
    try:
        data = json.loads(txt)
        if isinstance(data, dict):
            if "code" in data:
                return data["code"]
            if "script" in data:
                return data["script"]
    except Exception:
        pass
        
    return txt

# Helper to format class name
def to_class_name(page_title: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', page_title or "MyPage").strip()
    words = cleaned.split()
    if not words:
        return "LoginPage"
    return "".join(w.capitalize() for w in words) + "Page"

# Helper to avoid property name collisions
def make_prop_resolver():
    seen = {}
    def resolver(label: str) -> str:
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', label or "element").strip()
        words = cleaned.split()
        if not words:
            base = "element"
        else:
            base = words[0].lower() + "".join(w.capitalize() for w in words[1:])
            
        if base and not base[0].isalpha():
            base = "el_" + base
            
        count = seen.get(base, 0)
        seen[base] = count + 1
        return base if count == 0 else f"{base}{count + 1}"
    return resolver

def generate_playwright_js_pom(elements: List[Dict[str, Any]], page_title: str, url: str) -> str:
    class_name = to_class_name(page_title)
    resolve_prop = make_prop_resolver()
    
    props = []
    actions = []
    
    for el in elements:
        prop = resolve_prop(el.get("label", ""))
        tag = el.get("tag", "div")
        strategy = el.get("locatorStrategy", "AI-suggested")
        confidence = el.get("confidence", "Medium")
        pw_loc = el.get("playwrightLocator", "")
        css = el.get("cssSelector", "")
        xpath = el.get("xpath", "")
        
        props.append(f"\n  // {tag} | {strategy} | Confidence: {confidence}")
        if pw_loc:
            props.append(f"  get {prop}() {{ return this.page.{pw_loc}; }}")
        if css:
            props.append(f"  get {prop}ByCss() {{ return this.page.locator('{css.replace(chr(39), str(chr(92))+chr(39))}'); }}")
        if xpath:
            props.append(f"  get {prop}ByXPath() {{ return this.page.locator('xpath={xpath.replace(chr(39), str(chr(92))+chr(39))}'); }}")
            
        if tag in ['input', 'button', 'a', 'select', 'textarea']:
            P = prop[0].upper() + prop[1:]
            loc = f"this.page.{pw_loc}" if pw_loc else f"this.page.locator('{css}')" if css else f"this.page.locator('xpath={xpath}')"
            if tag in ['input', 'textarea']:
                actions.append(f"\n  async fill{P}(value) {{\n    await {loc}.fill(value);\n  }}")
            elif tag in ['button', 'a']:
                actions.append(f"\n  async click{P}() {{\n    await {loc}.click();\n  }}")
            elif tag == 'select':
                actions.append(f"\n  async select{P}(value) {{\n    await {loc}.selectOption(value);\n  }}")
                
    props_str = "\n".join(props)
    actions_str = "".join(actions)
    
    return f"""// ============================================================
// Page Object Model — Auto-generated by AI LocatorX
// Page     : {page_title}
// URL      : {url}
// Locators : Playwright (JavaScript)
// ============================================================

const {{ expect }} = require('@playwright/test');

class {class_name} {{
  /** @param {{import('@playwright/test').Page}} page */
  constructor(page) {{
    this.page = page;
    this.url  = '{url}';
  }}

  async navigate() {{ await this.page.goto(this.url); }}

  // ── Locators ──────────────────────────────────────────────
{props_str}

  // ── Actions ───────────────────────────────────────────────
{actions_str}

  async waitForPageLoad() {{ await this.page.waitForLoadState('networkidle'); }}
}}

module.exports = {{ {class_name} }};
"""

def generate_playwright_py_pom(elements: List[Dict[str, Any]], page_title: str, url: str) -> str:
    class_name = to_class_name(page_title)
    resolve_prop = make_prop_resolver()
    
    props = []
    actions = []
    
    for el in elements:
        prop = resolve_prop(el.get("label", ""))
        tag = el.get("tag", "div")
        strategy = el.get("locatorStrategy", "AI-suggested")
        confidence = el.get("confidence", "Medium")
        
        pw_loc = el.get("playwrightLocator", "")
        py_pw = pw_loc.replace("getByRole", "get_by_role").replace("getByText", "get_by_text").replace("getByLabel", "get_by_label").replace("getByPlaceholder", "get_by_placeholder").replace("getByTestId", "get_by_test_id").replace("exact: true", "exact=True").replace("exact: false", "exact=False")
        
        props.append(f"        # {tag} | {strategy} | Confidence: {confidence}")
        props.append(f"        self.{prop} = page.{py_pw}")
        
        if tag in ['input', 'button', 'a', 'select', 'textarea']:
            if tag in ['input', 'textarea']:
                actions.append(f"\n    async def fill_{prop}(self, value: str):\n        await self.{prop}.fill(value)")
            elif tag in ['button', 'a']:
                actions.append(f"\n    async def click_{prop}(self):\n        await self.{prop}.click()")
            elif tag == 'select':
                actions.append(f"\n    async def select_{prop}(self, value: str):\n        await self.{prop}.select_option(value)")
                
    props_str = "\n".join(props)
    actions_str = "".join(actions)
    
    return f"""# ============================================================
# Page Object Model — Auto-generated by AI LocatorX
# Page     : {page_title}
# URL      : {url}
# Locators : Playwright (Python Async)
# ============================================================

from playwright.async_api import Page

class {class_name}:
    def __init__(self, page: Page):
        self.page = page
        self.url = "{url}"
{props_str}

    async def navigate(self):
        await self.page.goto(self.url)
{actions_str}
"""

def generate_selenium_java_pom(elements: List[Dict[str, Any]], page_title: str, url: str) -> str:
    class_name = to_class_name(page_title)
    resolve_prop = make_prop_resolver()
    
    fields = []
    actions = []
    
    for el in elements:
        prop = resolve_prop(el.get("label", ""))
        tag = el.get("tag", "div")
        strategy = el.get("locatorStrategy", "AI-suggested")
        confidence = el.get("confidence", "Medium")
        
        css = el.get("cssSelector", "")
        xpath = el.get("xpath", "")
        
        if not css and not xpath:
            continue
            
        strategy_annot = f'css = "{css}"' if css else f'xpath = "{xpath}"'
        
        fields.append(f"\n    // {tag} | {strategy} | Confidence: {confidence}")
        fields.append(f"    @FindBy({strategy_annot})")
        fields.append(f"    private WebElement {prop};")
        
        if tag in ['input', 'button', 'a', 'select', 'textarea']:
            P = prop[0].upper() + prop[1:]
            if tag in ['input', 'textarea']:
                actions.append(f"\n    public void fill{P}(String value) {{\n        {prop}.clear();\n        {prop}.sendKeys(value);\n    }}")
            elif tag in ['button', 'a']:
                actions.append(f"\n    public void click{P}() {{\n        {prop}.click();\n    }}")
            elif tag == 'select':
                actions.append(f"\n    public void select{P}(String visibleText) {{\n        new Select({prop}).selectByVisibleText(visibleText);\n    }}")
                
    fields_str = "\n".join(fields)
    actions_str = "".join(actions)
    
    return f"""// ============================================================
// Page Object Model — Auto-generated by AI LocatorX
// Page     : {page_title}
// URL      : {url}
// Locators : Selenium WebDriver (Java PageFactory)
// ============================================================

package com.locators.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.Select;

public class {class_name} {{

    private final WebDriver driver;
    private final String url = "{url}";
{fields_str}

    public {class_name}(WebDriver driver) {{
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }}

    public void navigate() {{
        driver.get(url);
    }}
{actions_str}
}}
"""

def generate_selenium_py_pom(elements: List[Dict[str, Any]], page_title: str, url: str) -> str:
    class_name = to_class_name(page_title)
    resolve_prop = make_prop_resolver()
    
    props = []
    actions = []
    
    for el in elements:
        prop = resolve_prop(el.get("label", ""))
        tag = el.get("tag", "div")
        strategy = el.get("locatorStrategy", "AI-suggested")
        confidence = el.get("confidence", "Medium")
        
        css = el.get("cssSelector", "")
        xpath = el.get("xpath", "")
        
        if not css and not xpath:
            continue
            
        by_strategy = f'By.CSS_SELECTOR, "{css}"' if css else f'By.XPATH, "{xpath}"'
        
        props.append(f"        # {tag} | {strategy} | Confidence: {confidence}")
        props.append(f"        self._{prop}_locator = ({by_strategy})")
        
        actions.append(f"\n    @property\n    def {prop}(self):\n        return self.driver.find_element(*self._{prop}_locator)")
        
        if tag in ['input', 'button', 'a', 'select', 'textarea']:
            if tag in ['input', 'textarea']:
                actions.append(f"\n    def fill_{prop}(self, value: str):\n        self.{prop}.clear()\n        self.{prop}.send_keys(value)")
            elif tag in ['button', 'a']:
                actions.append(f"\n    def click_{prop}(self):\n        self.{prop}.click()")
                
    props_str = "\n".join(props)
    actions_str = "".join(actions)
    
    return f"""# ============================================================
# Page Object Model — Auto-generated by AI LocatorX
# Page     : {page_title}
# URL      : {url}
# Locators : Selenium WebDriver (Python)
# ============================================================

from selenium.webdriver.common.by import By

class {class_name}:
    def __init__(self, driver):
        self.driver = driver
        self.url = "{url}"
{props_str}

    def navigate(self):
        self.driver.get(self.url)
{actions_str}
"""

@router.post("/generate-pom")
def generate_pom(req: POMRequest):
    try:
        # Determine target page title from elements list
        page_title = "MyPage"
        for el in req.elements:
            if el.get("tag") == "h1" and el.get("text"):
                page_title = el["text"]
                break
                
        # Generate code programmatically
        if req.framework == "playwright_js":
            code = generate_playwright_js_pom(req.elements, page_title, "http://localhost")
        elif req.framework == "playwright_py":
            code = generate_playwright_py_pom(req.elements, page_title, "http://localhost")
        elif req.framework == "selenium_java":
            code = generate_selenium_java_pom(req.elements, page_title, "http://localhost")
        elif req.framework == "selenium_py":
            code = generate_selenium_py_pom(req.elements, page_title, "http://localhost")
        else:
            code = generate_playwright_js_pom(req.elements, page_title, "http://localhost")
            
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-script")
async def generate_flow_script(req: ScriptRequest):
    system_prompt = (
        "You are a senior E2E automation QA engineer. Write a complete, runnable script "
        "incorporating the supplied E2E flow details and the verified locators list. "
        "Do NOT return JSON formatting or wrappers. Return ONLY the code block of the complete script."
    )
    user_prompt = (
        f"TARGET URL: {req.url}\n"
        f"FRAMEWORK: {req.framework}\n"
        f"USER FLOW INSTRUCTIONS: {req.prompt}\n"
        f"AVAILABLE LOCATORS:\n{json.dumps(req.elements, indent=2)}\n\n"
        "Write a complete, ready-to-run automation script. "
        "Return ONLY the code block of the script."
    )
    try:
        res = await query_llm(system_prompt, user_prompt)
        # Robust cleanup of any JSON envelopes or markdown formatting
        code = extract_raw_code(res)
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-excel")
async def export_excel(elements: List[Dict[str, Any]]):
    try:
        # Convert elements to pandas dataframe
        df = pd.DataFrame(elements)
        
        # Select and rename columns for clean output
        columns_to_keep = ["label", "tag", "id", "name", "type", "placeholder", "locatorStrategy", "confidence", "xpath", "cssSelector", "playwrightLocator", "xpathOk", "cssOk", "pwOk"]
        existing_cols = [c for c in columns_to_keep if c in df.columns]
        df_selected = df[existing_cols].copy()
        
        # Split into verified (at least one locator matches uniquely) vs rejected
        verified_mask = df_selected.apply(lambda r: bool(r.get("xpathOk") or r.get("cssOk") or r.get("pwOk")), axis=1)
        df_verified = df_selected[verified_mask]
        df_rejected = df_selected[~verified_mask]
        
        # Write to byte stream
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df_verified.to_excel(writer, sheet_name="Verified Locators", index=False)
            df_rejected.to_excel(writer, sheet_name="Rejected Locators", index=False)
            
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=locatorx_report.xlsx"}
        )
    except Exception as e:
        logger.error(f"Failed to export excel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export excel: {str(e)}")
