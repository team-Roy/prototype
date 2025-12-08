import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: Error | null, user: TUser): TUser | null {
    // Don't throw error if user is not authenticated
    // Just return null/undefined
    return user || (null as TUser);
  }
}
