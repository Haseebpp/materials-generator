# Product Requirements Document (PRD)

## 1. Document Control
- Product: Material BOQ
- Repository: `materials - Copy - Copy`
- PRD Type: As-built PRD (documents current implementation + recommended product direction)
- Date: February 7, 2026
- Author: Codex

## 2. Executive Summary
Material BOQ is a browser-based BOQ drafting and editing application for material estimation workflows. It combines a curated material catalog, a structured BOQ editor, AI-assisted draft generation from text/images, and export/history utilities. The current implementation is frontend-only (no backend) and persists user state in browser localStorage.

Primary value:
1. Faster BOQ drafting from a predefined material database.
2. Faster first-pass generation through AI assistance.
3. Controlled manual refinement before export.

## 3. Product Vision
Provide a practical, low-friction BOQ workspace that enables estimators to move from rough requirement input to structured, exportable material lists in minutes while preserving company naming standards.

## 4. Problem Statement
Estimators and project teams spend significant time translating requirement descriptions, sketches, and references into standardized BOQ material lines. Manual formatting and repeated lookup increase cycle time and inconsistency. The product solves this by combining searchable catalog lookup, editable BOQ operations, and AI-assisted drafting/standardization.

## 5. Users and Personas
1. Quantity Surveyor / Estimator
- Needs speed and consistency.
- Uses catalog + AI to create first draft, then adjusts quantities and details.

2. Project Engineer / Production Coordinator
- Needs practical material list revisions during execution.
- Uses BOQ editor and export to communicate with downstream teams.

3. Design/Planning Coordinator
- Needs translation of conceptual requirements into material-level structure.
- Uses prompt/image AI generation before technical review.

## 6. Scope
### 6.1 In Scope (Current)
1. Material catalog browsing and search.
2. BOQ item add/edit/remove/reorder.
3. Quantity/remark editing.
4. Price visibility toggle and total calculation view.
5. AI generation from prompt/images.
6. D&C standardization pass for AI outputs.
7. Add generated results to BOQ.
8. Local history for AI generations (restore/export/delete/clear).
9. Excel export of BOQ.

### 6.2 Out of Scope (Current)
1. Authentication, user accounts, role-based access.
2. Cloud sync/shared projects.
3. Multi-user collaboration.
4. Procurement/approval workflows.
5. Vendor pricing integrations.
6. Back-office ERP integration.

## 7. Product Goals and Success Criteria
### 7.1 Product Goals
1. Enable BOQ creation and iteration in one screen.
2. Reduce time-to-first-draft through AI generation.
3. Keep output editable and export-ready.

### 7.2 Suggested KPIs
1. Median time from empty state to first exported BOQ.
2. AI generation adoption rate (% sessions using AI).
3. Percentage of generated lines retained after manual review.
4. Export success rate.
5. AI generation failure rate (request/parse failures).

## 8. Current Feature Set (As Implemented)
### 8.1 Main Workspace
1. Header actions:
- `Generate with AI`
- Price visibility toggle (`Eye`/`EyeOff`)
- `Clear All`
- `Export to Excel`

2. Two-pane desktop layout:
- Left: `MaterialList` sidebar (hidden on smaller screens).
- Right: `BOQTable` main editor.

3. Sidebar resizing:
- Mouse-drag resizer with min/max width constraints.

### 8.2 Material Library (`MaterialList`)
1. Sources data from `src/data/materials.json`.
2. Search across description, category, and detail fields.
3. Grouped by category with accordion sections.
4. Per-item add button and double-click add.
5. Optional inline rate display based on global price visibility.

### 8.3 BOQ Editor (`BOQTable`)
1. Row operations:
- Add row from combobox.
- Quick add blank row (double-click or plus action).
- Edit row in dialog.
- Delete row.
- Drag-and-drop reorder via `@dnd-kit`.

2. Editable fields:
- `boqQty` (numeric, enforced min 1).
- `remarks` (when not hidden).

3. Optional details mode:
- Toggle to show/hide detail chips (ID/spec fields).

4. Pricing behavior:
- When visible: shows `Rate`, per-row `Total`, and `Grand Total`.
- Currency formatting uses `en-SA` and `SAR`.

### 8.4 Material Create/Edit Dialog (`MaterialDialog`)
1. Supports add and edit modes.
2. Editable core fields:
- Description, Category, Rate, Unit.

3. Editable optional details:
- Thickness, Dimensions, Size, Length, Color, Grade.

4. Uses creatable comboboxes for category/unit (existing values + free text).

### 8.5 AI Generator (`AIGeneratorDialog`)
1. Inputs:
- Prompt textarea.
- Multiple image upload (click or drag/drop).
- Optional API key override in advanced settings.

2. Generation workflow:
- Step 1: Generate Professional items.
- Step 2: Start D&C standardization in background.

3. Result tabs:
- `Professional`
- `D&C Standardized`

4. Review capabilities per active tab:
- Reorder, edit, remove, add extra material.
- Copy tab result to clipboard as tab-separated table.
- Add active tab items into project BOQ.

5. Progress and status signals:
- Processing overlay while generating.
- D&C tab states: pending / generating / generated.

### 8.6 AI History (`historyService`)
1. Stored in localStorage (`ai_generator_history`).
2. Per-entry stores:
- Timestamp, prompt, images (base64), professional + standardized items, metadata.

3. History actions:
- Restore generation.
- Export generation payload and images.
- Delete entry.
- Clear all entries.

4. Entry cap:
- Maximum 50 entries retained.

### 8.7 Export (`ExportButton`)
1. Exports current BOQ to `Materials_BOQ.xlsx`.
2. Includes core fields always.
3. Adds `Rate`, `Total`, and final grand-total row only when price visibility is enabled.

## 9. Data Model
### 9.1 Domain Types
1. `Material`
- `id: string`
- `category: string`
- `description: string`
- `details: { thickness, dimensions, size, length, color, grade }`
- `qty: string`
- `unit: string`
- `rate: string`

2. `BOQItem extends Material`
- `boqQty: number`
- `remarks?: string`

### 9.2 History Types
1. `GenerationHistoryEntry`
- `id`, `timestamp`, `prompt`, `imageDataUrls`
- `professionalItems`, `standardizedItems`
- metadata (`apiKeyUsed`, `imageCount`, item counts)

2. `GenerationHistorySummary`
- lightweight display metadata for history panel

### 9.3 Catalog Snapshot (Current)
1. Materials count: 589
2. Categories: 13
3. Units: 15
4. Largest categories include HARDWARE, ELECTRICAL, METAL, ACRYLIC

## 10. User Flows
### 10.1 Manual BOQ Flow
1. Search/select material from sidebar or combobox.
2. Material is added to BOQ.
3. User updates qty/remarks, reorders rows, optionally edits material details.
4. User toggles price visibility for costing view.
5. User exports BOQ to Excel.

### 10.2 AI-Assisted Flow
1. Open AI Generator.
2. Enter prompt and/or upload images.
3. Click Generate.
4. Review Professional tab while D&C tab generates in background.
5. Optionally refine rows.
6. Add chosen tab list to main BOQ.
7. Optionally restore/export from history.

## 11. Functional Requirements
1. The system shall persist BOQ state in browser storage.
2. The system shall allow adding materials from static catalog and manual creation dialog.
3. The system shall support row reorder through drag-and-drop.
4. The system shall calculate row totals and grand total when price mode is active.
5. The system shall generate AI material suggestions from prompt and optional images.
6. The system shall keep both professional and standardized AI outputs separately.
7. The system shall allow restoring historical AI generations.
8. The system shall export BOQ to `.xlsx`.

## 12. Non-Functional Requirements
1. Client-side responsiveness for common desktop resolutions.
2. Smooth interaction for search/edit/reorder operations.
3. No mandatory backend dependency for core manual BOQ flow.
4. Type-safe codebase under strict TypeScript settings.

## 13. Technical Architecture
1. Frontend framework: React 19 + TypeScript.
2. Build tool: Vite.
3. Styling: TailwindCSS with custom CSS variables.
4. UI primitives: custom components inspired by Radix patterns.
5. Drag and drop: `@dnd-kit`.
6. Spreadsheet export: `xlsx`.
7. AI provider SDK: `@google/generative-ai`.
8. Storage: browser localStorage only.

## 14. Dependencies and Integrations
1. Google Gemini API (`gemini-flash-latest`) for AI generation and standardization.
2. Local static dataset for baseline materials (`materials.json`).

## 15. Security, Privacy, and Compliance Notes
1. AI key and history are stored in localStorage (plaintext at browser level).
2. Uploaded images for AI history are persisted as base64 strings in localStorage.
3. Current implementation includes a hardcoded default API key in source, which is high risk and should be removed before production release.

## 16. Known Issues and Product Risks
1. Build currently fails (`npm run build`) due TypeScript errors:
- `AIGeneratorDialog.tsx`: unused parameters in `handleUpdateRemark`.
- `AIGeneratorDialog.tsx` + `ui/tabs.tsx`: controlled tabs mismatch (`value` prop unsupported by current Tabs implementation).

2. History update behavior:
- Standardization result path creates a new history entry instead of updating the original entry.

3. Potential object URL lifecycle issue:
- Image previews use `URL.createObjectURL` without explicit revoke.

4. Encoding artifacts present in text content (`×`, `•`) in several strings.

5. No automated tests currently validate BOQ math, export integrity, or AI parse robustness.

## 17. Release Readiness (Current State)
Status: Not release-ready for production due build blockers and security concerns.

Minimum release gate:
1. Build passes on CI/local.
2. Hardcoded API key removed.
3. History update behavior corrected.
4. Basic regression tests added.

## 18. Recommended Roadmap
### Phase 1: Stabilization
1. Fix tab component API mismatch.
2. Resolve strict TS lint/build issues.
3. Normalize mojibake/encoding artifacts.

### Phase 2: Security and Data Hygiene
1. Remove embedded API key.
2. Add safer API key handling strategy.
3. Add storage controls for prompt/image history.

### Phase 3: Workflow Enhancements
1. Duplicate handling when AI items are added to BOQ.
2. Better validation and fallback for AI malformed JSON.
3. Richer export templates.

### Phase 4: Quality and Scale
1. Add unit/integration test coverage.
2. Add observability hooks for generation failures.
3. Consider backend persistence and project-level sharing.

## 19. Acceptance Criteria (Recommended for Next Release)
1. `npm run build` succeeds with zero TypeScript errors.
2. User can create, edit, reorder, and export BOQ without runtime exceptions.
3. AI flow supports prompt-only, image-only, and mixed input.
4. Standardized results appear in a deterministic tab state flow.
5. Restored history exactly reproduces saved prompt, images, and generated items.
6. Exported Excel includes correct totals when price mode is active.
7. No hardcoded production API secrets exist in client source.

## 20. Open Questions
1. Should AI-generated items merge with existing BOQ duplicates by semantic match or strict ID?
2. Is SAR fixed for all deployments, or should currency be tenant/config driven?
3. Should history be per-browser only or synchronized per user/project?
4. What is the expected data retention policy for uploaded image history?
5. Should D&C standardization be optional/manual or always background-triggered?
