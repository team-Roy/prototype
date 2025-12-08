export enum ManagerRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
}

export interface Lounge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  icon: string | null;
  isOfficial: boolean;
  creatorId: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoungeManager {
  userId: string;
  loungeId: string;
  role: ManagerRole;
  createdAt: Date;
}

export interface LoungeMember {
  userId: string;
  loungeId: string;
  joinedAt: Date;
}
