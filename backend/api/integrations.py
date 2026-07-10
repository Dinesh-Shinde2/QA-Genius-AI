import base64
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from backend.database import db
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])
logger = logging.getLogger(__name__)

class ADOSettingsRequest(BaseModel):
    project_id: str
    org_name: str
    project_name: str
    pat_token: str

@router.post("/azure-devops/settings", response_model=dict)
async def save_ado_settings(request: ADOSettingsRequest, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    await db.execute(
        """
        INSERT INTO integration_settings (project_id, provider, org_name, project_name, pat_token)
        VALUES ($1, 'AZURE_DEVOPS', $2, $3, $4)
        ON CONFLICT (project_id, provider) 
        DO UPDATE SET org_name = EXCLUDED.org_name, project_name = EXCLUDED.project_name, pat_token = EXCLUDED.pat_token
        """,
        request.project_id, request.org_name, request.project_name, request.pat_token
    )
    
    return {"success": True, "message": "Azure DevOps settings saved successfully"}

@router.get("/azure-devops/settings", response_model=dict)
async def get_ado_settings(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        project_id
    )
    if not settings:
        return {"configured": False}
        
    pat = settings["pat_token"]
    obfuscated_pat = pat[:4] + "*" * (len(pat) - 8) + pat[-4:] if len(pat) > 8 else "****"
    
    return {
        "configured": True,
        "org_name": settings["org_name"],
        "project_name": settings["project_name"],
        "pat_token": obfuscated_pat
    }

@router.post("/azure-devops/sync-bug/{bug_id}", response_model=dict)
async def sync_bug_to_ado(bug_id: str, current_user: dict = Depends(get_current_user)):
    bug = await db.fetchrow(
        """
        SELECT b.*, p.user_id 
        FROM bug_reports b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = $1 AND p.user_id = $2
        """,
        bug_id, current_user["id"]
    )
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug report not found or unauthorized access"
        )
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        bug["project_id"]
    )
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Azure DevOps settings are not configured for this project."
        )
        
    org = settings["org_name"]
    project = settings["project_name"]
    pat = settings["pat_token"]
    
    steps_html = bug.get('steps_to_reproduce', '').replace('\n', '<br/>')
    description_html = f"""
    <div><b>Description:</b> {bug['description']}</div>
    <hr/>
    <div><b>Preconditions:</b> {bug.get('preconditions') or 'None'}</div>
    <div><b>Steps to Reproduce:</b><br/>{steps_html}</div>
    <hr/>
    <div><b>Expected Outcome:</b> {bug.get('expected_result')}</div>
    <div><b>Observed Symptom (Actual):</b> {bug.get('actual_result')}</div>
    <hr/>
    <div><b>Severity:</b> {bug.get('severity')} | <b>Priority:</b> {bug.get('priority')}</div>
    <div><b>Environment:</b> {bug.get('environment')}</div>
    <div><b>Proposed Code Fix Suggestion:</b> {bug.get('root_cause_suggestion') or 'None'}</div>
    """
    
    patch_document = [
        {"op": "add", "path": "/fields/System.Title", "value": f"[{bug['custom_id']}] {bug['title']}"},
        {"op": "add", "path": "/fields/System.Description", "value": description_html},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Severity", "value": bug.get("severity", "3 - Medium")},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 2}
    ]
    
    auth_str = base64.b64encode(f":{pat}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_str}",
        "Content-Type": "application/json-patch+json"
    }
    
    url = f"https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Bug?api-version=7.1-preview.3"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=patch_document, headers=headers, timeout=15.0)
            if res.status_code in [200, 201]:
                res_data = res.json()
                work_item_id = res_data.get("id")
                work_item_url = res_data.get("_links", {}).get("html", {}).get("href")
                
                await db.execute(
                    "UPDATE bug_reports SET summary = $1 WHERE id = $2",
                    f"Synced to ADO #{work_item_id}", bug_id
                )
                return {"success": True, "work_item_id": work_item_id, "url": work_item_url}
            else:
                logger.error(f"ADO bug sync failed: {res.status_code} - {res.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Azure DevOps API returned error: {res.text}"
                )
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Azure DevOps API: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Failed to reach Azure DevOps Server: {str(e)}"
        )

@router.post("/azure-devops/sync-testcase/{case_id}", response_model=dict)
async def sync_testcase_to_ado(case_id: str, current_user: dict = Depends(get_current_user)):
    tc = await db.fetchrow(
        """
        SELECT t.*, p.user_id 
        FROM test_cases t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = $1 AND p.user_id = $2
        """,
        case_id, current_user["id"]
    )
    if not tc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test case not found or unauthorized access"
        )
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        tc["project_id"]
    )
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Azure DevOps settings are not configured for this project."
        )
        
    org = settings["org_name"]
    project = settings["project_name"]
    pat = settings["pat_token"]
    
    import json
    try:
        steps_list = json.loads(tc["steps"])
        steps_html = "<ol>" + "".join(f"<li>{s}</li>" for s in steps_list) + "</ol>"
    except Exception:
        steps_html = f"<pre>{tc['steps']}</pre>"
        
    description_html = f"""
    <div><b>Scenario:</b> {tc['scenario']}</div>
    <hr/>
    <div><b>Preconditions:</b> {tc.get('preconditions') or 'None'}</div>
    <div><b>Test Steps:</b><br/>{steps_html}</div>
    <hr/>
    <div><b>Expected Outcome:</b> {tc.get('expected_result')}</div>
    <div><b>Required Test Data:</b> {tc.get('test_data') or 'None'}</div>
    <hr/>
    <div><b>Case Type:</b> {tc.get('case_type')} | <b>Priority:</b> {tc.get('priority')}</div>
    """
    
    patch_document = [
        {"op": "add", "path": "/fields/System.Title", "value": f"[{tc['custom_id']}] {tc['scenario'][:120]}"},
        {"op": "add", "path": "/fields/System.Description", "value": description_html},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 3}
    ]
    
    auth_str = base64.b64encode(f":{pat}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_str}",
        "Content-Type": "application/json-patch+json"
    }
    
    async def create_work_item(w_type: str) -> httpx.Response:
        url = f"https://dev.azure.com/{org}/{project}/_apis/wit/workitems/${w_type}?api-version=7.1-preview.3"
        async with httpx.AsyncClient() as client:
            return await client.post(url, json=patch_document, headers=headers, timeout=15.0)

    try:
        res = await create_work_item("Test Case")
        if res.status_code not in [200, 201]:
            logger.info("Test Case creation unsupported or failed, falling back to Task work item creation...")
            res = await create_work_item("Task")
            
        if res.status_code in [200, 201]:
            res_data = res.json()
            work_item_id = res_data.get("id")
            work_item_url = res_data.get("_links", {}).get("html", {}).get("href")
            
            await db.execute(
                "UPDATE test_cases SET test_data = $1 WHERE id = $2",
                f"Synced to ADO #{work_item_id}", case_id
            )
            return {"success": True, "work_item_id": work_item_id, "url": work_item_url}
        else:
            logger.error(f"ADO testcase sync failed: {res.status_code} - {res.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Azure DevOps API returned error: {res.text}"
            )
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Azure DevOps API: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Failed to reach Azure DevOps Server: {str(e)}"
        )

# ──────────────────────────────────────────────────────────────────────
# GITHUB INTEGRATION ENDPOINTS
# ──────────────────────────────────────────────────────────────────────
class GithubTokenRequest(BaseModel):
    token: str

class GithubRepoRequest(BaseModel):
    project_id: str
    repo_name: str # e.g. "owner/repo"

class GithubPrPushRequest(BaseModel):
    project_id: str
    test_case_id: str
    code_content: str
    file_path: str = "tests/automation.spec.js"

@router.get("/github/status", response_model=dict)
async def get_github_status(current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT github_username FROM user_github_tokens WHERE user_id = $1",
        uuid.UUID(current_user["id"])
    )
    if not row:
        return {"connected": False}
    return {"connected": True, "github_username": row["github_username"]}

@router.post("/github/token", response_model=dict)
async def save_github_token(request: GithubTokenRequest, current_user: dict = Depends(get_current_user)):
    # Validate token with GitHub API and get username
    headers = {
        "Authorization": f"token {request.token}",
        "Accept": "application/vnd.github.v3+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get("https://api.github.com/user", headers=headers, timeout=10.0)
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid GitHub Token provided.")
            user_data = res.json()
            username = user_data.get("login")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to connect to GitHub API: {str(e)}")

    await db.execute(
        """
        INSERT INTO user_github_tokens (user_id, access_token, github_username, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET access_token = EXCLUDED.access_token, github_username = EXCLUDED.github_username, updated_at = NOW()
        """,
        uuid.UUID(current_user["id"]), request.token.strip(), username
    )

    return {"success": True, "github_username": username, "message": "GitHub account linked successfully"}

@router.delete("/github", response_model=dict)
async def disconnect_github(current_user: dict = Depends(get_current_user)):
    await db.execute(
        "DELETE FROM user_github_tokens WHERE user_id = $1",
        uuid.UUID(current_user["id"])
    )
    return {"success": True, "message": "GitHub account disconnected"}

@router.post("/github/project-repo", response_model=dict)
async def save_project_github_repo(request: GithubRepoRequest, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(request.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    # Check project ownership/access
    project = await db.fetchrow("SELECT id FROM projects WHERE id = $1 AND user_id = $2", p_uuid, uuid.UUID(current_user["id"]))
    if not project:
        raise HTTPException(status_code=403, detail="You do not have administrative access to this project.")

    parts = request.repo_name.strip().split('/')
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Repository name must be in the format 'owner/repo'.")

    owner, repo = parts[0], parts[1]

    await db.execute(
        """
        INSERT INTO integration_settings (project_id, provider, org_name, project_name)
        VALUES ($1, 'GITHUB', $2, $3)
        ON CONFLICT (project_id, provider)
        DO UPDATE SET org_name = EXCLUDED.org_name, project_name = EXCLUDED.project_name
        """,
        p_uuid, owner, repo
    )

    return {"success": True, "message": f"Project mapped to GitHub repository '{request.repo_name}' successfully."}

@router.get("/github/project-repo", response_model=dict)
async def get_project_github_repo(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    row = await db.fetchrow(
        "SELECT org_name, project_name FROM integration_settings WHERE project_id = $1 AND provider = 'GITHUB'",
        p_uuid
    )
    if not row:
        return {"configured": False, "repo_name": ""}
    return {"configured": True, "repo_name": f"{row['org_name']}/{row['project_name']}"}

@router.post("/github/push-pr", response_model=dict)
async def push_playwright_pr(request: GithubPrPushRequest, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(request.project_id)
        tc_uuid = uuid.UUID(request.test_case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID formats.")

    # 1. Get user GitHub token
    token_row = await db.fetchrow(
        "SELECT access_token FROM user_github_tokens WHERE user_id = $1",
        uuid.UUID(current_user["id"])
    )
    if not token_row:
        raise HTTPException(status_code=400, detail="You must link your GitHub account under settings first.")
    token = token_row["access_token"]

    # 2. Get project repository mapping
    repo_row = await db.fetchrow(
        "SELECT org_name, project_name FROM integration_settings WHERE project_id = $1 AND provider = 'GITHUB'",
        p_uuid
    )
    if not repo_row:
        raise HTTPException(status_code=400, detail="Please configure the target GitHub repository for this project first.")
    owner, repo = repo_row["org_name"], repo_row["project_name"]

    # 3. Fetch test case details
    tc = await db.fetchrow("SELECT custom_id, title, scenario FROM test_cases WHERE id = $1", tc_uuid)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found.")
    tc_title = tc["title"] or tc["scenario"][:40]

    # Clean branch name
    branch_name = f"qa-genius-{tc['custom_id'].lower()}"

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            # 4. Get default branch of the repository
            repo_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
            if repo_res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch repository details: {repo_res.text}")
            default_branch = repo_res.json().get("default_branch", "main")

            # 5. Get the default branch latest commit SHA
            ref_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{default_branch}", headers=headers)
            if ref_res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch branch ref: {ref_res.text}")
            base_sha = ref_res.json().get("object", {}).get("sha")

            # 6. Create a new branch (ignoring if it already exists)
            create_branch_body = {
                "ref": f"refs/heads/{branch_name}",
                "sha": base_sha
            }
            await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/git/refs",
                headers=headers,
                json=create_branch_body
            )

            # 7. Check if file already exists in branch to get its SHA (for update)
            file_sha = None
            file_res = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{request.file_path}?ref={branch_name}",
                headers=headers
            )
            if file_res.status_code == 200:
                file_sha = file_res.json().get("sha")

            # 8. Commit the code file
            encoded_content = base64.b64encode(request.code_content.encode("utf-8")).decode("utf-8")
            commit_body = {
                "message": f"feat: add Playwright test script for {tc['custom_id']}",
                "content": encoded_content,
                "branch": branch_name
            }
            if file_sha:
                commit_body["sha"] = file_sha

            commit_res = await client.put(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{request.file_path}",
                headers=headers,
                json=commit_body
            )
            if commit_res.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail=f"Failed to commit code to repository: {commit_res.text}")

            # 9. Create Pull Request
            pr_body = {
                "title": f"QA Automation: Add {tc['custom_id']} script",
                "body": f"This Pull Request contains the automatically generated Playwright test script for `{tc['custom_id']}`: {tc_title}.\n\n_Generated with ❤️ by QA-Genius-AI._",
                "head": branch_name,
                "base": default_branch
            }
            pr_res = await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/pulls",
                headers=headers,
                json=pr_body
            )
            
            if pr_res.status_code in [200, 201]:
                pr_url = pr_res.json().get("html_url")
                return {"success": True, "pr_created": True, "url": pr_url}
            elif pr_res.status_code == 422:
                # PR might already exist, fetch pulls to find it
                pulls_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls?head={owner}:{branch_name}", headers=headers)
                if pulls_res.status_code == 200 and pulls_res.json():
                    pr_url = pulls_res.json()[0].get("html_url")
                    return {"success": True, "pr_created": False, "url": pr_url, "message": "PR already exists."}
                
                return {"success": True, "pr_created": False, "url": f"https://github.com/{owner}/{repo}/pulls", "message": "Review pull requests on GitHub."}
            else:
                raise HTTPException(status_code=500, detail=f"Failed to create GitHub Pull Request: {pr_res.text}")

        except httpx.RequestError as e:
            logger.error(f"Failed to connect to GitHub API: {e}")
            raise HTTPException(
                status_code=504,
                detail=f"Failed to reach GitHub Server: {str(e)}"
            )

import uuid
