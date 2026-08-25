import os
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from app.config import settings

def generate_pdf_report(event, output_path: Path) -> Path:
    """
    Generates a high-quality, professional municipal dispatch PDF report using ReportLab.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#0284c7")     # Sky blue
    DARK = colors.HexColor("#0f172a")        # Slate 900
    MUTED = colors.HexColor("#64748b")       # Slate 500
    LIGHT_BG = colors.HexColor("#f8fafc")    # Slate 50
    BORDER_CLR = colors.HexColor("#e2e8f0")  # Slate 200
    
    # Severity Color
    sev = (event.severity or "MEDIUM").upper()
    if sev == "CRITICAL":
        SEV_BG = colors.HexColor("#ffe4e6")
        SEV_FG = colors.HexColor("#e11d48")
    elif sev == "HIGH":
        SEV_BG = colors.HexColor("#fef3c7")
        SEV_FG = colors.HexColor("#d97706")
    elif sev == "LOW":
        SEV_BG = colors.HexColor("#f1f5f9")
        SEV_FG = colors.HexColor("#475569")
    else:
        SEV_BG = colors.HexColor("#e0f2fe")
        SEV_FG = colors.HexColor("#0284c7")

    story = []
    
    # --- 1. HEADER BANNER ---
    header_data = [
        [
            Paragraph("<font size=16 color='#0f172a'><b>VIGILANT VISION</b></font><br/><font size=9 color='#64748b'>Smart Road & Border Video Analytics Platform</font>", styles['Normal']),
            Paragraph(f"<font size=11 color='#0284c7'><b>OFFICIAL INCIDENT DISPATCH</b></font><br/><font size=8 color='#64748b'>Report ID: <b>REP-{event.event_id}</b><br/>Date: <b>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</b></font>", styles['Normal'])
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 220])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=2, spaceAfter=14))
    
    # --- 2. DEFECT SUMMARY TABLE ---
    event_type_display = (event.event_type or "DEFECT_DETECTED").replace("_", " ")
    
    summary_data = [
        [
            Paragraph("<b>Event ID:</b>", styles['Normal']),
            Paragraph(f"<b>{event.event_id}</b>", styles['Normal']),
            Paragraph("<b>Severity Rating:</b>", styles['Normal']),
            Paragraph(f"<font color='{SEV_FG.hexval()}'><b>{sev}</b></font>", styles['Normal'])
        ],
        [
            Paragraph("<b>Defect Type:</b>", styles['Normal']),
            Paragraph(f"<b>{event_type_display}</b>", styles['Normal']),
            Paragraph("<b>Status:</b>", styles['Normal']),
            Paragraph(f"<b>{event.status or 'VERIFIED'}</b>", styles['Normal'])
        ],
        [
            Paragraph("<b>Camera Node:</b>", styles['Normal']),
            Paragraph(f"{event.camera_id or 'CAM-01'}", styles['Normal']),
            Paragraph("<b>Video Offset / Frame:</b>", styles['Normal']),
            Paragraph(f"{event.timestamp or '00:00.000'} (Frame #{event.frame_number or 0})", styles['Normal'])
        ],
        [
            Paragraph("<b>Location / Sector:</b>", styles['Normal']),
            Paragraph(f"{event.location or 'National Highway NH-44'}", styles['Normal']),
            Paragraph("<b>GPS Coordinates:</b>", styles['Normal']),
            Paragraph(f"{event.latitude or 28.6139:.4f}, {event.longitude or 77.2090:.4f}", styles['Normal'])
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[110, 160, 120, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_CLR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))
    
    # --- 3. FORENSIC NOTE ---
    note_text = event.description or "Automated detection of road surface irregularity requiring municipal remediation."
    note_data = [[
        Paragraph(f"<b>Forensic AI Description:</b> {note_text}", styles['Normal'])
    ]]
    note_table = Table(note_data, colWidths=[540])
    note_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#bae6fd")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(note_table)
    story.append(Spacer(1, 14))
    
    # --- 4. FORENSIC EVIDENCE SNAPSHOT ---
    story.append(Paragraph("<font size=11 color='#0f172a'><b>Forensic Evidence Snapshot (CCTV Capture)</b></font>", styles['Normal']))
    story.append(Spacer(1, 6))
    
    evidence_img_path = None
    if event.evidence_path:
        possible_paths = [
            settings.BASE_DIR / event.evidence_path,
            settings.BASE_DIR / "evidence" / Path(event.evidence_path).name,
            settings.EVIDENCE_DIR / Path(event.evidence_path).name,
        ]
        for p in possible_paths:
            if p.exists() and p.is_file():
                evidence_img_path = p
                break
                
    if evidence_img_path:
        try:
            # Aspect-ratio preserving width 540, height 260
            img = RLImage(str(evidence_img_path), width=540, height=260)
            img_table = Table([[img]], colWidths=[540])
            img_table.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#0f172a")),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            story.append(img_table)
        except Exception as e:
            story.append(Paragraph(f"<font color='red'>Error loading evidence snapshot: {e}</font>", styles['Normal']))
    else:
        no_img_table = Table([[Paragraph("<font color='#64748b'>No visual snapshot captured for this event.</font>", styles['Normal'])]], colWidths=[540])
        no_img_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_CLR),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 20),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ]))
        story.append(no_img_table)
        
    story.append(Spacer(1, 14))
    
    # --- 5. DISPATCH & ACTION DETAILS ---
    dispatch_data = [
        [
            Paragraph("<b>Target Authority:</b>", styles['Normal']),
            Paragraph("Municipal Corporation / PWD Highways & Traffic Safety Cell", styles['Normal']),
            Paragraph("<b>Dispatch Priority:</b>", styles['Normal']),
            Paragraph(f"<b>{sev} - Immediate Remediation</b>", styles['Normal'])
        ],
        [
            Paragraph("<b>Recommended Action:</b>", styles['Normal']),
            Paragraph("Deploy road maintenance crew, dispatch asphalt patch/drainage unit, update GIS alert index.", styles['Normal']),
            Paragraph("<b>Verification:</b>", styles['Normal']),
            Paragraph("Automated AI YOLOv8 + OpenCV Seal", styles['Normal'])
        ]
    ]
    dispatch_table = Table(dispatch_data, colWidths=[120, 200, 110, 110])
    dispatch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_CLR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(dispatch_table)
    
    story.append(Spacer(1, 14))
    
    # --- 6. FOOTER WITH DIGITAL STAMP ---
    footer_data = [
        [
            Paragraph("<font size=7 color='#64748b'>This is a digitally generated municipal dispatch document by Vigilant Vision AI Surveillance Platform.<br/>Authorized for automated law enforcement and public works coordination.</font>", styles['Normal']),
            Paragraph("<font size=8 color='#0284c7'><b>DIGITALLY VERIFIED DISPATCH</b><br/>Status: <b>TRANSMITTED</b></font>", styles['Normal'])
        ]
    ]
    footer_table = Table(footer_data, colWidths=[380, 160])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(footer_table)
    
    # Build Document
    doc.build(story)
    return output_path
