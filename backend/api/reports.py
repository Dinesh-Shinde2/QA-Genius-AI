import io
import csv
import json
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List

from backend.database import db
from backend.api.auth import get_current_user
from backend.models.schemas import CoverageMatrixItem

router = APIRouter(prefix="/api/reports", tags=["reports"])

logger = logging.getLogger(__name__)

@router.get("/coverage/matrix", response_model=List[CoverageMatrixItem])
async def get_coverage_matrix(project_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    # Get all requirements and their test case counts
    rows = await db.fetch(
        """
        SELECT r.module, r.title as requirement_title, COUNT(t.id) as test_case_count
        FROM requirements r
        LEFT JOIN test_cases t ON r.id = t.requirement_id
        WHERE r.project_id = $1
        GROUP BY r.id, r.module, r.title
        ORDER BY r.module ASC, r.title ASC
        """,
        project_id
    )
    
    matrix = []
    for r in rows:
        count = int(r["test_case_count"])
        status_label = "COVERED" if count > 0 else "MISSING"
        matrix.append(
            CoverageMatrixItem(
                module=r["module"],
                requirement_title=r["requirement_title"],
                test_case_count=count,
                status=status_label
            )
        )
        
    return matrix

@router.get("/export")
async def export_project_data(project_id: str, format_type: str, current_user: dict = Depends(get_current_user)):
    format_type = format_type.upper()
    if format_type not in ["CSV", "EXCEL", "PDF"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format. Use CSV, EXCEL, or PDF."
        )
        
    # Verify project
    project = await db.fetchrow(
        "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    # Fetch test cases
    test_cases = await db.fetch(
        """
        SELECT custom_id, module, feature, scenario, preconditions, steps, test_data, expected_result, priority, case_type, confidence_score
        FROM test_cases
        WHERE project_id = $1
        ORDER BY custom_id ASC
        """,
        project_id
    )
    
    # Map raw rows to list of dicts
    data = []
    for tc in test_cases:
        # Format steps JSON string to clean newline format
        steps_val = tc["steps"]
        try:
            steps_list = json.loads(steps_val)
            if isinstance(steps_list, list):
                steps_clean = "\n".join([f"{i+1}. {step}" for i, step in enumerate(steps_list)])
            else:
                steps_clean = str(steps_val)
        except Exception:
            steps_clean = str(steps_val)
            
        data.append({
            "TC ID": tc["custom_id"],
            "Module": tc["module"],
            "Feature": tc["feature"],
            "Scenario": tc["scenario"],
            "Preconditions": tc["preconditions"] or "",
            "Test Steps": steps_clean,
            "Test Data": tc["test_data"] or "",
            "Expected Result": tc["expected_result"],
            "Priority": tc["priority"],
            "Type": tc["case_type"],
            "Confidence Score": f"{tc['confidence_score']}%"
        })
        
    df = pd.DataFrame(data)
    
    if format_type == "CSV":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={project['name']}_test_cases.csv"
        return response
        
    elif format_type == "EXCEL":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Test Cases")
        output.seek(0)
        response = StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={project['name']}_test_cases.xlsx"
        return response
        
    elif format_type == "PDF":
        # Generate formatted HTML print sheet which prints to clean PDF in browser
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: sans-serif; margin: 30px; background-color: #ffffff; color: #1e293b; }}
                h1 {{ color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }}
                h2 {{ font-size: 14px; color: #64748b; margin-top: -10px; margin-bottom: 30px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }}
                th {{ background-color: #f1f5f9; color: #0f172a; font-weight: bold; }}
                tr:nth-child(even) {{ background-color: #f8fafc; }}
                .badge {{ padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }}
                .p1 {{ background-color: #fee2e2; color: #991b1b; }}
                .p2 {{ background-color: #ffedd5; color: #9a3412; }}
                .p3 {{ background-color: #fef9c3; color: #854d0e; }}
                .p4 {{ background-color: #e2e8f0; color: #334155; }}
            </style>
        </head>
        <body>
            <h1>QA Genius AI - Test Case Document</h1>
            <h2>Project: {project['name']} | Total Test Cases: {len(test_cases)}</h2>
            <table>
                <thead>
                    <tr>
                        <th>TC ID</th>
                        <th>Module</th>
                        <th>Scenario</th>
                        <th>Expected Result</th>
                        <th>Priority</th>
                        <th>Conf.</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for item in data:
            p_class = item["Priority"].lower()
            html_content += f"""
                    <tr>
                        <td><b>{item["TC ID"]}</b></td>
                        <td>{item["Module"]}</td>
                        <td>{item["Scenario"]}</td>
                        <td>{item["Expected Result"]}</td>
                        <td><span class="badge {p_class}">{item["Priority"]}</span></td>
                        <td><b>{item["Confidence Score"]}</b></td>
                    </tr>
            """
            
        html_content += """
                </tbody>
            </table>
        </body>
        </html>
        """
        
        response = StreamingResponse(
            iter([html_content]),
            media_type="text/html"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={project['name']}_test_cases.html"
        return response
