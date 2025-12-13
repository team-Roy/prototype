import { Test, TestingModule } from '@nestjs/testing';
import { LoungeService } from './lounge.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ManagerRole } from '@prisma/client';
import { LoungeSortBy } from './dto';

describe('LoungeService', () => {
  let service: LoungeService;

  const mockLounge = {
    id: 'lounge-1',
    name: '테스트 라운지',
    slug: 'test-lounge',
    description: '테스트 설명',
    coverImage: null,
    icon: null,
    isOfficial: false,
    isActive: true,
    memberCount: 1,
    postCount: 0,
    rules: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creatorId: 'user-1',
    creator: {
      id: 'user-1',
      nickname: 'testuser',
      profileImage: null,
    },
    _count: {
      posts: 0,
      members: 1,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaService: any = {
    lounge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    loungeManager: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    loungeMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    loungeBan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoungeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LoungeService>(LoungeService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated lounges', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([mockLounge]);
      mockPrismaService.lounge.count.mockResolvedValue(1);

      const result = await service.findAll({
        sortBy: LoungeSortBy.POPULAR,
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search query', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([mockLounge]);
      mockPrismaService.lounge.count.mockResolvedValue(1);

      await service.findAll({
        q: '테스트',
        sortBy: LoungeSortBy.RECENT,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.lounge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe('findPopular', () => {
    it('should return cached lounges if available', async () => {
      const cachedData = JSON.stringify([mockLounge]);
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.findPopular(10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockLounge.id);
      expect(result[0].name).toBe(mockLounge.name);
      expect(mockPrismaService.lounge.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache lounges if not cached', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.lounge.findMany.mockResolvedValue([mockLounge]);

      const result = await service.findPopular(10);

      expect(result).toHaveLength(1);
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return lounge with membership info', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue({
        ...mockLounge,
        managers: [{ userId: 'user-1', role: ManagerRole.OWNER, user: mockLounge.creator }],
      });
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await service.findBySlug('test-lounge', 'user-1');

      expect(result.isMember).toBe(true);
      expect(result.isManager).toBe(true);
      expect(result.managerRole).toBe(ManagerRole.OWNER);
    });

    it('should throw NotFoundException when lounge not found', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: '새 라운지',
      description: '새 라운지 설명',
    };

    it('should create a new lounge successfully', async () => {
      mockPrismaService.lounge.count.mockResolvedValue(0);
      mockPrismaService.lounge.findFirst.mockResolvedValue(null);
      mockPrismaService.lounge.create.mockResolvedValue({
        ...mockLounge,
        name: createDto.name,
        description: createDto.description,
      });
      mockPrismaService.loungeManager.create.mockResolvedValue({});
      mockPrismaService.loungeMember.create.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.create('user-1', createDto);

      expect(result.name).toBe(createDto.name);
    });

    it('should throw BadRequestException when user has max lounges', async () => {
      mockPrismaService.lounge.count.mockResolvedValue(2);

      await expect(service.create('user-1', createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when name exists', async () => {
      mockPrismaService.lounge.count.mockResolvedValue(0);
      mockPrismaService.lounge.findFirst.mockResolvedValue({ name: createDto.name });

      await expect(service.create('user-1', createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('join', () => {
    it('should join lounge successfully', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.create.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.join('lounge-1', 'user-2');

      expect(result.message).toContain('가입했습니다');
    });

    it('should throw ForbiddenException when user is banned', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.join('lounge-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when already a member', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-2' });

      await expect(service.join('lounge-1', 'user-2')).rejects.toThrow(ConflictException);
    });
  });

  describe('leave', () => {
    it('should leave lounge successfully', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeManager.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      mockPrismaService.loungeMember.delete.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.leave('lounge-1', 'user-2');

      expect(result.message).toContain('탈퇴했습니다');
    });

    it('should throw BadRequestException when owner tries to leave', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeManager.findUnique.mockResolvedValue({ role: ManagerRole.OWNER });

      await expect(service.leave('lounge-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      mockPrismaService.loungeManager.findUnique
        .mockResolvedValueOnce({ role: ManagerRole.OWNER }) // manager check
        .mockResolvedValueOnce(null); // target is not manager
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeBan.create.mockResolvedValue({});
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      mockPrismaService.loungeMember.delete.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.banUser('lounge-1', 'user-1', 'user-2', '규칙 위반');

      expect(result.message).toContain('차단되었습니다');
    });

    it('should throw BadRequestException when trying to ban a manager', async () => {
      mockPrismaService.loungeManager.findUnique
        .mockResolvedValueOnce({ role: ManagerRole.OWNER })
        .mockResolvedValueOnce({ role: ManagerRole.MANAGER });

      await expect(service.banUser('lounge-1', 'user-1', 'user-2')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('addManager', () => {
    it('should add manager successfully', async () => {
      let callCount = 0;
      mockPrismaService.loungeManager.findUnique.mockImplementation(() => {
        callCount++;
        // 첫 번째: checkOwnerPermission -> checkManagerPermission
        // 두 번째: existingManager 체크
        if (callCount === 1) return Promise.resolve({ role: ManagerRole.OWNER });
        return Promise.resolve(null);
      });
      mockPrismaService.loungeMember.findUnique.mockImplementation(() =>
        Promise.resolve({ userId: 'user-2' })
      );
      mockPrismaService.loungeManager.create.mockImplementation(() => Promise.resolve({}));

      const result = await service.addManager('lounge-1', 'user-1', {
        userId: 'user-2',
        role: ManagerRole.MANAGER,
      });

      expect(result.message).toContain('매니저가 추가되었습니다');
    });

    it('should throw ForbiddenException when not owner', async () => {
      mockPrismaService.loungeManager.findUnique.mockImplementation(() =>
        Promise.resolve({ role: ManagerRole.MANAGER })
      );

      await expect(service.addManager('lounge-1', 'user-1', { userId: 'user-2' })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException when target is not a member', async () => {
      let callCount = 0;
      mockPrismaService.loungeManager.findUnique.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ role: ManagerRole.OWNER });
        return Promise.resolve(null);
      });
      mockPrismaService.loungeMember.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.addManager('lounge-1', 'user-1', { userId: 'user-2' })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      description: '새로운 설명',
    };

    it('should update lounge successfully', async () => {
      // checkManagerPermission에서 loungeManager.findUnique 호출
      mockPrismaService.loungeManager.findUnique.mockImplementation(() =>
        Promise.resolve({ role: ManagerRole.OWNER })
      );
      mockPrismaService.lounge.update.mockImplementation(() =>
        Promise.resolve({
          ...mockLounge,
          description: updateDto.description,
        })
      );

      const result = await service.update('lounge-1', 'user-1', updateDto);

      expect(result.description).toBe(updateDto.description);
    });

    it('should throw ForbiddenException when not manager', async () => {
      mockPrismaService.loungeManager.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.update('lounge-1', 'user-1', updateDto)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should soft delete lounge successfully', async () => {
      // checkOwnerPermission -> checkManagerPermission 호출
      mockPrismaService.loungeManager.findUnique.mockImplementation(() =>
        Promise.resolve({ role: ManagerRole.OWNER })
      );
      mockPrismaService.lounge.update.mockImplementation(() =>
        Promise.resolve({ ...mockLounge, isActive: false })
      );

      const result = await service.delete('lounge-1', 'user-1');

      expect(result.message).toContain('삭제되었습니다');
    });

    it('should throw ForbiddenException when not owner', async () => {
      // checkOwnerPermission은 먼저 checkManagerPermission을 호출
      // MANAGER role이면 manager는 찾지만 owner가 아니므로 ForbiddenException
      mockPrismaService.loungeManager.findUnique.mockImplementation(() =>
        Promise.resolve({ role: ManagerRole.MANAGER })
      );

      await expect(service.delete('lounge-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when not manager at all', async () => {
      mockPrismaService.loungeManager.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.delete('lounge-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyLounges', () => {
    it('should return user lounges', async () => {
      mockPrismaService.loungeMember.findMany.mockResolvedValue([
        {
          lounge: mockLounge,
          joinedAt: new Date(),
        },
      ]);

      const result = await service.getMyLounges('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('joinedAt');
    });

    it('should return empty array when user has no lounges', async () => {
      mockPrismaService.loungeMember.findMany.mockResolvedValue([]);

      const result = await service.getMyLounges('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBannedUsers', () => {
    it('should return banned users list', async () => {
      // checkManagerPermission 호출
      mockPrismaService.loungeManager.findUnique.mockImplementation(() =>
        Promise.resolve({ role: ManagerRole.OWNER })
      );
      mockPrismaService.loungeBan.findMany.mockImplementation(() =>
        Promise.resolve([
          {
            user: { id: 'user-2', nickname: 'banned', profileImage: null },
            reason: '규칙 위반',
            expiresAt: null,
            bannedAt: new Date(),
          },
        ])
      );

      const result = await service.getBannedUsers('lounge-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].user.nickname).toBe('banned');
    });

    it('should throw ForbiddenException when not manager', async () => {
      mockPrismaService.loungeManager.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.getBannedUsers('lounge-1', 'user-1')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getMembers', () => {
    it('should return paginated members', async () => {
      mockPrismaService.loungeMember.findMany.mockResolvedValue([
        {
          user: { id: 'user-1', nickname: 'member1', profileImage: null },
          joinedAt: new Date(),
        },
      ]);
      mockPrismaService.loungeMember.count.mockResolvedValue(1);
      mockPrismaService.loungeManager.findMany.mockResolvedValue([
        { userId: 'user-1', role: ManagerRole.OWNER },
      ]);

      const result = await service.getMembers('lounge-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].role).toBe(ManagerRole.OWNER);
      expect(result.meta.total).toBe(1);
    });

    it('should handle members without manager role', async () => {
      mockPrismaService.loungeMember.findMany.mockResolvedValue([
        {
          user: { id: 'user-2', nickname: 'member2', profileImage: null },
          joinedAt: new Date(),
        },
      ]);
      mockPrismaService.loungeMember.count.mockResolvedValue(1);
      mockPrismaService.loungeManager.findMany.mockResolvedValue([]);

      const result = await service.getMembers('lounge-1', 1, 20);

      expect(result.items[0].role).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return lounge when found', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);

      const result = await service.findById('lounge-1');

      expect(result.id).toBe(mockLounge.id);
    });

    it('should throw NotFoundException when lounge not found', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('join - edge cases', () => {
    it('should allow joining if ban has expired', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      });
      mockPrismaService.loungeMember.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.create.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.join('lounge-1', 'user-2');

      expect(result.message).toContain('가입했습니다');
    });

    it('should throw ForbiddenException for permanent ban (null expiresAt)', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({
        expiresAt: null, // permanent ban
      });

      await expect(service.join('lounge-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leave - edge cases', () => {
    it('should throw BadRequestException when not a member', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeManager.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeMember.findUnique.mockResolvedValue(null);

      await expect(service.leave('lounge-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('should remove manager role when leaving as manager (non-owner)', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeManager.findUnique.mockResolvedValue({ role: ManagerRole.MANAGER });
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      mockPrismaService.loungeManager.delete.mockResolvedValue({});
      mockPrismaService.loungeMember.delete.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.leave('lounge-1', 'user-2');

      expect(result.message).toContain('탈퇴했습니다');
      expect(mockPrismaService.loungeManager.delete).toHaveBeenCalled();
    });
  });

  describe('banUser - edge cases', () => {
    it('should create ban with expiration date', async () => {
      // 1번: checkManagerPermission에서 호출 (권한 있음)
      // 2번: target이 매니저인지 확인 (매니저 아님)
      mockPrismaService.loungeManager.findUnique
        .mockResolvedValueOnce({ role: ManagerRole.OWNER })
        .mockResolvedValueOnce(null);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.loungeBan.create.mockResolvedValue({});
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-2' });
      mockPrismaService.loungeMember.delete.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.banUser('lounge-1', 'user-1', 'user-2', '규칙 위반', 7);

      expect(result.message).toContain('차단되었습니다');
    });

    it('should throw ConflictException when user is already banned', async () => {
      // 1번: checkManagerPermission에서 호출 (권한 있음)
      // 2번: target이 매니저인지 확인 (매니저 아님)
      mockPrismaService.loungeManager.findUnique
        .mockResolvedValueOnce({ role: ManagerRole.OWNER })
        .mockResolvedValueOnce(null);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({ userId: 'user-2' });

      await expect(service.banUser('lounge-1', 'user-1', 'user-2')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('findAll - sorting', () => {
    it('should sort by name', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([mockLounge]);
      mockPrismaService.lounge.count.mockResolvedValue(1);

      await service.findAll({
        sortBy: LoungeSortBy.NAME,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.lounge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  describe('create - slug handling', () => {
    it('should throw ConflictException when slug already exists', async () => {
      mockPrismaService.lounge.count.mockResolvedValue(0);
      mockPrismaService.lounge.findFirst.mockResolvedValue({ slug: 'existing-slug' });

      await expect(
        service.create('user-1', { name: '새 라운지', slug: 'existing-slug' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySlug - without user', () => {
    it('should return lounge without membership info when no user', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue({
        ...mockLounge,
        managers: [],
      });

      const result = await service.findBySlug('test-lounge');

      expect(result.isMember).toBe(false);
      expect(result.isManager).toBe(false);
      expect(result.managerRole).toBeNull();
    });
  });
});
