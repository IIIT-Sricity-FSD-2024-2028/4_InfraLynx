import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, Role } from './roles';

/**
 * Attach allowed roles to a route handler.
 * Usage: @Roles('ADMINISTRATOR', 'OFFICER')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
