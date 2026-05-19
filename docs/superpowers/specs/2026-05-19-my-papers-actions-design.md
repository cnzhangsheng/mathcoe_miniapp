# My Papers Actions: Generate PDF, Download, Delete

> **Goal:** Add Generate PDF, Download, and Delete actions to each exam paper card in the "我的考卷" list.

> **Tech Stack:** FastAPI + WeChat mini-program (WXML/WXSS/JS)

**Architecture:** Add 2 new backend endpoints (POST generate-pdf, DELETE), update mini-app service layer (`examPaper.js`) with `generatePdf()` and `deletePaper()`, and update the exam-card UI in the "我的考卷" list to show 3 icon-based action buttons.

---

## Backend

### POST `/api/v1/exam-papers/{exam_paper_id}/generate-pdf`

Generate the PDF file, save it to the server filesystem, and persist the file path to `exam_papers.file_path`.

- Auth: User must own the exam paper (`user_id == exam_paper.user_id`)
- Logic:
  1. Query `ExamPaper` by id, ensure it exists
  2. Validate ownership
  3. Query associated questions via `ExamPaperQuestion` → `Question`
  4. Call `render_exam_paper_pdf_stream()` to generate PDF
  5. Save PDF to a configured directory (e.g., `pdf_output/`, created via config)
  6. Write `file_path` to the `ExamPaper` record
  7. Return `{ exam_paper_id, file_path }`
- Pydantic response: `GeneratePdfResponse` with `exam_paper_id: int`, `file_path: str`
- If `file_path` already exists and file exists on disk, skip regeneration and return existing path
- Error: 403 if not owner, 404 if not found, 400 if no questions

### DELETE `/api/v1/exam-papers/{exam_paper_id}`

Delete a user-generated exam paper.

- Auth: User must own the exam paper AND `paper_type == "custom"`
- Logic:
  1. Query `ExamPaper` by id
  2. Validate ownership + paper_type
  3. Delete associated `ExamPaperQuestion` records
  4. Delete the PDF file from disk if `file_path` exists
  5. Delete the `ExamPaper` record
  6. Return `{ ok: true }`
- Pydantic response: `DeletePaperResponse` with `ok: bool`
- Error: 403 if not owner, 404 if not found, 400 if not custom type

## Mini-app Services

### `examPaperService.generatePdf(examPaperId)`
- POST to `/exam-papers/{id}/generate-pdf`
- Returns `{ exam_paper_id, file_path }`

### `examPaperService.deletePaper(examPaperId)`
- DELETE to `/exam-papers/{id}`
- Returns `{ ok: true }`

## Mini-app UI

### Card action icons (right side)

Three vertically arranged icon buttons on the right side of each exam card in the "我的考卷" list. Logic:

| Condition | Generate PDF | Download | Delete |
|-----------|-------------|----------|--------|
| `file_path` is empty + not generating | ✅ Show | ❌ Hide | ✅ Show |
| `file_path` is empty + generating | 🔄 Loading | ❌ Hide | ✅ Show |
| `file_path` has value | ❌ Hide | ✅ Show | ✅ Show |

Delete always shows. Tapping delete opens `wx.showModal` confirming the action before calling the API.

Success/failure is communicated via `wx.showToast`.

### Pages to update

1. **topics.wxml** — "我的考卷" card's `.exam-right` section: replace single download button with 3-button icon group
2. **topics.js** — Add `generatePdf`, `deletePaper` handlers; track per-card generating state via `generatingPdfIds: []`
3. **topics.wxss** — Add styles for new icon buttons
4. **index.wxml** — Same for home page "我的考卷" section
5. **index.js** — Add same handlers + generating state
6. **index.wxss** — Add same styles

### Icons

- Generate PDF: 🖨 text or use an icon image
- Download: ⬇ (existing)
- Delete: 🗑 text or use an icon image

### Delete confirmation

```
wx.showModal({
  title: '确认删除',
  content: '删除后无法恢复，确定删除此考卷？',
  success: (res) => {
    if (res.confirm) { /* call deletePaper API */ }
  }
})
```

### After successful delete / After successful PDF generate
- Show success toast
- Refresh the current list (`loadMyPapers(true)`)
- For generate: after refresh, the "下载" icon replaces the "生成" icon (because `file_path` is now set)

---

## Error States

| Scenario | Handling |
|----------|----------|
| Generate PDF fails (network) | Toast "生成失败，请重试" |
| Generate PDF HTTP 400/403 | Toast with error detail |
| Delete fails | Toast "删除失败，请重试" |
| Download fails (file not found) | Toast "文件不存在，请先生成PDF" |
| Card tap during generating | Prevent duplicate taps via `generatingPdfIds` check |

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/api/v1/exam_paper.py` | Modify | Add `generate_exam_paper_pdf` and `delete_exam_paper` endpoints |
| `app/schemas/exam_paper.py` | Modify | Add `GeneratePdfResponse`, `DeletePaperResponse` |
| `app/core/config.py` | Modify | Add `pdf_output_dir` config |
| `services/examPaper.js` | Modify | Add `generatePdf()`, `deletePaper()` |
| `pages/topics/topics.wxml` | Modify | Replace single download button with 3-icon action group |
| `pages/topics/topics.js` | Modify | Add `generatePdf`, `deletePaper` handlers + `generatingPdfIds` |
| `pages/topics/topics.wxss` | Modify | Add icon button group styles |
| `pages/index/index.wxml` | Modify | Same 3-icon group for home page my-papers section |
| `pages/index/index.js` | Modify | Add same handlers + state |
| `pages/index/index.wxss` | Modify | Same icon button styles |