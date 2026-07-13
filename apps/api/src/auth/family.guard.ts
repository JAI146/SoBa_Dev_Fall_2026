import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserTypeEnum } from "../entities/user.entity";

@Injectable()
export class FamilyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userType?: UserTypeEnum } | undefined;
    if (!user || user.userType !== UserTypeEnum.FAMILY) {
      throw new ForbiddenException("Family access required");
    }
    return true;
  }
}
