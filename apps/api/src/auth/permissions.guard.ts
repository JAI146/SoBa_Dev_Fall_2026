import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  permissionsForRole,
  type AdminPermissionValue,
} from "@muakhah/contracts";
import { AdminRoleEnum, UserTypeEnum } from "../entities/user.entity";
import { PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminPermissionValue[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { userType?: UserTypeEnum; adminRole?: AdminRoleEnum | null }
      | undefined;

    if (!user || user.userType !== UserTypeEnum.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    const role = user.adminRole ?? AdminRoleEnum.SUPER_ADMIN;
    const granted = permissionsForRole(role);
    const allowed = required.some((permission) => granted.includes(permission));
    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
