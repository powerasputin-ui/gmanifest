# AI Document Processing Platform - Worklog

---
Task ID: 1
Agent: Main
Task: Design and implement Prisma database schema

Work Log:
- Installed pdf-parse and mammoth for document parsing
- Designing comprehensive database schema for Documents, ExtractionProfiles, ExtractionRuns, ExtractedFields, Corrections, Settings

Stage Summary:
- Starting database schema implementation

---
Task ID: 2
Agent: fullstack-developer
Task: Build complete backend (core libraries + API routes)

Work Log:
- Created document parser system with types, PDF parser (pdf-parse v2 API), DOCX parser (mammoth), and image parser (VLM via z-ai-web-dev-sdk)
- Created parser index with getParser() factory function
- Created LLM provider abstraction using z-ai-web-dev-sdk chat completions
- Created document classifier using LLM (supports Invoice, Contract, Passport, Resume, Medical Report, Receipt, Other)
- Created prompt engine for building extraction prompts from JSON schemas
- Created field validator supporting email, phone, INN, KPP, date, amount, required, regex validation types
- Created processing pipeline (pipeline.ts) orchestrating: parse → prompt build → LLM call → JSON parse → validate → save fields
- Created 12 API routes: upload, documents (list/get/delete), documents/[id]/process, profiles (list/create/get/update/delete), runs/[id], runs/[id]/review, history/[id], dashboard, settings, seed
- Fixed TypeScript errors: pdf-parse v2 uses class-based API (PDFParse), VLM requires model field, SQLite createMany doesn't support skipDuplicates
- All 22 files created, TypeScript compiles cleanly (no errors in src/app/api/ or src/lib/)

Stage Summary:
- Complete backend MVP built with 6 core library files and 12 API route files
- Full pipeline: upload → parse → classify → extract → validate → review
- Seed route creates 3 extraction profiles (Invoice, Contract, Resume) and 5 default settings
- 0 TypeScript errors in project code

Files Created:
Core Libraries (6):
  - src/lib/parsers/types.ts - Parser interface definitions
  - src/lib/parsers/pdf-parser.ts - PDF parsing with pdf-parse v2
  - src/lib/parsers/docx-parser.ts - DOCX parsing with mammoth
  - src/lib/parsers/image-parser.ts - Image OCR via VLM
  - src/lib/parsers/index.ts - Parser factory
  - src/lib/llm/provider.ts - LLM abstraction via z-ai-web-dev-sdk
  - src/lib/classifier.ts - Document classification via LLM
  - src/lib/prompt-engine.ts - Extraction prompt builder
  - src/lib/validator.ts - Field validation (INN, KPP, email, phone, date, amount, regex, required)
  - src/lib/pipeline.ts - Full extraction pipeline orchestrator

API Routes (12):
  - src/app/api/upload/route.ts - POST: file upload + parse + classify
  - src/app/api/documents/route.ts - GET: list (paginated/filterable), POST: manual create
  - src/app/api/documents/[id]/route.ts - GET: single doc with runs, DELETE: cascade delete
  - src/app/api/documents/[id]/process/route.ts - POST: trigger extraction pipeline
  - src/app/api/profiles/route.ts - GET: list (filterable by type), POST: create
  - src/app/api/profiles/[id]/route.ts - GET/PUT/DELETE: CRUD operations
  - src/app/api/runs/[id]/route.ts - GET: run with fields and corrections
  - src/app/api/runs/[id]/review/route.ts - PUT: submit field corrections
  - src/app/api/history/[id]/route.ts - GET: full document history
  - src/app/api/dashboard/route.ts - GET: dashboard statistics
  - src/app/api/settings/route.ts - GET: list (grouped), PUT: bulk upsert
  - src/app/api/seed/route.ts - POST: seed profiles and settings

Issues Encountered:
- pdf-parse v2 uses class-based API (new PDFParse, .getText(), .getInfo(), .destroy()) instead of the legacy function export
- z-ai-web-dev-sdk createVision requires `model` field in request body (added 'default')
- SQLite Prisma createMany doesn't support skipDuplicates (removed from seed route)
- Array type inference for empty arrays requires explicit typing in TypeScript strict mode

---
Task ID: 3
Agent: fullstack-developer
Task: Build complete frontend UI (single-page app with sidebar navigation)

Work Log:
- Created typed API client (src/lib/api.ts) with request helper and all 15 endpoint functions
- Created Zustand store (src/store/app-store.ts) with activeTab, selectedDocumentId, selectedRunId
- Created 5 React Query hook files: use-documents, use-profiles, use-dashboard, use-review, use-settings
- Created AppSidebar with shadcn Sidebar (desktop) and Sheet (mobile) — 7 navigation items in Russian
- Created DashboardPage: 6 stat cards (emerald/green/amber/red theme), bar chart via recharts, recent docs table, profile usage, skeleton loading
- Created DocumentsPage: search + status filters, paginated table, upload/process/delete actions, empty state
- Created UploadDialog: drag-and-drop zone, file list, multi-file upload
- Created ProcessDialog: profile selector with active profiles, process trigger
- Created ProfilesPage: card grid with type badges, field count, create/edit/delete flows
- Created ProfileEditorDialog: full form (name, desc, type, JSON schema, prompt, validation rules)
- Created ProcessingPage: list of processing/review docs with progress and quick actions
- Created ReviewPage: split-view layout — left panel shows document markdown (react-markdown), right panel shows editable fields with confidence badges, validation status (red highlight for invalid), corrections tracking, save button
- Created HistoryPage: document selector, document info card, accordion of extraction runs with fields table and corrections list
- Created SettingsPage: grouped settings (LLM/Parser/General), temperature slider, masked API keys, save/reset
- Updated page.tsx: QueryClientProvider, SidebarProvider, AnimatePresence page transitions, seed on mount, sticky footer (mt-auto), mobile header
- Updated layout.tsx: lang="ru", Russian metadata, removed old Toaster (sonner used in page.tsx)
- All UI text in Russian
- Emerald/green color scheme (no blue/indigo)
- 0 TypeScript errors in src/ (verified with tsc --noEmit)

Stage Summary:
- Complete frontend MVP: 19 files created, 2 files updated
- Single-page app architecture with 7 tab sections
- Mobile-responsive: sidebar collapses to Sheet on mobile, responsive grids
- Professional design: skeleton loading states, empty states, framer-motion transitions, hover effects
- All navigation stored in Zustand, data fetching via TanStack React Query

Files Created (19):
Core:
  - src/lib/api.ts - Typed API client (types + 15 fetch functions)
  - src/store/app-store.ts - Zustand store (activeTab, selectedDoc, selectedRun)

Hooks (5):
  - src/hooks/use-documents.ts - useDocuments, useDocument, useDeleteDocument, useProcessDocument, useUploadDocument
  - src/hooks/use-profiles.ts - useProfiles, useProfile, useCreateProfile, useUpdateProfile, useDeleteProfile
  - src/hooks/use-dashboard.ts - useDashboardStats
  - src/hooks/use-review.ts - useRun, useSubmitReview, useHistory
  - src/hooks/use-settings.ts - useSettings, useUpdateSettings

Layout (1):
  - src/components/layout/app-sidebar.tsx - Sidebar (desktop) + Sheet (mobile), 7 nav items

Pages (7):
  - src/components/dashboard/dashboard-page.tsx - Stats cards, bar chart, recent docs, profile usage
  - src/components/documents/documents-page.tsx - Search, filters, paginated table, actions
  - src/components/documents/upload-dialog.tsx - Drag-and-drop multi-file upload
  - src/components/documents/process-dialog.tsx - Profile selector for processing
  - src/components/profiles/profiles-page.tsx - Profile cards with CRUD
  - src/components/profiles/profile-editor-dialog.tsx - Create/edit profile form
  - src/components/processing/processing-page.tsx - Processing queue view
  - src/components/review/review-page.tsx - Split view: markdown + editable fields
  - src/components/history/history-page.tsx - Document history with accordion runs
  - src/components/settings/settings-page.tsx - Grouped settings with save/reset

Files Updated (2):
  - src/app/page.tsx - QueryClientProvider, SidebarProvider, AnimatePresence, seed call, footer
  - src/app/layout.tsx - lang="ru", Russian metadata

  

---
Task ID: 4
Agent: Main
Task: Lint fixes and end-to-end verification

Work Log:
- Fixed 4 ESLint errors (setState in useEffect) in history-page, profile-editor-dialog, review-page, settings-page
- Fixed 1 ESLint warning (missing alt on Image icon) in upload-dialog
- Used key-based reset pattern for profile-editor-dialog and review-page
- Used derived state pattern for history-page and settings-page
- Renamed Image import to ImageIcon to avoid JSX alt-text warning
- Verified with Agent Browser: all 7 navigation tabs work correctly
- Verified dashboard shows stats cards, charts section, recent docs
- Verified profiles page shows 3 seeded profiles with correct field counts
- Verified settings page shows LLM and General settings with proper controls
- Verified footer is sticky (isAtBottom: true)
- Verified mobile responsive: sidebar collapses to Sheet drawer on 375px viewport

Stage Summary:
- ESLint passes with 0 errors and 0 warnings
- All 7 pages render and navigate correctly
- Mobile responsive design confirmed
- Sticky footer confirmed
- Seed data (3 profiles + 5 settings) loads correctly

Files Modified:
  - src/components/history/history-page.tsx
  - src/components/profiles/profile-editor-dialog.tsx
  - src/components/review/review-page.tsx
  - src/components/settings/settings-page.tsx
  - src/components/documents/upload-dialog.tsx

---
Task ID: Final
Agent: Main
Task: Final verification summary

Verification Results (Agent Browser):
1. Dashboard - Stats cards, charts, recent docs
2. Documents - Search, filters, upload, empty state
3. Profiles - 3 seeded profiles with correct field counts
4. Processing - Empty queue state
5. Review - Empty state
6. History - Document selector
7. Settings - LLM + General settings
8. Footer - Sticky (mt-auto confirmed)
9. Mobile - Sheet drawer at 375px
10. Navigation - AnimatePresence transitions

---
Task ID: 5
Agent: fullstack-developer
Task: Build v2 backend modules (projects, templates, workflows, generation)

Work Log:
- Installed jszip@3.10.1 for DOCX template filling
- Created src/lib/template-engine.ts: DOCX template engine with JSZip-based unzip→XML replace→rezip approach, with placeholder normalization for Word's XML splitting of text runs, extractVariables(), fillTemplate(), previewTemplate() functions
- Created src/lib/unified-model.ts: Unified Project Data Model with ENTITY_TYPES (6 types: Company/Vessel/Personnel/Well/Operation/FinancialData), ENTITY_FIELDS definitions (Russian labels), heuristic field classification map, LLM-based classification fallback, buildModelFromExtraction(), getProjectModel(), getConflicts(), resolveConflict(), mapToTemplateValues() functions
- Created src/lib/workflow-engine.ts: Workflow engine with createWorkflow(), startWorkflow(), advanceWorkflow() (with requirement checking per step type), getWorkflowStatus()
- Created 17 API route files across 4 domains:
  - Projects: list/create, get/delete, unified model (GET/POST), conflicts (GET/POST), batch-process
  - Templates: list/upload, get/delete, mappings (GET/POST/PUT), AI-powered auto-mapping
  - Generation: generate document, download file, get generation details
  - Workflows: list/create, get/delete, advance step, start with project
- Created entity-types route returning ENTITY_TYPES + ENTITY_FIELDS definitions
- Created seed-v2 route with 3 sample workflows (commercial proposal, daily summary, approval package)
- All new files compile with 0 TypeScript errors (verified with tsc --noEmit)
- Created uploads/templates/ and uploads/generated/ directories

Stage Summary:
- 21 new files created: 3 core libraries + 17 API routes + 1 seed route
- Full v2 backend: Projects CRUD → Document extraction → Unified data model → Template management → Document generation → Workflow orchestration
- Template engine handles Word XML splitting of placeholders
- Unified model supports LLM-based field classification with heuristic fallback
- Workflow engine checks step requirements before advancing
- All code uses existing patterns: db from @/lib/db, llmExtract from @/lib/llm/provider, processDocument from @/lib/pipeline

Files Created (21):
Core Libraries (3):
  - src/lib/template-engine.ts - DOCX template filling via JSZip (fillTemplate, extractVariables, previewTemplate)
  - src/lib/unified-model.ts - Unified project data model (entity types, LLM/heuristic classification, conflicts)
  - src/lib/workflow-engine.ts - Workflow engine (create, start, advance with requirement checking)

API Routes (18):
  - src/app/api/projects/route.ts - GET: paginated list, POST: create project
  - src/app/api/projects/[id]/route.ts - GET: project with entities/docs, DELETE: cascade delete
  - src/app/api/projects/[id]/model/route.ts - GET: unified model tree, POST: upsert entity
  - src/app/api/projects/[id]/conflicts/route.ts - GET: data conflicts, POST: resolve conflict
  - src/app/api/projects/[id]/batch-process/route.ts - POST: process documents + build model
  - src/app/api/templates/route.ts - GET: list templates, POST: upload DOCX + extract variables
  - src/app/api/templates/[id]/route.ts - GET: template with mappings, DELETE: delete template
  - src/app/api/templates/[id]/mappings/route.ts - GET/POST/PUT: CRUD template-to-model mappings
  - src/app/api/templates/[id]/ai-map/route.ts - POST: LLM-powered variable-to-model auto-mapping
  - src/app/api/generate/route.ts - POST: generate document from template + project model
  - src/app/api/generate/[id]/route.ts - GET: generation details with source documents
  - src/app/api/generate/[id]/download/route.ts - GET: serve generated DOCX for download
  - src/app/api/workflows/route.ts - GET: list workflows, POST: create workflow
  - src/app/api/workflows/[id]/route.ts - GET: workflow with steps, DELETE: delete
  - src/app/api/workflows/[id]/advance/route.ts - POST: advance to next step
  - src/app/api/workflows/[id]/start/route.ts - POST: start workflow with project
  - src/app/api/entity-types/route.ts - GET: entity type definitions for frontend
  - src/app/api/seed-v2/route.ts - POST: seed 3 sample workflows

Directories Created:
  - uploads/templates/ - Template file storage
  - uploads/generated/ - Generated document storage

---
Task ID: 6
Agent: fullstack-developer
Task: Build v2 frontend sections (projects, templates, workflows, generation)

Work Log:
- Updated Zustand store: added 4 new TabId values (projects, templates, workflows, generation), added selectedProjectId, selectedTemplateId, selectedWorkflowId with setters
- Updated api.ts: added 13 new TypeScript interfaces (Project, ProjectEntity, ProjectDetail, ModelTree, Conflict, Template, TemplateMapping, EntityTypeDefinition, Generation, WorkflowStep, Workflow) and 22 new fetch functions covering all v2 endpoints
- Updated app-sidebar.tsx: split nav into V1 (7 items) and V2 (4 items) groups with SidebarSeparator, mobile nav uses Fragment keys, version bumped to v2.0
- Created 4 React Query hook files (use-projects.ts, use-templates.ts, use-generation.ts, use-workflows.ts) with useQuery/useMutation patterns matching existing hooks
- Created Projects pages: projects-page.tsx (card grid, create dialog, empty state, skeleton), project-detail-page.tsx (4-tab layout: Documents, Model, Conflicts, Generation), unified-model-view.tsx (Accordion tree grouped by entity type, inline editing, confidence badges, verified indicators)
- Created Templates pages: templates-page.tsx (card grid, upload dialog, delete, mapping status badges), template-detail.tsx (variable list with inline mapping editor, AI automap button, progress bar, confirm/decline actions)
- Created Workflows pages: workflows-page.tsx (card grid, create dialog with step editor, delete), workflow-detail.tsx (vertical timeline stepper, start with project selector, advance button)
- Created Generation page: generation-page.tsx (2-step project+template selector, generate button, download link, recent generations placeholder)
- Updated page.tsx: extracted PageRouter component with conditional rendering (detail pages shown when IDs selected), added seed-v2 call alongside seed, all 7 new page imports
- Updated dashboard-page.tsx: added 3 new stat cards (Projects/violet, Templates/teal, Workflows/orange), skeleton count updated to 9
- Updated use-dashboard.ts: added useDashboardV2Stats hook fetching projects/templates/workflows counts
- Fixed ESLint error: refactored page.tsx PageRouter as named component to avoid "component created during render" lint rule
- Fixed JSX issue in template-detail.tsx: escaped {{переменная}} using template literal in JSX
- Fixed lucide-react: FileTemplate icon doesn't exist, replaced with FileCode across all files
- All text in Russian, emerald/green primary theme, no blue/indigo
- Mobile-first responsive grids, skeleton loading on all pages, empty states with icons
- 0 TypeScript errors in src/ (verified), 0 ESLint errors (verified)

Stage Summary:
- 11 new files created, 5 existing files modified
- 4 new sidebar navigation items with separator
- Complete v2 frontend: Projects (CRUD + detail with 4 tabs) → Templates (upload + AI mapping) → Workflows (create + timeline stepper) → Generation (project + template → generate + download)
- Dashboard extended with 3 new stat cards for v2 entities
- Zustand store supports conditional detail page rendering via selected IDs

Files Created (11):
Hooks (4):
  - src/hooks/use-projects.ts - useProjects, useProject, useCreateProject, useDeleteProject, useProjectModel, useUpdateProjectEntity, useConflicts, useResolveConflict, useBatchProcess
  - src/hooks/use-templates.ts - useTemplates, useUploadTemplate, useTemplate, useDeleteTemplate, useTemplateMappings, useCreateMapping, useConfirmMapping, useAiMapTemplate
  - src/hooks/use-generation.ts - useGenerateDocument, useGeneration, useEntityTypes
  - src/hooks/use-workflows.ts - useWorkflows, useCreateWorkflow, useWorkflow, useDeleteWorkflow, useAdvanceWorkflow, useStartWorkflow

Pages (7):
  - src/components/projects/projects-page.tsx - Project cards grid, create dialog, status badges, empty state
  - src/components/projects/project-detail-page.tsx - 4-tab detail: Documents, Model, Conflicts, Generation
  - src/components/projects/unified-model-view.tsx - Accordion tree, inline editing, confidence badges, verified indicators
  - src/components/templates/templates-page.tsx - Template cards, upload dialog, mapping status
  - src/components/templates/template-detail.tsx - Variable list, mapping editor, AI automap, progress bar
  - src/components/workflows/workflows-page.tsx - Workflow cards, create dialog with step editor
  - src/components/workflows/workflow-detail.tsx - Vertical timeline stepper, start/advance actions
  - src/components/generation/generation-page.tsx - Two-step selector, generate, download

Files Modified (5):
  - src/store/app-store.ts - Added 4 TabId values + 3 selected IDs
  - src/lib/api.ts - Added 13 interfaces + 22 fetch functions
  - src/components/layout/app-sidebar.tsx - V2 nav items, separator, version bump
  - src/app/page.tsx - PageRouter, conditional rendering, seed-v2, 7 new imports
  - src/components/dashboard/dashboard-page.tsx - 3 new stat cards
  - src/hooks/use-dashboard.ts - useDashboardV2Stats hook

Issues Encountered:
- lucide-react doesn't export FileTemplate icon, replaced with FileCode
- JSX {{переменная}} syntax needs template literal escaping: {`{{переменная}}`}
- ESLint react-hooks/static-components rule rejects component references assigned during render, refactored to named PageRouter component
- Comment closing syntax error in generation-page.tsx (missing `}` in JSX comment)

---
Task ID: 3 (backend restructure)
Agent: backend-subagent
Task: Business Rules Engine, Workflow Orchestrator, Dependency Checker, expanded Unified Model, API routes, seed data

Work Log:
- Expanded unified-model.ts: added 14 new entity types (Permit, Incident, Weather, Equipment, Location, Port, Rig, Campaign, Task, Risk, WorkOrder, Checklist, Contract, OrganizationRole) with Russian labels and 80+ field-to-entity heuristic mappings in FIELD_CLASSIFICATION_MAP
- Created src/lib/business-rules-engine.ts: 5 exported functions (evaluateRulesForWorkflow, evaluateRulesForDocument, checkDataCompleteness, getMissingDocuments, getAutoExtractionPlan) with RuleEvaluationResult, CompletenessCheck, AutoExtractionPlan interfaces
- Created src/lib/dependency-checker.ts: 3 exported functions (checkStepDependencies, checkWorkflowDependencies, computeWorkflowCompleteness) with DependencyReport interface, re-exports checkDataCompleteness
- Rewrote src/lib/workflow-engine.ts as workflow orchestrator: createWorkflowFromTemplate, createWorkflow, startWorkflow (with rule evaluation), advanceWorkflow (with dependency blocking), getWorkflowStatus, cancelWorkflow. New StepType union (8 types)
- Created 4 new API route files: workflow-templates/route.ts, workflow-templates/[id]/route.ts, business-rules/route.ts, business-rules/[id]/route.ts
- Created 2 new sub-route files: workflows/[id]/dependencies/route.ts, workflows/[id]/completeness/route.ts
- Updated 3 existing API route files: workflows/route.ts (template-based creation), workflows/[id]/route.ts (PUT + dependency report), workflows/[id]/advance/route.ts (422 on blocked)
- Updated profiles/route.ts: documentType filter → entityType filter
- Updated profiles/[id]/route.ts: documentType → entityType in update
- Rewrote seed-v2/route.ts: 9 entity-centric extraction profiles, 6 workflow templates (commercial/voyage/daily/mobilization/permit/approval), 5 business rules
- Updated seed/route.ts: documentType → entityType for existing profiles
- Deleted old workflows/[id]/start/route.ts (merged into workflows/route.ts POST with projectId)
- Fixed api.ts: ExtractionProfile.entityType, getProfiles/getTemplates/getWorkflows return types, startWorkflow uses PUT
- Fixed frontend: use-dashboard.ts (.data?.data), use-profiles.ts (entityType param), profile-editor-dialog.tsx (entity type selector), profiles-page.tsx (entity labels/colors), process-dialog.tsx (entityType prop), documents-page.tsx (documentEntityType prop)
- 0 TypeScript errors in src/, 0 ESLint errors

Stage Summary:
- 3 new core libraries: business-rules-engine.ts, dependency-checker.ts, rewritten workflow-engine.ts
- 6 new API route files, 6 updated API route files
- 14 new entity types with 80+ field mappings
- 9 entity-centric extraction profiles seeded
- 6 Gazprom Shelfproject workflow templates seeded
- 5 business rules seeded
- Full workflow lifecycle: template → create → start (rule eval) → advance (dependency check) → complete
- Dependency checker provides actionable missing items with priority

---
Task ID: 7 (frontend redesign)
Agent: fullstack-developer
Task: Complete frontend redesign — Workflow-centric architecture (v3.0)

Work Log:
- Rewrote src/store/app-store.ts: 6 tabs only (workflows, projects, documents, templates, rules, settings), default 'workflows', removed selectedDocumentId/selectedRunId
- Rewrote src/lib/api.ts: kept all existing types/functions, added WorkflowTemplate, BusinessRule, WorkflowDetail, WorkflowStepDetail, DependencyReport interfaces, added safeJson helper for parsing JSON fields, added getWorkflowTemplates, getWorkflowTemplate, getBusinessRules, getBusinessRule, getWorkflowDetail (with parsed steps/entities), getWorkflowDependencies, getWorkflowCompleteness, cancelWorkflow functions; updated getWorkflows to include template/project relations
- Rewrote src/components/layout/app-sidebar.tsx: 6 nav items (Бизнес-процессы, Проекты, Документы, Шаблоны, Правила, Настройки), emerald active styling, removed V1/V2 split, version v3.0
- Rewrote src/hooks/use-workflows.ts: useWorkflowTemplates, useWorkflowDetail, useCreateWorkflowFromTemplate, useAdvanceWorkflow, useCancelWorkflow, useWorkflowDependencies, useWorkflowCompleteness
- Created src/hooks/use-business-rules.ts: useBusinessRules hook
- Created src/hooks/use-generation.ts (recreated minimal version for existing pages that still use useGenerateDocument and useEntityTypes)
- Created src/components/workflows/workflow-hub.tsx: main workflow hub page with template cards grid (color-coded by template.color, category badges in Russian, entity badges, "Запустить" button with project selector dialog), active workflows list with completeness bars and status badges, skeleton loading states, empty states
- Created src/components/workflows/workflow-process.tsx: two-column layout with vertical stepper timeline (left 1/3) and step content (right 2/3), step-type-specific renderers (define_goal shows template info, identify_data shows completeness breakdown, find_documents shows upload area, extract shows entities, check_completeness shows dependency report with "Что нужно сделать" action list sorted by priority), blocked step alerts, advance/cancel buttons, completed workflow success state
- Created src/components/rules/business-rules-page.tsx: read-only card grid of business rules with trigger type badges, required entities/documents/auto-extract as badges, active/inactive switch placeholder
- Rewrote src/app/page.tsx: simplified PageRouter with workflow hub as default, removed old page imports (dashboard, profiles, processing, review, history, generation), kept seed + seed-v2 calls
- Fixed src/components/documents/documents-page.tsx: removed references to deleted setSelectedDocumentId and setActiveTab('history')
- Deleted old files: dashboard-page, profiles-page, profile-editor-dialog, processing-page, review-page, history-page, generation-page, workflow-detail, workflows-page, use-dashboard, use-review
- TypeScript: 0 errors in src/ (verified with tsc --noEmit)
- ESLint: 0 errors (verified with bun run lint)

Stage Summary:
- Complete frontend redesign to workflow-centric architecture (v3.0)
- 5 files modified, 5 files created, 11 files deleted
- 6-tab navigation with workflow hub as main page
- Impressive template cards with color accents and category labels
- Full workflow process page with step timeline and dependency-aware content
- Business rules read-only view
- All UI text in Russian, emerald/green primary theme
- Mobile-responsive, skeleton loading, empty states, framer-motion transitions

Files Created (5):
  - src/components/workflows/workflow-hub.tsx - Main workflow hub page (template cards + active workflows)
  - src/components/workflows/workflow-process.tsx - Workflow execution page (stepper + step content)
  - src/components/rules/business-rules-page.tsx - Business rules read-only view
  - src/hooks/use-business-rules.ts - useBusinessRules hook
  - src/hooks/use-generation.ts - Recreated minimal for existing page dependencies

Files Modified (5):
  - src/store/app-store.ts - 6 tabs, workflow default, removed old state
  - src/lib/api.ts - New types + functions + JSON parsing
  - src/components/layout/app-sidebar.tsx - 6 nav items, v3.0
  - src/app/page.tsx - Simplified PageRouter
  - src/components/documents/documents-page.tsx - Removed deleted store references

Files Deleted (11):
  - src/components/dashboard/dashboard-page.tsx
  - src/components/profiles/profiles-page.tsx
  - src/components/profiles/profile-editor-dialog.tsx
  - src/components/processing/processing-page.tsx
  - src/components/review/review-page.tsx
  - src/components/history/history-page.tsx
  - src/components/generation/generation-page.tsx
  - src/components/workflows/workflow-detail.tsx
  - src/components/workflows/workflows-page.tsx
  - src/hooks/use-dashboard.ts
  - src/hooks/use-review.ts

---
Task ID: 8 (verification)
Agent: Main
Task: Fix seed idempotency, verify all pages via Agent Browser

Work Log:
- Fixed seed-v2/route.ts: added idempotency check (existingTemplates > 0 → skip)
- Force-reset database, verified 6 templates (not 48 duplicates)
- Verified via Agent Browser:
  1. Бизнес-процессы (main): 6 template cards, 6 "Запустить" buttons, "Активные процессы" section
  2. Проекты: heading + "Создать проект" button
  3. Документы: heading + "Загрузить" button
  4. Шаблоны: heading + "Загрузить шаблон" button
  5. Правила: 5 business rules displayed (Mobilization, Permit, Commercial, Vessel, Daily Report)
  6. Настройки: heading + "Сбросить" button
  7. Footer: "© 2026 AI DocProc — Платформа обработки документов на базе ИИ"
  8. Mobile (375px): hamburger menu, 6 template cards visible
  9. Zero console errors, zero server errors
  10. Zero TypeScript errors, zero ESLint errors

Stage Summary:
- Seed idempotency fixed (both /api/seed and /api/seed-v2 check before inserting)
- All 6 navigation tabs verified working
- 5 business rules displayed correctly
- 6 workflow templates displayed correctly
- Mobile responsive confirmed
- v3.0 architecture live
---
Task ID: 9
Agent: Main
Task: pdf-inspector integration, pluggable AI provider (API token / local model), data-leak audit, e2e

Work Log:
- Installed @firecrawl/pdf-inspector@1.12.0 (win32-x64-msvc native binding); created src/lib/parsers/pdf-inspector-parser.ts (DocumentParser impl, fallback to pdf-parse for Scanned/ImageBased/failures); registered first in parsers registry
- next.config.ts: serverExternalPackages for @firecrawl/pdf-inspector, pdf-parse, mammoth (napi binding failed under Turbopack bundling)
- Fixed hardcoded Linux paths: UPLOAD_DIR in upload/route.ts → path.join(process.cwd(),'uploads'); DATABASE_URL in .env → file:../db/custom.db
- Fixed external favicon (z-cdn.chatglm.cn) → local /logo.svg
- Rewrote src/lib/llm/provider.ts: reads Settings from DB; providers zai|api|local; OpenAI-compatible fetch client (base_url+token or local Ollama/LM Studio); temperature/max_tokens now applied; system-prompt role fixed (was 'assistant'); added getActiveModelName() and llmVision(); pipeline.ts modelUsed hardcode removed; image-parser.ts routed through provider
- Settings: seeded llm_provider/llm_api_key/llm_base_url (idempotent seed even when profiles exist); settings PUT accepts category/description; new POST /api/settings/test-llm (live connection probe); settings UI: provider selector with privacy hints, base_url presets (OpenAI/Ollama/LM Studio), free-form model name, "Проверить подключение" button
- Fixed build on Windows: cp -r replaced by scripts/postbuild.mjs (cross-platform copy for standalone output)
- Data-leak audit: pdf-inspector has no network code/postinstall/telemetry (static analysis of package + native binary strings); project source has no outgoing calls except configured LLM endpoint; runtime check during local-mode e2e: zero external TCP connections from server processes
- E2E (real AI via local Ollama qwen2.5:1.5b): tests/e2e/run-e2e.ts 23/23 PASS (seed idempotency, settings, test-llm, PDF upload via pdf-inspector, classification=Invoice, extraction completed, total_amount=12000.00 RUB, workflow create/advance/dependencies/completeness, template upload+variables); tests/e2e/run-generation-e2e.ts 8/8 PASS (project→entities→mappings→generate→download→placeholders filled in DOCX)
- Dev-server hang note: next dev (Turbopack) stalls intermittently under OneDrive-synced dir; production standalone server runs the same suite without issues

Stage Summary:
- pdf-inspector is the default PDF engine with safe fallback; verified end-to-end via /api/upload (metadata.engine=pdf-inspector)
- AI works in two modes: API token (any OpenAI-compatible base URL) and fully local (verified with Ollama qwen2.5:1.5b — classification + extraction with correct values)
- No data leaks: parsing fully local; in local-LLM mode zero external network traffic (verified at runtime)
- tsc: 0 errors in src/ (examples/websocket has pre-existing socket.io type errors); eslint: 0 errors; production build: OK
- E2E reports: tool-results/e2e-report.md (23/23), tool-results/e2e-generation-report.md (8/8)

Files Created:
  - src/lib/parsers/pdf-inspector-parser.ts
  - src/app/api/settings/test-llm/route.ts
  - scripts/postbuild.mjs
  - tests/e2e/run-e2e.ts, tests/e2e/run-generation-e2e.ts, tests/e2e/make-pdf-fixture.mjs, tests/e2e/make-template-fixture.ts
  - tests/e2e/fixtures/invoice-test.pdf, tests/e2e/fixtures/template-test.docx

Files Modified:
  - package.json (+@firecrawl/pdf-inspector, build script), next.config.ts (serverExternalPackages)
  - src/lib/llm/provider.ts, src/lib/pipeline.ts, src/lib/parsers/index.ts, src/lib/parsers/image-parser.ts
  - src/app/api/upload/route.ts, src/app/api/settings/route.ts, src/app/api/seed/route.ts
  - src/components/settings/settings-page.tsx, src/hooks/use-settings.ts, src/lib/api.ts
  - src/app/layout.tsx, .env (DATABASE_URL)

---
Task ID: 10
Agent: Main + debug-subagent
Task: Stability debugging (site hangs), NVIDIA NIM preset, Profiles section restore

Work Log:
- Root cause of full server hangs: PrismaClient had log:['query'] in src/lib/db.ts; combined with `| tee dev.log` pipe on Windows the stdout pipe filled up and blocked the whole Node process (even static routes hung, no errors logged). Fix: query logging disabled (warn/error only)
- Added PRAGMA busy_timeout=5000 and WAL mode for SQLite (db lives in OneDrive-synced folder → transient locks from sync client)
- package.json: predev/prestart hooks run scripts/kill-port.mjs 3000 (auto-frees port from orphaned processes, fixes EADDRINUSE on restart); removed tee pipes from dev/start scripts
- NVIDIA NIM: preset added to settings UI (https://integrate.api.nvidia.com/v1); verified live with deepseek-ai/deepseek-v4-flash — model names require vendor/ prefix; 404 error message now hints the format
- Restored «Профили» section from git history (profiles-page, profile-editor-dialog), adapted to entityType API; added tab to store/sidebar/router
- Fixed ProcessDialog: no longer filters profiles by document classification type (classification taxonomy ≠ entity types → list was always empty); shows all active profiles
- Verification: tsc 0 errors (src), eslint 0 errors, production build OK, e2e 23/23 after fixes
- Environmental recommendation: move project out of OneDrive-synced folder for full stability
