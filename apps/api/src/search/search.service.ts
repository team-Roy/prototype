import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType, TagSearchQueryDto } from './dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto) {
    const { q, type = SearchType.ALL, page = 1, limit = 20 } = query;

    // Check if it's a tag search
    const isTagSearch = q.startsWith('#');
    const searchTerm = isTagSearch ? q.slice(1) : q;

    const results: {
      lounges: {
        items: Array<{
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          memberCount: number;
          isOfficial: boolean;
        }>;
        total: number;
      };
      posts: {
        items: Array<{
          id: string;
          title: string | null;
          content: string;
          type: string;
          author: { nickname: string };
          lounge: { name: string; slug: string };
          upvoteCount: number;
          commentCount: number;
          createdAt: Date;
        }>;
        total: number;
      };
    } = {
      lounges: { items: [], total: 0 },
      posts: { items: [], total: 0 },
    };

    // Search lounges
    if ((type === SearchType.ALL || type === SearchType.LOUNGE) && !isTagSearch) {
      const loungeWhere = {
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' as const } },
          { description: { contains: searchTerm, mode: 'insensitive' as const } },
        ],
      };

      const [lounges, loungeCount] = await Promise.all([
        this.prisma.lounge.findMany({
          where: loungeWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            memberCount: true,
            isOfficial: true,
          },
          orderBy: { memberCount: 'desc' },
          skip: type === SearchType.LOUNGE ? (page - 1) * limit : 0,
          take: type === SearchType.LOUNGE ? limit : 5,
        }),
        this.prisma.lounge.count({ where: loungeWhere }),
      ]);

      results.lounges = { items: lounges, total: loungeCount };
    }

    // Search posts
    if (type === SearchType.ALL || type === SearchType.POST) {
      let postWhere;

      if (isTagSearch) {
        // Tag search
        postWhere = {
          deletedAt: null,
          tags: {
            some: {
              tag: { equals: searchTerm, mode: 'insensitive' as const },
            },
          },
        };
      } else {
        // Text search
        postWhere = {
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' as const } },
            { content: { contains: searchTerm, mode: 'insensitive' as const } },
          ],
        };
      }

      const [posts, postCount] = await Promise.all([
        this.prisma.post.findMany({
          where: postWhere,
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            author: {
              select: { nickname: true },
            },
            lounge: {
              select: { name: true, slug: true },
            },
            upvoteCount: true,
            commentCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: type === SearchType.POST ? (page - 1) * limit : 0,
          take: type === SearchType.POST ? limit : 10,
        }),
        this.prisma.post.count({ where: postWhere }),
      ]);

      results.posts = { items: posts, total: postCount };
    }

    return {
      query: q,
      type,
      results,
    };
  }

  async searchTags(query: TagSearchQueryDto) {
    const { q, limit = 10 } = query;

    if (q) {
      // Search tags by prefix
      const tags = await this.prisma.postTag.findMany({
        where: {
          tag: { startsWith: q, mode: 'insensitive' },
        },
        select: { tag: true },
        distinct: ['tag'],
        take: limit,
      });

      return tags.map((t) => t.tag);
    } else {
      // Get popular tags
      const popularTags = await this.prisma.popularTag.findMany({
        where: { loungeId: null },
        orderBy: { count: 'desc' },
        take: limit,
        select: { tag: true, count: true },
      });

      // If no popular tags in cache, get from posts
      if (popularTags.length === 0) {
        const tags = await this.prisma.postTag.groupBy({
          by: ['tag'],
          _count: { tag: true },
          orderBy: { _count: { tag: 'desc' } },
          take: limit,
        });

        return tags.map((t) => t.tag);
      }

      return popularTags.map((t) => t.tag);
    }
  }
}
