// Official demo roles in the in-memory CRIMS phase.
// Citizens are public requesters, not official RBAC actors.
export type Role = 'ADMINISTRATOR' | 'OFFICER' | 'ENGINEER' | 'CFO' | 'QC_REVIEWER';

export const ROLES_KEY = 'roles';
