import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateLoungeDto,
  UpdateLoungeDto,
  LoungeListQueryDto,
  LoungeSortBy,
  AddManagerDto,
} from './dto';
import { ManagerRole, Prisma, UserRole } from '@prisma/client';
import { slugify } from '@fandom/shared';

const CACHE_TTL = 300; // 5 minutes
const MAX_LOUNGES_PER_USER = 2;

@Injectable()
export class LoungeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async findAll(query: LoungeListQueryDto) {
    const { q, sortBy = LoungeSortBy.POPULAR, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LoungeWhereInput = {
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const orderBy: Prisma.LoungeOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case LoungeSortBy.POPULAR:
          return { memberCount: 'desc' as const };
        case LoungeSortBy.RECENT:
          return { createdAt: 'desc' as const };
        case LoungeSortBy.NAME:
          return { name: 'asc' as const };
        default:
          return { memberCount: 'desc' as const };
      }
    })();

    const [lounges, total] = await Promise.all([
      this.prisma.lounge.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
          _count: {
            select: {
              posts: true,
              members: true,
            },
          },
        },
      }),
      this.prisma.lounge.count({ where }),
    ]);

    return {
      items: lounges.map((lounge) => this.formatLoungeResponse(lounge)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPopular(limit: number = 10) {
    const cacheKey = `lounges:popular:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const lounges = await this.prisma.lounge.findMany({
      where: { isActive: true },
      orderBy: { memberCount: 'desc' },
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
      },
    });

    const result = lounges.map((lounge) => this.formatLoungeResponse(lounge));
    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);

    return result;
  }

  async findBySlug(slug: string, userId?: string) {
    const lounge = await this.prisma.lounge.findUnique({
      where: { slug, isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
        officialCreator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            creatorName: true,
            role: true,
          },
        },
        managers: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    let isMember = false;
    let isManager = false;
    let managerRole: ManagerRole | null = null;

    if (userId) {
      const membership = await this.prisma.loungeMember.findUnique({
        where: {
          userId_loungeId: { userId, loungeId: lounge.id },
        },
      });
      isMember = !!membership;

      const manager = lounge.managers.find((m) => m.userId === userId);
      if (manager) {
        isManager = true;
        managerRole = manager.role;
      }
    }

    return {
      ...this.formatLoungeResponse(lounge),
      officialCreator: lounge.officialCreator,
      managers: lounge.managers.map((m) => ({
        user: m.user,
        role: m.role,
      })),
      rules: lounge.rules,
      isMember,
      isManager,
      managerRole,
    };
  }

  async findById(id: string) {
    const lounge = await this.prisma.lounge.findUnique({
      where: { id, isActive: true },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    return lounge;
  }

  async create(userId: string, dto: CreateLoungeDto) {
    // Check lounge creation limit
    const userLoungeCount = await this.prisma.lounge.count({
      where: { creatorId: userId, isActive: true },
    });

    if (userLoungeCount >= MAX_LOUNGES_PER_USER) {
      throw new BadRequestException(
        `사용자당 최대 ${MAX_LOUNGES_PER_USER}개의 라운지만 생성할 수 있습니다`
      );
    }

    // Generate slug from name if not provided
    const slug = dto.slug || slugify(dto.name);

    // Check slug uniqueness
    const existingLounge = await this.prisma.lounge.findFirst({
      where: {
        OR: [{ slug }, { name: dto.name }],
      },
    });

    if (existingLounge) {
      if (existingLounge.name === dto.name) {
        throw new ConflictException('이미 존재하는 라운지 이름입니다');
      }
      throw new ConflictException('이미 존재하는 slug입니다');
    }

    // Create lounge with creator as OWNER
    const lounge = await this.prisma.$transaction(async (tx) => {
      const newLounge = await tx.lounge.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          creatorId: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
      });

      // Add creator as OWNER manager
      await tx.loungeManager.create({
        data: {
          userId,
          loungeId: newLounge.id,
          role: ManagerRole.OWNER,
        },
      });

      // Add creator as member
      await tx.loungeMember.create({
        data: {
          userId,
          loungeId: newLounge.id,
        },
      });

      // Update member count
      await tx.lounge.update({
        where: { id: newLounge.id },
        data: { memberCount: 1 },
      });

      return newLounge;
    });

    // Invalidate cache
    await this.invalidateCache();

    return this.formatLoungeResponse(lounge);
  }

  async update(loungeId: string, userId: string, dto: UpdateLoungeDto) {
    await this.checkManagerPermission(loungeId, userId);

    const lounge = await this.prisma.lounge.update({
      where: { id: loungeId },
      data: dto,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
      },
    });

    await this.invalidateCache();

    return this.formatLoungeResponse(lounge);
  }

  async delete(loungeId: string, userId: string) {
    await this.checkOwnerPermission(loungeId, userId);

    await this.prisma.lounge.update({
      where: { id: loungeId },
      data: { isActive: false },
    });

    await this.invalidateCache();

    return { message: '라운지가 삭제되었습니다' };
  }

  async join(loungeId: string, userId: string) {
    const lounge = await this.findById(loungeId);

    // Check if banned
    const ban = await this.prisma.loungeBan.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
      throw new ForbiddenException('이 라운지에서 차단되었습니다');
    }

    // Check if already a member
    const existingMembership = await this.prisma.loungeMember.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (existingMembership) {
      throw new ConflictException('이미 가입한 라운지입니다');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.loungeMember.create({
        data: { userId, loungeId },
      });

      await tx.lounge.update({
        where: { id: loungeId },
        data: { memberCount: { increment: 1 } },
      });
    });

    await this.invalidateCache();

    return { message: `${lounge.name} 라운지에 가입했습니다` };
  }

  async leave(loungeId: string, userId: string) {
    const lounge = await this.findById(loungeId);

    // Check if owner
    const manager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (manager?.role === ManagerRole.OWNER) {
      throw new BadRequestException(
        '라운지 소유자는 탈퇴할 수 없습니다. 소유권을 이전하거나 라운지를 삭제하세요.'
      );
    }

    // Check if member
    const membership = await this.prisma.loungeMember.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (!membership) {
      throw new BadRequestException('가입하지 않은 라운지입니다');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove manager role if exists
      if (manager) {
        await tx.loungeManager.delete({
          where: {
            userId_loungeId: { userId, loungeId },
          },
        });
      }

      await tx.loungeMember.delete({
        where: {
          userId_loungeId: { userId, loungeId },
        },
      });

      await tx.lounge.update({
        where: { id: loungeId },
        data: { memberCount: { decrement: 1 } },
      });
    });

    await this.invalidateCache();

    return { message: `${lounge.name} 라운지에서 탈퇴했습니다` };
  }

  async addManager(loungeId: string, userId: string, dto: AddManagerDto) {
    await this.checkOwnerPermission(loungeId, userId);

    // Check if target user is a member
    const membership = await this.prisma.loungeMember.findUnique({
      where: {
        userId_loungeId: { userId: dto.userId, loungeId },
      },
    });

    if (!membership) {
      throw new BadRequestException('라운지 멤버만 매니저로 지정할 수 있습니다');
    }

    // Check if already a manager
    const existingManager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId: dto.userId, loungeId },
      },
    });

    if (existingManager) {
      throw new ConflictException('이미 매니저입니다');
    }

    await this.prisma.loungeManager.create({
      data: {
        userId: dto.userId,
        loungeId,
        role: dto.role || ManagerRole.MANAGER,
      },
    });

    return { message: '매니저가 추가되었습니다' };
  }

  async removeManager(loungeId: string, userId: string, targetUserId: string) {
    await this.checkOwnerPermission(loungeId, userId);

    const manager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    if (!manager) {
      throw new NotFoundException('매니저를 찾을 수 없습니다');
    }

    if (manager.role === ManagerRole.OWNER) {
      throw new BadRequestException('소유자는 삭제할 수 없습니다');
    }

    await this.prisma.loungeManager.delete({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    return { message: '매니저가 삭제되었습니다' };
  }

  async getMyLounges(userId: string) {
    const memberships = await this.prisma.loungeMember.findMany({
      where: { userId },
      include: {
        lounge: {
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...this.formatLoungeResponse(m.lounge),
      joinedAt: m.joinedAt,
    }));
  }

  async banUser(
    loungeId: string,
    managerId: string,
    targetUserId: string,
    reason?: string,
    durationDays?: number
  ) {
    await this.checkManagerPermission(loungeId, managerId);

    // Can't ban a manager
    const targetManager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    if (targetManager) {
      throw new BadRequestException('매니저는 차단할 수 없습니다');
    }

    // Check if already banned
    const existingBan = await this.prisma.loungeBan.findUnique({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    if (existingBan) {
      throw new ConflictException('이미 차단된 사용자입니다');
    }

    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.$transaction(async (tx) => {
      // Create ban
      await tx.loungeBan.create({
        data: {
          userId: targetUserId,
          loungeId,
          reason,
          expiresAt,
        },
      });

      // Remove from members if member
      const membership = await tx.loungeMember.findUnique({
        where: {
          userId_loungeId: { userId: targetUserId, loungeId },
        },
      });

      if (membership) {
        await tx.loungeMember.delete({
          where: {
            userId_loungeId: { userId: targetUserId, loungeId },
          },
        });

        await tx.lounge.update({
          where: { id: loungeId },
          data: { memberCount: { decrement: 1 } },
        });
      }
    });

    return { message: '사용자가 차단되었습니다' };
  }

  async unbanUser(loungeId: string, managerId: string, targetUserId: string) {
    await this.checkManagerPermission(loungeId, managerId);

    const ban = await this.prisma.loungeBan.findUnique({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    if (!ban) {
      throw new NotFoundException('차단된 사용자가 아닙니다');
    }

    await this.prisma.loungeBan.delete({
      where: {
        userId_loungeId: { userId: targetUserId, loungeId },
      },
    });

    return { message: '차단이 해제되었습니다' };
  }

  async getBannedUsers(loungeId: string, managerId: string) {
    await this.checkManagerPermission(loungeId, managerId);

    const bans = await this.prisma.loungeBan.findMany({
      where: { loungeId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
      },
      orderBy: { bannedAt: 'desc' },
    });

    return bans.map((ban) => ({
      user: ban.user,
      reason: ban.reason,
      expiresAt: ban.expiresAt,
      createdAt: ban.bannedAt,
    }));
  }

  async getMembers(loungeId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      this.prisma.loungeMember.findMany({
        where: { loungeId },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loungeMember.count({ where: { loungeId } }),
    ]);

    // Get managers for role info
    const managers = await this.prisma.loungeManager.findMany({
      where: { loungeId },
      select: { userId: true, role: true },
    });

    const managerMap = new Map(managers.map((m) => [m.userId, m.role]));

    return {
      items: members.map((m) => ({
        ...m.user,
        joinedAt: m.joinedAt,
        role: managerMap.get(m.user.id) || null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Helper methods
  private async checkManagerPermission(loungeId: string, userId: string) {
    const manager = await this.prisma.loungeManager.findUnique({
      where: {
        userId_loungeId: { userId, loungeId },
      },
    });

    if (!manager) {
      throw new ForbiddenException('매니저 권한이 필요합니다');
    }

    return manager;
  }

  private async checkOwnerPermission(loungeId: string, userId: string) {
    const manager = await this.checkManagerPermission(loungeId, userId);

    if (manager.role !== ManagerRole.OWNER) {
      throw new ForbiddenException('소유자 권한이 필요합니다');
    }

    return manager;
  }

  private formatLoungeResponse(lounge: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverImage: string | null;
    icon: string | null;
    isOfficial: boolean;
    memberCount: number;
    postCount: number;
    createdAt: Date;
    rules?: string | null;
    creator?: {
      id: string;
      nickname: string;
      profileImage: string | null;
    };
    _count?: {
      posts: number;
      members: number;
    };
  }) {
    return {
      id: lounge.id,
      name: lounge.name,
      slug: lounge.slug,
      description: lounge.description,
      coverImage: lounge.coverImage,
      icon: lounge.icon,
      isOfficial: lounge.isOfficial,
      memberCount: lounge._count?.members ?? lounge.memberCount,
      postCount: lounge._count?.posts ?? lounge.postCount,
      createdAt: lounge.createdAt,
      creator: lounge.creator,
    };
  }

  private async invalidateCache() {
    const keys = await this.redis.keys('lounges:*');
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
  }

  // =============================================
  // 공식 라운지 관련 메서드
  // =============================================

  /**
   * 크리에이터가 라운지를 공식 인증 요청
   * - 크리에이터만 가능
   * - 라운지 소유자(OWNER)이거나 관리자 승인 필요
   */
  async claimOfficial(loungeId: string, creatorId: string) {
    // 1. 사용자가 크리에이터인지 확인
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!user || user.role !== UserRole.CREATOR) {
      throw new ForbiddenException('크리에이터만 공식 라운지를 인증할 수 있습니다');
    }

    // 2. 라운지 확인
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId, isActive: true },
      include: {
        managers: true,
      },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    // 3. 이미 공식 라운지인 경우
    if (lounge.isOfficial && lounge.officialCreatorId) {
      throw new BadRequestException('이미 공식 인증된 라운지입니다');
    }

    // 4. 크리에이터가 라운지 소유자인지 확인
    const isOwner = lounge.managers.some(
      (m) => m.userId === creatorId && m.role === ManagerRole.OWNER
    );

    if (isOwner) {
      // 소유자라면 즉시 공식 인증
      await this.prisma.lounge.update({
        where: { id: loungeId },
        data: {
          isOfficial: true,
          officialCreatorId: creatorId,
        },
      });

      await this.invalidateCache();

      return { message: '공식 라운지로 인증되었습니다' };
    }

    // 5. 소유자가 아니라면 관리자 승인 필요 (추후 구현)
    // 현재는 관리자에게만 승인 권한 부여
    throw new BadRequestException('라운지 소유자가 아닌 경우 관리자에게 공식 인증을 요청해주세요');
  }

  /**
   * 관리자가 라운지를 공식 인증 처리
   */
  async approveOfficial(loungeId: string, creatorId: string, adminId: string) {
    // 1. 관리자 권한 확인
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    // 2. 라운지 확인
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId, isActive: true },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    // 3. 크리에이터 확인
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator || creator.role !== UserRole.CREATOR) {
      throw new BadRequestException('유효한 크리에이터가 아닙니다');
    }

    // 4. 공식 인증 처리
    await this.prisma.$transaction(async (tx) => {
      // 라운지 공식 인증
      await tx.lounge.update({
        where: { id: loungeId },
        data: {
          isOfficial: true,
          officialCreatorId: creatorId,
        },
      });

      // 크리에이터를 라운지 매니저(OWNER)로 추가 (없는 경우)
      const existingManager = await tx.loungeManager.findUnique({
        where: {
          userId_loungeId: { userId: creatorId, loungeId },
        },
      });

      if (!existingManager) {
        // 멤버로 먼저 추가
        const existingMember = await tx.loungeMember.findUnique({
          where: {
            userId_loungeId: { userId: creatorId, loungeId },
          },
        });

        if (!existingMember) {
          await tx.loungeMember.create({
            data: { userId: creatorId, loungeId },
          });
          await tx.lounge.update({
            where: { id: loungeId },
            data: { memberCount: { increment: 1 } },
          });
        }

        // 매니저로 추가 (기존 OWNER와 함께 관리)
        await tx.loungeManager.create({
          data: {
            userId: creatorId,
            loungeId,
            role: ManagerRole.OWNER,
          },
        });
      } else if (existingManager.role !== ManagerRole.OWNER) {
        // 기존 매니저를 OWNER로 승격
        await tx.loungeManager.update({
          where: {
            userId_loungeId: { userId: creatorId, loungeId },
          },
          data: { role: ManagerRole.OWNER },
        });
      }
    });

    await this.invalidateCache();

    return { message: '공식 라운지로 인증되었습니다' };
  }

  /**
   * 공식 인증 해제 (관리자만)
   */
  async revokeOfficial(loungeId: string, adminId: string) {
    // 관리자 권한 확인
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    // 라운지 확인
    const lounge = await this.prisma.lounge.findUnique({
      where: { id: loungeId, isActive: true },
    });

    if (!lounge) {
      throw new NotFoundException('라운지를 찾을 수 없습니다');
    }

    if (!lounge.isOfficial) {
      throw new BadRequestException('공식 인증된 라운지가 아닙니다');
    }

    await this.prisma.lounge.update({
      where: { id: loungeId },
      data: {
        isOfficial: false,
        officialCreatorId: null,
      },
    });

    await this.invalidateCache();

    return { message: '공식 인증이 해제되었습니다' };
  }

  /**
   * 크리에이터의 공식 라운지 목록 조회
   */
  async getOfficialLounges(creatorId: string) {
    const lounges = await this.prisma.lounge.findMany({
      where: {
        officialCreatorId: creatorId,
        isOfficial: true,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
        officialCreator: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            creatorName: true,
          },
        },
      },
    });

    return lounges.map((lounge) => this.formatLoungeResponse(lounge));
  }
}
