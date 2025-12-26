import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user?: { role: string }): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.USER });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return true if user has one of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.CREATOR]);
      const context = createMockExecutionContext({ role: UserRole.CREATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false if user has none of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.CREATOR]);
      const context = createMockExecutionContext({ role: UserRole.USER });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return false if no user in request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(undefined);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should use ROLES_KEY for metadata lookup', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
      getAllAndOverrideSpy.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.USER });

      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        expect.anything(),
        expect.anything(),
      ]);
    });

    describe('ADMIN role', () => {
      it('should allow ADMIN access to ADMIN-only routes', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({ role: UserRole.ADMIN });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should deny USER access to ADMIN-only routes', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({ role: UserRole.USER });

        expect(guard.canActivate(context)).toBe(false);
      });

      it('should deny CREATOR access to ADMIN-only routes', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({ role: UserRole.CREATOR });

        expect(guard.canActivate(context)).toBe(false);
      });
    });

    describe('CREATOR role', () => {
      it('should allow CREATOR access to CREATOR-only routes', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CREATOR]);
        const context = createMockExecutionContext({ role: UserRole.CREATOR });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should deny USER access to CREATOR-only routes', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CREATOR]);
        const context = createMockExecutionContext({ role: UserRole.USER });

        expect(guard.canActivate(context)).toBe(false);
      });

      it('should allow ADMIN access to CREATOR-only routes if specified', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.CREATOR, UserRole.ADMIN]);
        const context = createMockExecutionContext({ role: UserRole.ADMIN });

        expect(guard.canActivate(context)).toBe(true);
      });
    });

    describe('Mixed roles', () => {
      it('should allow access when user has any of the required roles', () => {
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.USER, UserRole.CREATOR, UserRole.ADMIN]);
        const context = createMockExecutionContext({ role: UserRole.USER });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should work with empty roles array', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
        const context = createMockExecutionContext({ role: UserRole.USER });

        expect(guard.canActivate(context)).toBe(false);
      });
    });
  });
});
