"""
Full Generation Script for TIMS Software Requirements Specification (.docx)
Standard: IEEE 830 / ISO/IEC/IEEE 29148
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_borders(cell, top="CCCCCC", bottom="CCCCCC", left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for b_name, b_val in borders.items():
        if b_val:
            border = OxmlElement(f'w:{b_name}')
            border.set(qn('w:val'), 'single')
            border.set(qn('w:sz'), '4')
            border.set(qn('w:space'), '0')
            border.set(qn('w:color'), b_val)
            tcBorders.append(border)
        else:
            border = OxmlElement(f'w:{b_name}')
            border.set(qn('w:val'), 'nil')
            tcBorders.append(border)
    tcPr.append(tcBorders)

def format_paragraph(p, space_before=2, space_after=4, line_spacing=1.15):
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

def add_styled_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    run = h.runs[0]
    run.font.name = "Calibri"
    
    if level == 1:
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(30, 58, 138)  # Deep Navy #1E3A8A
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        pPr = h._p.get_or_add_pPr()
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="1E3A8A"/></w:pBdr>')
        pPr.append(pBdr)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(15, 118, 110)  # Slate Teal #0F766E
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(51, 65, 85)   # Slate Charcoal #334155
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(3)
    return h

def add_body_p(doc, text="", bold_prefix="", italic=False):
    p = doc.add_paragraph()
    format_paragraph(p)
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = "Calibri"
        r_bold.font.size = Pt(10)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(30, 41, 59)
    if text:
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.italic = italic
        r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_point(doc, text, bold_prefix=""):
    p = doc.add_paragraph(style='List Bullet')
    format_paragraph(p, space_before=1, space_after=3, line_spacing=1.12)
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = "Calibri"
        r_bold.font.size = Pt(9.5)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(15, 23, 42)
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_callout_box(doc, title, text_items):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F0FDF4")  # Mint tint
    set_cell_margins(cell, top=140, bottom=140, left=180, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="nil"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="0F766E"/>
            <w:bottom w:val="nil"/>
            <w:right w:val="nil"/>
        </w:tcBorders>
    ''')
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    format_paragraph(p, space_before=0, space_after=4)
    rt = p.add_run(f"📌 {title}\n")
    rt.font.name = "Calibri"
    rt.font.size = Pt(10)
    rt.font.bold = True
    rt.font.color.rgb = RGBColor(15, 118, 110)
    
    for item in text_items:
        pi = cell.add_paragraph()
        format_paragraph(pi, space_before=1, space_after=2)
        if isinstance(item, tuple):
            r_b = pi.add_run(item[0])
            r_b.font.name = "Calibri"
            r_b.font.size = Pt(9)
            r_b.font.bold = True
            r_b.font.color.rgb = RGBColor(30, 41, 59)
            r_t = pi.add_run(item[1])
            r_t.font.name = "Calibri"
            r_t.font.size = Pt(9)
            r_t.font.color.rgb = RGBColor(51, 65, 85)
        else:
            r_t = pi.add_run(f"• {item}")
            r_t.font.name = "Calibri"
            r_t.font.size = Pt(9)
            r_t.font.color.rgb = RGBColor(51, 65, 85)
    doc.add_paragraph()

def format_table(doc, col_widths, headers, rows_data):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        format_paragraph(p, space_before=0, space_after=0)
        r = p.add_run(title)
        r.font.name = "Calibri"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    # Data Rows
    for r_idx, r_data in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(r_data):
            row_cells[c_idx].width = col_widths[c_idx]
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            set_cell_borders(row_cells[c_idx], top="E2E8F0", bottom="E2E8F0")
            p = row_cells[c_idx].paragraphs[0]
            format_paragraph(p, space_before=0, space_after=0)
            r = p.add_run(str(val))
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(51, 65, 85)
            
    doc.add_paragraph() # spacing

def build_srs_document():
    doc = docx.Document()
    
    # Setup page margins
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)
        
        # Header
        header = s.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("TIMS — Township Infrastructure Management System | Software Requirements Specification")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(100, 116, 139)
        
        # Footer
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun = fp.add_run("InfraLynx Enterprise Platform • Standard ISO/IEC/IEEE 29148 / IEEE 830 • Confidential")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # ─────────────────────────────────────────────────────────────────────────
    # COVER / TITLE BLOCK
    # ─────────────────────────────────────────────────────────────────────────
    p_pre = doc.add_paragraph()
    format_paragraph(p_pre, space_before=36, space_after=12)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_org = p_pre.add_run("INFRALYNX ENTERPRISE PLATFORM\n")
    r_org.font.name = "Calibri"
    r_org.font.size = Pt(13)
    r_org.font.bold = True
    r_org.font.color.rgb = RGBColor(15, 118, 110)

    p_title = doc.add_paragraph()
    format_paragraph(p_title, space_before=6, space_after=8)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("TIMS\nTownship Infrastructure Management System")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(26)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(30, 58, 138)

    p_sub = doc.add_paragraph()
    format_paragraph(p_sub, space_before=4, space_after=24)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Software Requirements Specification (SRS)\n")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(15)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    r_desc = p_sub.add_run("Comprehensive Actor Roles, Responsibilities, Data Models & End-to-End Governance Workflow")
    r_desc.font.name = "Calibri"
    r_desc.font.size = Pt(11)
    r_desc.font.italic = True
    r_desc.font.color.rgb = RGBColor(100, 116, 139)

    # Metadata Table
    format_table(
        doc,
        [Inches(2.0), Inches(4.5)],
        ["Document Attribute", "Specification Details"],
        [
            ["System Name", "TIMS (Township Infrastructure Management System) / InfraLynx"],
            ["Document Standard", "ISO/IEC/IEEE 29148 / IEEE 830-1998 Software Requirements Standard"],
            ["Document Version", "2.0 (PostgreSQL Architecture & AMC Workflow Production Baseline)"],
            ["Supersedes", "CRIMS SRS Version 1.0 (Legacy City Model)"],
            ["Database Engine", "PostgreSQL 16 (Neon Cloud Serverless, Strictly Typed Schema)"],
            ["System Architecture", "Multi-Tenant Township SaaS (React 18 Frontend, Express.js Backend)"],
            ["Status / Phase", "Production Baseline / Operational Review"],
            ["Release Date", "October 2026"],
        ]
    )

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT CONTROL & REVISION HISTORY
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "Document Revision History", level=1)
    format_table(
        doc,
        [Inches(0.9), Inches(1.1), Inches(1.5), Inches(3.0)],
        ["Version", "Date", "Author / Role", "Summary of Major Revisions"],
        [
            ["1.0", "Jan 30, 2026", "Domain Expert Team", "Initial generic municipal specification (CRIMS legacy draft)."],
            ["1.5", "Oct 05, 2026", "Engineering Architecture", "Restructured from municipal hierarchy to multi-township model (TIMS); introduced AMC rate contracts and RWA roles."],
            ["2.0", "Oct 15, 2026", "TIMS System Core Team", "Full alignment with live PostgreSQL schema, 7 actor portals, 12-step lifecycle, 3-way invoice reconciliation, and snake_case API harmonization."]
        ]
    )

    # Executive Summary Box
    add_callout_box(
        doc,
        "Executive Summary: Scope & Architectural Realignment",
        [
            ("Core Purpose: ", "TIMS is an enterprise-grade, multi-township infrastructure maintenance and governance platform that automates the complete operational lifecycle from citizen complaint submission, departmental triage, contractor technical inspection, AMC-based rate-card estimation, multi-tier approvals, repair execution, citizen quality verification, finance 3-way reconciliation audit, to staged disbursement."),
            ("Key Paradigm Shift: ", "Unlike legacy municipal models relying on open vendor tenders or warehouse inventory management, TIMS utilizes predefined Annual Maintenance Contracts (AMCs) with immutable rate-card schedules. Billed amounts are derived strictly by multiplying verified work quantities against contractual rates."),
            ("Hard Quality & Financial Gates: ", "Resident/RWA on-ground quality verification is a non-bypassable prerequisite before Finance can authorize payment. Disputed tickets trigger an automated rework loop without financial release.")
        ]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 1: INTRODUCTION
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "1. Introduction", level=1)
    
    add_styled_heading(doc, "1.1 Purpose", level=2)
    add_body_p(doc, "This Software Requirements Specification (SRS) establishes the definitive functional, architectural, non-functional, and data requirements for the Township Infrastructure Management System (TIMS), commercially referred to as InfraLynx. This document serves as the formal contractual and technical baseline for system engineers, backend and frontend developers, quality assurance analysts, township chief operating officers (COOs), and audit personnel.")

    add_styled_heading(doc, "1.2 Document Conventions", level=2)
    add_body_p(doc, "This specification adheres to IEEE 830 / ISO/IEC/IEEE 29148 requirements standards. The following typographic conventions are enforced throughout:")
    add_bullet_point(doc, "Requirements labels follow the hierarchical format [FR-<ACTOR>-<NUMBER>] for Functional Requirements and [NFR-<CATEGORY>-<NUMBER>] for Non-Functional Requirements.", "Requirement Identifiers: ")
    add_bullet_point(doc, "The keywords SHALL (mandatory requirement), SHOULD (recommended best practice), and MAY (optional feature) are interpreted strictly in accordance with RFC 2119.", "Requirement Modality: ")
    add_bullet_point(doc, "All database tables, column names, foreign keys, and API payload properties are standardized in snake_case matching the underlying PostgreSQL schema.", "Case Standardization: ")

    add_styled_heading(doc, "1.3 Intended Audience & Reading Suggestions", level=2)
    add_body_p(doc, "This document is designed for the following stakeholder groups:")
    add_bullet_point(doc, "Township COOs and Municipal Boards seeking understanding of governance workflows, financial limits, and SLA management.", "Executive Stakeholders: ")
    add_bullet_point(doc, "Full-stack engineers implementing REST API contracts, database migrations, authentication, and user interfaces.", "Software Engineers: ")
    add_bullet_point(doc, "Finance Officers, Internal Auditors, and RWA Representatives reviewing 3-way invoice matching and quality verification gates.", "Auditors & Domain Specialists: ")

    add_styled_heading(doc, "1.4 Product Scope", level=2)
    add_body_p(doc, "TIMS provides a multi-tenant, cloud-based platform for modern managed townships, residential enclaves, and private municipal developments. The platform governs six critical infrastructural domains:")
    add_bullet_point(doc, "Arterial asphalt roads, stormwater drains, pedestrian walkways, manhole chambers, footpaths, and structural road fixtures.", "Civil Infrastructure & Roads: ")
    add_bullet_point(doc, "11kV transformers, feeder pillars, underground armored cabling, high-mast towers, and automated streetlight grids.", "Electrical & Power Distribution: ")
    add_bullet_point(doc, "Potable drinking water networks, 150mm DI pipelines, sluice valves, sewage treatment lines, and hydro-pneumatic pumping stations.", "Water Supply & Drainage Sanitation: ")
    add_bullet_point(doc, "Central parks, community green belts, mechanical tree pruning, green-waste shredding, and solid-waste segregation.", "Horticulture & Urban Waste Management: ")

    add_styled_heading(doc, "1.5 Scope Boundary & Exclusions", level=2)
    add_body_p(doc, "To maintain high operational focus and prevent architectural bloat, the following areas are explicitly excluded from the current TIMS scope:")
    add_bullet_point(doc, "TIMS does not manage township-owned warehouses or inventory stock. Material procurement is handled externally by empanelled contractors under AMC terms.", "Warehouse & Stock Inventory: ")
    add_bullet_point(doc, "Real-time satellite GPS tracking of personnel is deferred to future releases. Location is strictly captured via Township -> Sector -> Block -> Street hierarchy.", "Real-Time GPS Tracking: ")
    add_bullet_point(doc, "TIMS generates payment authorizations, vouchers, and UTR references; direct banking gateway settlement is performed via external escrow/RTGS channels.", "Direct Escrow Settlement: ")

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 2: OVERALL SYSTEM DESCRIPTION
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "2. Overall System Description", level=1)

    add_styled_heading(doc, "2.1 Product Perspective & Multi-Township Architecture", level=2)
    add_body_p(doc, "TIMS operates as a secure, cloud-hosted SaaS platform serving multiple townships on a shared database with strict tenant isolation. The platform separates operational authority across seven distinct actor roles:")
    
    # 7 Actors Table
    format_table(
        doc,
        [Inches(1.8), Inches(1.1), Inches(3.6)],
        ["System Actor", "Actor Type", "Core Operational Responsibilities"],
        [
            ["1. RWA Representative", "External / Resident", "Submit infrastructure complaints with location details and photos; track progress; verify completed work; dispute unsatisfactory repairs."],
            ["2. Desk Clerk", "Internal / Operations", "Triage departmental queues; execute 100m duplicate checks; validate tickets; create Work Orders; dispatch empanelled AMC contractors."],
            ["3. Field Contractor", "External / Field Crew", "Conduct on-site technical inspection; record findings; generate AMC rate-card estimates; execute repairs; submit mandatory after-work photos."],
            ["4. Department Head", "Internal / Management", "Manage departmental staff; create Desk Clerks; review and approve/reject estimates; participate in COO joint escalations; monitor SLAs."],
            ["5. Finance Clerk / Team", "Internal / Fiscal Audit", "Administer contractor AMC contracts & rate cards; perform 3-way reconciliation audit; flag variances; authorize payments post-RWA confirmation; record UTR disbursements."],
            ["6. Township COO", "Internal / Executive", "Township-wide executive dashboard; configure departments & department heads; approve major expenditure (> ₹100,000); review audit logs."],
            ["7. Platform Super Admin", "Global SaaS Operator", "Onboard new township tenants; manage subscription tiers; configure global SLA and financial approval thresholds; enforce security kill-switches."]
        ]
    )

    add_styled_heading(doc, "2.2 Operating Environment & Technology Stack", level=2)
    add_bullet_point(doc, "React 18 Single Page Application (SPA), Vite build system, Tailwind CSS / Vanilla CSS modern tokens, Lucide icon system, and Responsive Role Portals.", "Frontend Layer: ")
    add_bullet_point(doc, "Node.js (v20+ LTS), Express.js (v4.19+), RESTful JSON micro-routes, Multer multipart upload parser, and JWT security middleware.", "Backend Layer: ")
    add_bullet_point(doc, "Neon Cloud Serverless PostgreSQL 16, pg connection pooling, parameterized queries, and strict relational foreign keys.", "Database Engine: ")
    add_bullet_point(doc, "Standard HTTP/HTTPS (port 443/5000), JSON payloads, Bearer JWT authorization tokens.", "Network Protocol: ")

    add_styled_heading(doc, "2.3 Design & Implementation Constraints", level=2)
    add_bullet_point(doc, "All database queries MUST enforce WHERE township_id = req.user.township_id. Cross-township leakage is strictly prohibited.", "Tenant Isolation Constraint: ")
    add_bullet_point(doc, "Desk Clerks and Department Heads CANNOT view or authorize tickets belonging to another department.", "Department Scoping Constraint: ")
    add_bullet_point(doc, "Estimates cannot use arbitrary contractor-submitted rates. The backend fetches official rates from amc_rates and calculates quantity × rate.", "AMC Rate Integrity Constraint: ")
    add_bullet_point(doc, "Finance cannot release payment until the RWA Representative confirms on-ground quality (status = CLOSED/VERIFIED).", "Verification Gate Constraint: ")
    add_bullet_point(doc, "Complaint status, Work Order status, Invoice status, and Payment status MUST be tracked separately.", "Decoupled Status Lifecycles: ")

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 3: FUNCTIONAL REQUIREMENTS BY ACTOR
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "3. System Features & Functional Requirements", level=1)

    # 3.1 RWA
    add_styled_heading(doc, "3.1 RWA Representative Functions", level=2)
    add_body_p(doc, "The Resident Welfare Association (RWA) Representative acts as the primary liaison between community residents and township engineering operations.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-RWA-01", "Complaint Submission", "The system shall permit RWA users to file infrastructure complaints specifying category, subcategory, severity, sector, block, street, landmark, and photo evidence."],
            ["FR-RWA-02", "Public Reference Code", "The system shall automatically generate a unique public tracking code (format: CMP-YYYY-XXXX) upon successful complaint registration."],
            ["FR-RWA-03", "Complaint Tracking", "The system shall allow RWA users to view real-time ticket status, SLA countdown, assigned contractor details, and before/after photo evidence."],
            ["FR-RWA-04", "Citizen Quality Verification", "The system shall require the RWA representative to inspect completed work and record a rating (1-5 stars) and verification remarks."],
            ["FR-RWA-05", "Dispute & Rework Loop", "The system shall allow RWA users to dispute unsatisfactory repairs with mandatory reasoning, transitioning the ticket to DISPUTED and triggering contractor rework."],
            ["FR-RWA-06", "Auto-Closure Policy", "The system shall automatically close tickets if the RWA does not respond within the township's configured auto_close_hours (default: 72 hours)."]
        ]
    )

    # 3.2 Desk Clerk
    add_styled_heading(doc, "3.2 Desk Clerk Functions", level=2)
    add_body_p(doc, "Desk Clerks are operational coordinators managing departmental triage queues, deduplication, and contractor dispatch.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-CLK-01", "Triage Queue Review", "The system shall present incoming complaints in a departmental triage queue strictly filtered by the clerk's assigned department and township."],
            ["FR-CLK-02", "100m Duplicate Detection", "The system shall automatically calculate spatial proximity and identify existing active complaints within a 100-meter radius of the reported location."],
            ["FR-CLK-03", "Duplicate Linking", "The system shall allow clerks to link confirmed duplicates to a master complaint, marking child complaints as LINKED_AS_DUPLICATE."],
            ["FR-CLK-04", "Validation & Rerouting", "The system shall permit clerks to validate legitimate issues, reject false reports with reasoning, or reroute misclassified complaints to the correct department."],
            ["FR-CLK-05", "Work Order Generation", "The system shall convert validated complaints into formal Work Orders with auto-generated identifiers (format: WO-YYYY-XXXX)."],
            ["FR-CLK-06", "Contractor Assignment", "The system shall validate contractor eligibility (active status, township authorization, valid AMC contract) before permitting work order assignment."],
            ["FR-CLK-07", "Escalation Engine", "The system shall allow clerks to escalate delayed work orders or critical safety emergencies directly to the Department Head."]
        ]
    )

    # 3.3 Field Contractor
    add_styled_heading(doc, "3.3 Field Contractor Functions", level=2)
    add_body_p(doc, "Empanelled contractors carry out physical on-ground inspections, estimate preparations, and remedial maintenance.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-CNT-01", "Inspection Task List", "The system shall display assigned work orders in the contractor's inspection queue with priority, location, and SLA deadlines."],
            ["FR-CNT-02", "Mandatory Site Inspection", "The system shall enforce physical site inspection and before-work photo upload before allowing the contractor to generate a financial estimate."],
            ["FR-CNT-03", "AMC Rate-Card Estimation", "The system shall require contractors to select line items from active AMC rate cards. The system calculates quantity × rate and prevents client-side price tampering."],
            ["FR-CNT-04", "Historical Rate Snapshot", "The system shall store an immutable rate snapshot in estimate_items so subsequent AMC contract renewals do not retroactively alter historic estimates."],
            ["FR-CNT-05", "Execution State Transitions", "The system shall allow contractors to transition approved work orders to IN_PROGRESS upon field mobilization."],
            ["FR-CNT-06", "Completion Proof Submission", "The system shall mandate the upload of after-repair photographs and actual work logs before allowing transition to COMPLETED."],
            ["FR-CNT-07", "Dispute Remediation", "The system shall automatically re-queue disputed tickets in the contractor's active jobs list with resident dispute remarks for mandatory corrective action."]
        ]
    )

    # 3.4 Department Head
    add_styled_heading(doc, "3.4 Department Head Functions", level=2)
    add_body_p(doc, "Department Heads govern departmental personnel, supervise SLA compliance, and authorize expenditures.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-DHD-01", "Staff Account Provisioning", "The system shall permit Department Heads to create Desk Clerk accounts strictly locked to their own department and township."],
            ["FR-DHD-02", "Staff Status Management", "The system shall permit Department Heads to activate, suspend, or terminate employee accounts under their departmental jurisdiction."],
            ["FR-DHD-03", "Estimate Sign-Off", "The system shall present all contractor-submitted estimates for Department Head approval, revision request, or rejection."],
            ["FR-DHD-04", "Mandatory Rejection Reason", "The system shall require mandatory explanatory notes whenever an estimate is rejected or returned for revision."],
            ["FR-DHD-05", "COO Joint Escalation", "The system shall forward estimates exceeding the departmental approval threshold (> ₹10,000) to the Township COO for executive co-approval."],
            ["FR-DHD-06", "Department Analytics", "The system shall display real-time departmental KPIs: ticket volume, SLA compliance %, total expenditure, and contractor scorecard."],
            ["FR-DHD-07", "Cross-Department Isolation", "The system shall strictly block Department Heads from viewing, approving, or modifying records belonging to other departments (HTTP 403 Forbidden)."]
        ]
    )

    # 3.5 Finance Team
    add_styled_heading(doc, "3.5 Finance Clerk / Team Functions", level=2)
    add_body_p(doc, "The Finance Team oversees contractor contracts, audits billing against contractual AMC rate cards, and manages staged payment releases.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-FIN-01", "AMC Contract Administration", "The system shall allow Finance to register contractors, establish AMC validity periods, and define itemized rate cards."],
            ["FR-FIN-02", "Automated 3-Way Check", "The system shall execute an automated 3-way reconciliation comparing: (1) Approved Estimate, (2) Actual Work/Evidence, and (3) Contractor Invoice."],
            ["FR-FIN-03", "Variance Detection & Flagging", "The system shall automatically detect cost or quantity discrepancies exceeding tolerance thresholds and mark invoices as VARIANCE_FLAGGED."],
            ["FR-FIN-04", "Variance Justification", "The system shall allow Finance officers to record audit notes justifying legitimate material overruns before authorization."],
            ["FR-FIN-05", "Pre-Payment Verification Gate", "The system SHALL block invoice authorization if RWA quality verification is pending or disputed (HTTP 400 RWA_VERIFICATION_REQUIRED)."],
            ["FR-FIN-06", "Payment Authorization", "The system shall permit Finance to authorize verified invoices, transitioning them to AUTHORIZED."],
            ["FR-FIN-07", "Disbursement & UTR Logging", "The system shall record actual bank disbursement details: payment mode (RTGS/Escrow), banking UTR reference, and disbursement timestamp."],
            ["FR-FIN-08", "Separate Status Tracking", "The system shall maintain decoupled lifecycles: work_order_status, invoice_status, and payment_status shall never be conflated."]
        ]
    )

    # 3.6 Township COO
    add_styled_heading(doc, "3.6 Township COO Functions", level=2)
    add_body_p(doc, "The Township Chief Operating Officer (COO) holds top-level executive governance across all departments within the township.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-COO-01", "Executive Command Center", "The system shall display township-wide operational summaries: total complaints, open work orders, departmental budgets, and SLA breach rates."],
            ["FR-COO-02", "Department Administration", "The system shall allow the COO to create departments, modify operational budgets, and activate/deactivate departments."],
            ["FR-COO-03", "Department Head Assignment", "The system shall permit the COO to assign Department Heads to departments, enforcing a strict 1-to-1 head occupancy rule."],
            ["FR-COO-04", "Major Expenditure Approval", "The system shall present estimates exceeding the major capital threshold (> ₹100,000) or escalated from departments for executive sign-off."],
            ["FR-COO-05", "Deep Dossier Inspection", "The system shall provide a unified Work Order Dossier displaying complaint history, evidence photos, audit log, AMC rate cards, and financial status."],
            ["FR-COO-06", "Emergency Intervention", "The system shall allow the COO to intervene and escalate critical life-safety tickets directly to executive status."]
        ]
    )

    # 3.7 Super Admin
    add_styled_heading(doc, "3.7 Platform Super Administrator Functions", level=2)
    add_body_p(doc, "The Platform Super Admin operates outside individual townships, managing multi-tenant SaaS health, billing tiers, and global system parameters.")
    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Requirement ID", "Feature / Function", "Functional Specification"],
        [
            ["FR-ADM-01", "Township Tenant Onboarding", "The system shall permit Super Admins to provision new township instances with assigned subscription plans and initial admin credentials."],
            ["FR-ADM-02", "Tenant Suspension Kill-Switch", "The system shall allow Super Admins to suspend delinquent townships, instantly revoking all active JWT user tokens across that tenant."],
            ["FR-ADM-03", "Global Workflow Rules", "The system shall allow Super Admins to configure global SLA thresholds and approval limits across the entire platform."],
            ["FR-ADM-04", "Storage & DB Health Monitoring", "The system shall provide real-time connection telemetry for PostgreSQL storage, active connections, and table row counts."],
            ["FR-ADM-05", "Platform Super Audit Log", "The system shall record an immutable super_audit_logs record for every administrative configuration change with before/after state."]
        ]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 4: END-TO-END WORKFLOW (12 STEPS)
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "4. End-to-End Operational Workflow", level=1)
    add_body_p(doc, "TIMS executes a highly coordinated, 12-step governance workflow that synchronizes field repairs with financial accountability:")

    steps = [
        ("Step 1 — Complaint Submission (RWA Representative)", 
         "A resident or RWA Representative observes an infrastructure defect and submits a complaint via the portal. The complaint captures category, subcategory, severity (LOW, MEDIUM, HIGH, EMERGENCY), sector, block, street, landmark, and initial photos. The system generates a tracking code (CMP-YYYY-XXXX) and calculates the SLA deadline."),
        
        ("Step 2 — Triage and Duplicate Review (Desk Clerk)", 
         "The complaint enters the relevant department triage queue. The Desk Clerk verifies photo clarity and executes a 100-meter duplicate check. If nearby duplicate tickets exist, the clerk links them to the master ticket. Invalid or prank complaints are rejected with mandatory notes."),
        
        ("Step 3 — Validate and Create Work Order (Desk Clerk)", 
         "Once validated, the clerk converts the complaint into an official Work Order (WO-YYYY-XXXX). The clerk selects an eligible empanelled contractor based on active status, township jurisdiction, and valid AMC coverage."),
        
        ("Step 4 — Technical Site Inspection (Field Contractor)", 
         "The assigned work order appears in the contractor's inspection list. The contractor visits the physical location, identifies the root cause, calculates required labor hours and materials, and uploads mandatory 'BEFORE' condition photos."),
        
        ("Step 5 — AMC-Based Estimate Preparation (Field Contractor)", 
         "The contractor selects line items from the official AMC rate card. The system automatically retrieves contractual unit rates, computes line-item totals (quantity × rate), and stores an immutable rate snapshot. The contractor cannot enter arbitrary custom unit rates."),
        
        ("Step 6 — Estimate Approval (Department Head and COO)", 
         "The contractor submits the estimate. It is routed to the Department Head for review. Under configurable threshold rules: estimates up to ₹10,000 are approved by Department Head; estimates between ₹10,000 and ₹100,000 require Department Head approval; estimates above ₹100,000 require joint COO sign-off. Rejected estimates return to the contractor for revision."),
        
        ("Step 7 — Work Execution (Field Contractor)", 
         "Upon final approval, the work order status changes to ASSIGNED / IN_PROGRESS. The contractor mobilizes field crews, procures materials under AMC terms, and carries out physical repairs."),
        
        ("Step 8 — Completion Submission & Evidence (Field Contractor)", 
         "When repairs are completed, the contractor records actual quantities consumed, enters completion remarks, uploads mandatory 'AFTER' completion photos, and marks the work order COMPLETED."),
        
        ("Step 9 — Citizen Quality Verification & Dispute Loop (RWA)", 
         "The work order transitions to PENDING_VERIFICATION. The RWA Representative visits the site. If satisfied, they confirm the fix (rating 1-5 stars), transitioning the complaint to CLOSED. If unsatisfied, the RWA submits a dispute reason, which reopens the ticket to IN_PROGRESS for contractor rework."),
        
        ("Step 10 — Invoice Audit & 3-Way Reconciliation (Finance)", 
         "The contractor submits their billing invoice. Finance performs an automated 3-way check comparing: (1) Approved Estimate, (2) Actual Work Evidence, and (3) Contractor Invoice. Cost variances exceeding tolerances are flagged for justification."),
        
        ("Step 11 — Payment Authorization & Disbursement (Finance)", 
         "Strict Quality Gate: Finance is blocked from authorizing payment until RWA verification is confirmed (status = CLOSED). Once verified and 3-way audit passes, Finance authorizes the invoice and logs the bank disbursement with UTR reference number."),
        
        ("Step 12 — Closure and Comprehensive Recordkeeping", 
         "The work order is closed. The system preserves a permanent, tamper-evident audit history linking complaint, work order, estimates, evidence photos, RWA ratings, invoice, and payment disbursement.")
    ]

    for title, desc in steps:
        add_styled_heading(doc, title, level=2)
        add_body_p(doc, desc)

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 5: LIFECYCLE STATE TRANSITIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "5. Lifecycle State Models & State Transitions", level=1)
    add_body_p(doc, "TIMS decouples operational tracking across four independent state machines to ensure financial and technical integrity:")

    add_styled_heading(doc, "5.1 Complaint Lifecycle States", level=2)
    format_table(
        doc,
        [Inches(1.8), Inches(2.2), Inches(2.5)],
        ["Complaint State", "Allowed Next States", "Triggering Event / Actor"],
        [
            ["REPORTED", "UNDER_REVIEW, REJECTED", "RWA files complaint / Desk Clerk opens triage."],
            ["UNDER_REVIEW", "VALIDATED, REJECTED, LINKED_AS_DUPLICATE", "Desk Clerk checks 100m radius and verifies photos."],
            ["VALIDATED", "WORK_ORDER_CREATED, AWAITING_DEPT_HEAD", "Desk Clerk converts issue to Work Order."],
            ["WORK_ORDER_CREATED", "IN_PROGRESS, AWAITING_DEPT_HEAD", "Contractor assigned; estimate routed."],
            ["IN_PROGRESS", "COMPLETED, PENDING_VERIFICATION", "Contractor finishes on-ground repair."],
            ["PENDING_VERIFICATION", "CLOSED, DISPUTED, VERIFIED", "Contractor uploads AFTER photos; awaiting RWA review."],
            ["DISPUTED", "IN_PROGRESS", "RWA rejects quality; ticket reopened for contractor rework."],
            ["CLOSED", "None (Terminal State)", "RWA confirms fix or auto-closure timer expires."]
        ]
    )

    add_styled_heading(doc, "5.2 Work Order Lifecycle States", level=2)
    format_table(
        doc,
        [Inches(1.8), Inches(2.2), Inches(2.5)],
        ["Work Order State", "Allowed Next States", "Triggering Event / Actor"],
        [
            ["ASSIGNED", "INSPECTION_PENDING, ESTIMATE_SUBMITTED", "Contractor deployed to site."],
            ["INSPECTION_PENDING", "ESTIMATE_SUBMITTED", "Contractor completes site survey."],
            ["ESTIMATE_SUBMITTED", "AWAITING_DEPT_HEAD, PENDING_APPROVAL", "Contractor submits AMC rate estimate."],
            ["AWAITING_DEPT_HEAD", "APPROVED, REVISION_REQUESTED, REJECTED, AWAITING_COO", "Department Head reviews estimate."],
            ["AWAITING_COO", "APPROVED, REVISION_REQUESTED, REJECTED", "COO reviews major capital expenditure."],
            ["APPROVED", "IN_PROGRESS", "Required sign-offs complete; crew mobilizes."],
            ["IN_PROGRESS", "COMPLETED, REWORK_REQUESTED", "Contractor executes repair work."],
            ["COMPLETED", "CLOSED, REWORK_REQUESTED", "Work verified; ready for final archival."],
            ["CLOSED", "None (Terminal State)", "Final payment released and work settled."]
        ]
    )

    add_styled_heading(doc, "5.3 Invoice & Payment Lifecycle States", level=2)
    format_table(
        doc,
        [Inches(1.8), Inches(2.2), Inches(2.5)],
        ["Entity & State", "Allowed Next States", "Governance Rules"],
        [
            ["Invoice: PENDING_AUDIT", "VARIANCE_FLAGGED, AUTHORIZED", "Finance conducts 3-way rate reconciliation."],
            ["Invoice: VARIANCE_FLAGGED", "AUTHORIZED, REJECTED", "Requires officer justification notes to proceed."],
            ["Invoice: AUTHORIZED", "PAID", "RWA verification MUST be confirmed prior to payment."],
            ["Invoice: PAID", "None (Terminal State)", "Bank UTR logged; ledger settled."],
            ["Payment: SCHEDULED", "PROCESSING, DISBURSED", "Payment queued in escrow batch."],
            ["Payment: DISBURSED", "None (Terminal State)", "RTGS transfer confirmed; voucher archived."]
        ]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 6: KEY BUSINESS RULES & VERIFICATION GATES
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "6. Key Business Rules & Verification Gates", level=1)
    
    rules = [
        ("BR-01: Strict Multi-Tenant Isolation",
         "All database transactions and API endpoints must scope queries by req.user.township_id. A user from Township A cannot view, edit, or authorize records from Township B. Violations result in immediate HTTP 403 Forbidden responses."),
        
        ("BR-02: Departmental Boundary Enforcement",
         "Department Heads and Desk Clerks are restricted strictly to their assigned department (e.g., Civil, Electrical, Water). Cross-department authorization attempts are denied by middleware, with exceptions granted only to the Township COO."),
        
        ("BR-03: AMC Rate Integrity & Snapshotting",
         "Contractors cannot submit arbitrary unit prices. The backend retrieves official rates from amc_rates and calculates totals. When an estimate is stored, line-item rate snapshots are permanently frozen so subsequent contract renewals never alter past financials."),
        
        ("BR-04: Mandatory Site Inspection Before Estimate",
         "A contractor is strictly prohibited from submitting a financial estimate without first submitting physical site inspection notes and 'BEFORE' condition evidence."),
        
        ("BR-05: Mandatory RWA Verification Payment Gate",
         "Finance is programmatically blocked from authorizing invoice payment while RWA quality verification is pending, disputed, or unconfirmed. Citizen satisfaction on the ground is an immovable fiscal gate."),
        
        ("BR-06: 3-Way Reconciliation Audit Gate",
         "Every contractor invoice must be reconciled against the approved estimate, field evidence, and official AMC rates. Any financial variance exceeding configured tolerances requires written officer justification before payment approval."),
        
        ("BR-07: Separate Status Lifecycles",
         "Under no circumstances shall Work Order progress, Invoice audit status, and Payment disbursement be collapsed into a single status field. Each entity maintains its own independent state machine."),
        
        ("BR-08: Complete Auditability",
         "Every status modification, financial approval, dispute, and administrative reconfiguration must be logged in audit_logs or super_audit_logs with user ID, timestamps, before/after snapshots, and client IP.")
    ]

    for title, desc in rules:
        add_body_p(doc, desc, bold_prefix=f"{title}: ")

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 7: NON-FUNCTIONAL REQUIREMENTS
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "7. Non-Functional Requirements (NFRs)", level=1)
    
    format_table(
        doc,
        [Inches(1.5), Inches(1.8), Inches(3.2)],
        ["NFR Identifier", "Category", "Quality Attribute Specification"],
        [
            ["NFR-PERF-01", "Performance & Latency", "API endpoints shall respond within 300 milliseconds under normal operating loads (50 concurrent requests per township)."],
            ["NFR-PERF-02", "Database Query Limits", "Parameterized PostgreSQL queries shall execute in under 50 milliseconds utilizing primary keys, UUID indexes, and compound foreign keys."],
            ["NFR-SEC-01", "Password Security", "User passwords shall be salted and hashed using Bcrypt with a work factor of 12 rounds before database persistence."],
            ["NFR-SEC-02", "Token Authentication", "System access shall require signed JSON Web Tokens (JWT) with configurable expiration (default: 24 hours), carrying user ID, role, township_id, and department_id."],
            ["NFR-SEC-03", "Injection Prevention", "All database operations shall use parameterized queries ($1, $2) to eliminate SQL injection vulnerabilities."],
            ["NFR-SEC-04", "File Upload Safety", "Uploaded photo evidence shall be validated against mime types (image/jpeg, image/png, image/webp) with file sizes capped at 10MB."],
            ["NFR-REL-01", "High Availability", "The system shall achieve 99.9% uptime during operational business hours, backed by serverless Neon PostgreSQL autoscaling."],
            ["NFR-DATA-01", "Relational Integrity", "All database tables shall enforce strict foreign key constraints (ON DELETE RESTRICT / CASCADE) to prevent orphaned records."],
            ["NFR-AUD-01", "Audit Immutability", "Audit trail records (audit_logs) shall be append-only with no UPDATE or DELETE permissions granted to standard operational roles."]
        ]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 8: DATA ARCHITECTURE & DATABASE SCHEMA
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "8. Data Architecture & Database Schema Overview", level=1)
    add_body_p(doc, "The TIMS database architecture is implemented on PostgreSQL 16 using strictly typed relational tables, custom ENUM types, and UUID primary keys. Below is an overview of the core architectural entities:")

    format_table(
        doc,
        [Inches(1.5), Inches(2.0), Inches(3.0)],
        ["Database Table", "Primary Key & Foreign Keys", "Description & Schema Scope"],
        [
            ["townships", "id (UUID)", "Township tenant profile: name, city, state, pincode, status (ACTIVE/SUSPENDED)."],
            ["departments", "id (UUID), fk_township, fk_head", "Infrastructure departments: Civil, Electrical, Water, Horticulture."],
            ["users", "id (UUID), fk_township, fk_dept, fk_contractor", "System users across 7 roles with hashed passwords, status, and contact details."],
            ["contractors", "id (UUID), fk_township", "Empanelled vendor companies: company_name, GSTIN, primary work category, status."],
            ["amcs", "id (UUID), fk_township, fk_contractor, fk_dept", "Annual Maintenance Contracts: contract_number, start_date, end_date, title."],
            ["amc_rates", "id (UUID), fk_amc", "Itemized rate cards: item_code, item_name, service_type, unit, official rate."],
            ["complaints", "id (UUID), fk_township, fk_dept, fk_reporter", "Infrastructure complaints: complaint_code (CMP-...), severity, sector, block, street, status."],
            ["work_orders", "id (UUID), fk_complaint, fk_contractor, fk_dept", "Remediation work orders: work_order_number (WO-...), priority, status, due_at."],
            ["estimates", "id (UUID), fk_work_order, fk_contractor", "Financial estimates: total_amount, status, submitted_at, approved_at."],
            ["estimate_items", "id (UUID), fk_estimate, fk_amc_rate", "Itemized estimate lines: quantity, rate_snapshot, calculated amount."],
            ["invoices", "id (UUID), fk_work_order, fk_contractor", "Contractor bills: invoice_code, subtotal, tax, total_amount, variance_amount, status."],
            ["payments", "id (UUID), fk_invoice, fk_contractor", "Disbursement records: amount, payment_mode, payment_reference (UTR), status, paid_at."],
            ["audit_logs", "id (UUID), fk_township, fk_user", "Immutable audit trail: entity_type, entity_id, action, old_value, new_value, timestamp."]
        ]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 9: GLOSSARY & ACRONYMS
    # ─────────────────────────────────────────────────────────────────────────
    add_styled_heading(doc, "9. Glossary and Definitions", level=1)
    
    format_table(
        doc,
        [Inches(1.5), Inches(5.0)],
        ["Term / Acronym", "Definition and Context"],
        [
            ["AMC", "Annual Maintenance Contract: Formal municipal agreement with pre-negotiated fixed rates for infrastructure labor, services, and materials."],
            ["RWA", "Resident Welfare Association: Official elected body representing homeowners and tenants in a residential sector or gated township."],
            ["Desk Clerk", "Operational coordinator responsible for initial complaint triage, photo verification, 100m duplicate detection, and work order creation."],
            ["Field Contractor", "Empanelled commercial vendor contracted under an active AMC to perform physical site inspections and repairs."],
            ["Department Head", "Managerial executive leading a specialized engineering domain (Civil, Electrical, Water), holding budget approval authority."],
            ["Township COO", "Chief Operating Officer: Executive holding ultimate administrative and operational authority across all township departments."],
            ["Rate Card", "Schedule of itemized unit rates (e.g., RATE-01: Senior Electrician @ ₹500/hr) bound to an AMC contract."],
            ["3-Way Check", "Automated reconciliation audit comparing: (1) Approved Estimate, (2) Field Work Evidence, and (3) Contractor Invoice."],
            ["UTR", "Unique Transaction Reference: Official alphanumeric bank identifier generated upon completion of an RTGS/NEFT payment."],
            ["SLA", "Service Level Agreement: Maximum allowable time window for resolving a complaint based on its severity rating (Emergency: 24h, High: 48h, etc.)."]
        ]
    )

    # Save to Documentation folder
    out_dir = r"c:\Users\Raman Gupta\OneDrive\CS\FED\4_InfraLynx\Documentation"
    out_file = os.path.join(out_dir, "TIMS_Software_Requirements_Specification.docx")
    doc.save(out_file)
    print(f"Successfully generated TIMS SRS Document: {out_file}")

if __name__ == "__main__":
    build_srs_document()
