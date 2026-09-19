from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm

text = Path('viva_notes.txt').read_text(encoding='utf-8')
canvas_obj = canvas.Canvas('InfraLynx_Middleware_Viva_Notes.pdf', pagesize=A4)
margin = 20 * mm
y = A4[1] - margin
canvas_obj.setTitle('InfraLynx Middleware Viva Notes')
canvas_obj.setAuthor('InfraLynx Project')
canvas_obj.setFillColor(HexColor('#1f3b5b'))
canvas_obj.setFont('Helvetica-Bold', 22)
canvas_obj.drawString(margin, y, 'InfraLynx Middleware & Viva Preparation Notes')
y -= 20
canvas_obj.setFillColor(HexColor('#1a1a1a'))
canvas_obj.setFont('Helvetica', 11)
for raw_line in text.splitlines():
    line = raw_line.rstrip()
    if not line:
        y -= 12
        if y < margin + 20:
            canvas_obj.showPage()
            y = A4[1] - margin
        continue
    split_parts = []
    while len(line) > 100:
        idx = line.rfind(' ', 0, 100)
        if idx == -1:
            idx = 100
        split_parts.append(line[:idx])
        line = line[idx:].lstrip()
    split_parts.append(line)
    for part in split_parts:
        if y < margin + 20:
            canvas_obj.showPage()
            y = A4[1] - margin
        canvas_obj.drawString(margin, y, part)
        y -= 12
canvas_obj.save()
print('PDF_CREATED')
