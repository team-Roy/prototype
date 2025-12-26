import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { ReviewApplicationDto, ReviewAction } from './dto/review-application.dto';
import { ERROR_CODES } from '@fandom/shared';
import { CreatorApplicationStatus, UserRole } from '@prisma/client';

@Injectable()
export class CreatorService {
  constructor(private prisma: PrismaService) {}

  // 크리에이터 신청
  async applyForCreator(userId: string, dto: ApplyCreatorDto) {
    // 이미 크리에이터인지 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    if (user.role === UserRole.CREATOR || user.role === UserRole.ADMIN) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '이미 크리에이터이거나 관리자입니다.',
      });
    }

    // 대기중인 신청이 있는지 확인
    const pendingApplication = await this.prisma.creatorApplication.findFirst({
      where: {
        userId,
        status: CreatorApplicationStatus.PENDING,
      },
    });

    if (pendingApplication) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '이미 심사 중인 신청이 있습니다.',
      });
    }

    // 신청 생성 (프론트엔드 필드명 -> DB 필드명 매핑)
    const application = await this.prisma.creatorApplication.create({
      data: {
        userId,
        creatorName: dto.stageName,
        channelUrl: dto.portfolioUrl || '',
        channelType: dto.category,
        introduction: dto.description,
      },
    });

    return application;
  }

  // 내 신청 현황 조회
  async getMyApplications(userId: string) {
    return this.prisma.creatorApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 신청 목록 조회 (관리자용)
  async getApplications(status?: CreatorApplicationStatus) {
    return this.prisma.creatorApplication.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
            profileImage: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 신청 상세 조회 (관리자용)
  async getApplication(applicationId: string) {
    const application = await this.prisma.creatorApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
            profileImage: true,
            bio: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '신청을 찾을 수 없습니다.',
      });
    }

    return application;
  }

  // 신청 처리 (관리자용)
  async reviewApplication(applicationId: string, adminId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.creatorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new NotFoundException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '신청을 찾을 수 없습니다.',
      });
    }

    if (application.status !== CreatorApplicationStatus.PENDING) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '이미 처리된 신청입니다.',
      });
    }

    if (dto.action === ReviewAction.APPROVE) {
      // 승인: 사용자 역할 변경 + 신청 상태 변경
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: application.userId },
          data: {
            role: UserRole.CREATOR,
            creatorName: application.creatorName,
            channelUrl: application.channelUrl,
          },
        }),
        this.prisma.creatorApplication.update({
          where: { id: applicationId },
          data: {
            status: CreatorApplicationStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedBy: adminId,
          },
        }),
      ]);

      return { message: '크리에이터 신청이 승인되었습니다.' };
    } else {
      // 거절
      if (!dto.rejectionReason) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '거절 사유를 입력해주세요.',
        });
      }

      await this.prisma.creatorApplication.update({
        where: { id: applicationId },
        data: {
          status: CreatorApplicationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason: dto.rejectionReason,
        },
      });

      return { message: '크리에이터 신청이 거절되었습니다.' };
    }
  }
}
