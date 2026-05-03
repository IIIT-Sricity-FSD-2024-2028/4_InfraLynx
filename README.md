# InfraLynx CRIMS

InfraLynx CRIMS is a civic request and infrastructure workflow prototype for Smart City and Urban Services. The current phase uses a **NestJS in-memory backend** as the single runtime data source.

`Database/DBschema.sql` and the ER diagrams are showcase and future-persistence references. They are not connected to the running product in this phase.

## Current Implementation Phase

- Storage: in-memory arrays from `back-end/src/data/seed.data.ts`
- Backend: NestJS demo API with role-guarded official actions and public request tracking
- Frontend: static HTML, CSS, and JavaScript pages under `front-end/`, integrated through `front-end/scripts/api-client.js`
- Database: not connected yet
- Authentication: demo access only; not production identity management

## Actor Reconciliation

The highest-priority domain source is `Documentation/domainexpertinteraction.md`.

Core operational actors:

- City Administrator
- Department Officer
- Field Engineer

Specialized authority actors:

- CFO, for financial review, budget allocation, vendor quotation review, and fund release control
- QC Reviewer, for independent quality verification and closure certification

Public participant:

- Citizen/Public requester, who submits and tracks civic complaints or improvement requests

Citizens are intentionally treated as public requesters in this phase. The citizen profile/sign-in flow is a demo convenience for repeat tracking, not a final production citizen identity model.

## In-Memory Data Map

| Seed collection | Current owner or usage |
| --- | --- |
| `departments` | Department module, dashboards, routing labels |
| `serviceCategories` | Service category module and citizen request routing |
| `officialRoles`, `officialAccounts` | Demo access and official workspace routing |
| `citizenUsers` | Demo citizen profile convenience |
| `requests` | Public request intake, tracking, admin review |
| `workOrders` | Officer planning, engineer assignment, execution visibility |
| `quotations` | Vendor quotation review |
| `budgetProposals` | In-memory budget allocation/review workflow |
| `fundReleases` | CFO-visible staged release workflow |
| `procurementBills` | Procurement validation demo data |
| `qcReviews`, `outcomeReports` | QC certification and closure visibility |
| `maintenanceSchedules`, `maintenanceLogs` | Maintenance planning and execution logs |
| `inspections`, `issueReports`, `progressReports` | Field engineer inspection/reporting flows |
| `resourceRequests`, `sensorDeployments`, `taskMaterialLogs` | Field operations support data |
| `publicStats`, `impactStories` | Public pride/landing-page insight cards |
| `adminAlerts`, `budgetSnapshots`, `activityFeed` | Admin and dashboard insight feeds |

## Backend Surfaces

Key API groups:

- `GET /service-categories`
- `GET /requests`, `GET /requests/track?ref=CRIMS-2026-0042`, `POST /requests`
- `GET /work-orders`
- `GET /budget-proposals`
- `GET /fund-releases`
- `GET /qc-reviews`
- `GET /public-insights`
- `GET /public-insights/admin`
- `POST /demo-access/official/sign-in`
- `POST /demo-access/citizen/sign-in`

Official write routes use the demo `x-role` header guard. This is only a prototype shortcut.

## Workflow Model

Citizen request lifecycle:

`RECEIVED -> UNDER_REVIEW -> APPROVED_FOR_PLANNING -> CONVERTED_TO_WORK_ORDER -> CLOSED`

Infrastructure delivery flow:

1. Citizen or public representative submits a request.
2. City Administrator reviews feasibility and public impact.
3. Department Officer plans work and assigns field execution.
4. Field Engineer inspects, executes, reports progress, and records material usage.
5. CFO reviews budget allocations, quotations, procurement bills, and fund releases.
6. QC Reviewer certifies completed work before public closure.

## Frontend Notes

The front-end is intentionally built with only HTML, CSS, and JavaScript.

- `front-end/index.html` is the landing/public request page.
- `front-end/pages/auth.html` handles citizen demo access and official demo sign-in.
- `front-end/pages/citizen.html` is the citizen request workspace.
- Official workspaces live in `front-end/pages/admin.html`, `officer.html`, `engineer.html`, `cfo.html`, and `qcreviewer.html`.
- All dashboard reads and CRUD operations go through the NestJS API; browser storage is used only for demo session and language preferences.
- `front-end/scripts/routes.js` centralizes page routing for the moved `pages/` structure.

The current visual direction uses a light civic interface with green as the signature color.

## Known Limitations

- No real database connection exists in this phase.
- `DBschema.sql` may contain future entities that are not active in the current in-memory product.
- Demo sign-in and `x-role` headers are not secure production authentication.
- Aadhaar/demo ID values in seed data are mock-only and should not be used as a production identity design.
- Amount fields such as `amountCr` and `amountLakhs` are display-friendly demo units, not a final accounting schema.

## Future Persistence Phase

When the project moves beyond the in-memory phase:

- Choose the final persistence layer and migration tool.
- Promote `DBschema.sql` or a revised schema into the real source of truth.
- Replace demo access with secure authentication, hashed passwords, sessions/JWTs, and production RBAC.
- Add schema/API parity tests so future drift is caught automatically.

## Local Commands

Install and run both apps from the root:

```bash
npm install
npm start
```

This starts the backend at `http://localhost:3000` and the frontend at `http://localhost:3001`.

Backend only:

```bash
cd back-end
npm install
npm run build
npm test
npm run start:dev
```

Frontend only:

Serve `front-end/` with any static server. Direct `file://` opening is not recommended for Review-4 because the frontend expects the backend API at `http://localhost:3000`.

## Project Status

Current phase: backend-driven in-memory functional prototype  
Persistence phase: planned later  
Last updated: May 2026
