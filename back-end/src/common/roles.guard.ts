import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles';

/**
 * RolesGuard reads the `x-role` request header and compares it to
 * the roles attached via the @Roles() decorator.
 *
 * If no roles are attached to the route, all requests are allowed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles required for this route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles restriction → open route
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<any>();
    const roleHeader: string | undefined = request.headers?.['x-role'];

    if (!roleHeader) {
      throw new ForbiddenException(
        'Missing x-role header. Pass your role in the request header.',
      );
    }

    const role = roleHeader.toUpperCase().trim() as Role;

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(
        `Role "${role}" is not authorised for this action. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
