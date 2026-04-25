# InfraLynx — CRIMS Backend

NestJS REST API for the City Resource and Infrastructure Management System (CRIMS).

## Stack

- **Framework:** NestJS (TypeScript)
- **Data:** In-memory (no database required)
- **Auth:** Role-based access control via `x-role` request header

## Setup

```bash
npm install
npm run start
```

API runs on `http://localhost:3000`

## Role-Based Access Control

Pass the role in every request header:

```
x-role: ADMINISTRATOR | OFFICER | ENGINEER | CFO | QC_REVIEWER | CITIZEN
```

## Modules & Endpoints

| Module | Base Route | Allowed Roles (write) |
|---|---|---|
| Departments | `/departments` | ADMINISTRATOR |
| Service Categories | `/service-categories` | — (read only) |
| Requests | `/requests` | Public (POST), ADMINISTRATOR/OFFICER (PATCH) |
| Work Orders | `/work-orders` | ADMINISTRATOR, OFFICER, ENGINEER |
| Quotations | `/quotations` | OFFICER, CFO |
| Inspections | `/inspections` | OFFICER, ENGINEER |
| Issue Reports | `/issue-reports` | ENGINEER |
| Resource Requests | `/resource-requests` | ENGINEER |
| Progress Reports | `/progress-reports` | ENGINEER |
| Budget Proposals | `/budget-proposals` | OFFICER (POST), CFO (PATCH) |
| Procurement Bills | `/procurement-bills` | OFFICER (POST), CFO (PATCH) |
| QC Reviews | `/qc-reviews` | QC_REVIEWER |
| Fund Releases | `/fund-releases` | CFO, ADMINISTRATOR |
| Maintenance | `/maintenance/schedules`, `/maintenance/logs` | OFFICER, ENGINEER |
| Field Assets | `/field-assets/sensors`, `/field-assets/materials` | ENGINEER |
| Outcome Reports | `/outcome-reports` | OFFICER, ADMINISTRATOR |

## Project Structure

```
src/
├── main.ts                  # Entry point
├── app.module.ts            # Root module
├── common/
│   ├── roles.ts             # Role types
│   ├── roles.decorator.ts   # @Roles() decorator
│   └── roles.guard.ts       # RBAC guard (reads x-role header)
├── data/
│   └── seed.data.ts         # In-memory seed data
└── <module>/
    ├── *.module.ts
    ├── *.controller.ts
    ├── *.service.ts
    └── *.dto.ts
```
