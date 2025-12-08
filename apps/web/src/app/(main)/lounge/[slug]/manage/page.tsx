'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { loungeApi } from '@/lib/lounge';
import { loungeManageApi, BannedUser, LoungeMember } from '@/lib/admin';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@fandom/shared';

type Tab = 'members' | 'banned' | 'settings';

export default function LoungeManagePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [lounge, setLounge] = useState<{
    id: string;
    name: string;
    description: string | null;
    rules: string | null;
    isManager: boolean;
    managerRole: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('members');

  // Members state
  const [members, setMembers] = useState<LoungeMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersMeta, setMembersMeta] = useState({ total: 0, totalPages: 0 });

  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);

  // Settings state
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Ban modal state
  const [banTarget, setBanTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchLounge();
    }
  }, [slug, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (lounge?.id) {
      if (activeTab === 'members') {
        fetchMembers();
      } else if (activeTab === 'banned') {
        fetchBannedUsers();
      }
    }
  }, [lounge?.id, activeTab, membersPage]);

  const fetchLounge = async () => {
    try {
      const data = await loungeApi.getBySlug(slug);
      if (!data.isManager) {
        router.push(`/lounge/${slug}`);
        return;
      }
      setLounge(data);
      setDescription(data.description || '');
      setRules(data.rules || '');
    } catch (error) {
      console.error('Failed to fetch lounge:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!lounge?.id) return;
    try {
      const data = await loungeManageApi.getMembers(lounge.id, membersPage);
      setMembers(data.items);
      setMembersMeta({ total: data.meta.total, totalPages: data.meta.totalPages });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchBannedUsers = async () => {
    if (!lounge?.id) return;
    try {
      const data = await loungeManageApi.getBannedUsers(lounge.id);
      setBannedUsers(data);
    } catch (error) {
      console.error('Failed to fetch banned users:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!lounge?.id) return;
    setIsSaving(true);
    try {
      await loungeApi.update(lounge.id, { description, rules });
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBanUser = async () => {
    if (!lounge?.id || !banTarget) return;
    try {
      await loungeManageApi.banUser(
        lounge.id,
        banTarget.id,
        banReason || undefined,
        banDuration ? parseInt(banDuration, 10) : undefined
      );
      setBanTarget(null);
      setBanReason('');
      setBanDuration('');
      fetchMembers();
      fetchBannedUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('차단에 실패했습니다.');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!lounge?.id) return;
    if (!confirm('차단을 해제하시겠습니까?')) return;
    try {
      await loungeManageApi.unbanUser(lounge.id, userId);
      fetchBannedUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('차단 해제에 실패했습니다.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-4xl py-6">
        <div className="text-center text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!lounge) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-6">
      <h1 className="text-2xl font-bold mb-2">{lounge.name} 관리</h1>
      <p className="text-muted-foreground mb-6">라운지 관리자 페이지</p>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        {(['members', 'banned', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'members' && `멤버 (${membersMeta.total})`}
            {tab === 'banned' && `차단 (${bannedUsers.length})`}
            {tab === 'settings' && '설정'}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.profileImage ? (
                      <img
                        src={member.profileImage}
                        alt={member.nickname}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg">{member.nickname.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.nickname}</span>
                      {member.role && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {member.role === 'OWNER' ? '소유자' : '매니저'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      가입: {formatRelativeTime(member.joinedAt)}
                    </p>
                  </div>
                </div>
                {!member.role && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setBanTarget({ id: member.id, nickname: member.nickname })}
                  >
                    차단
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {membersMeta.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={membersPage === 1}
                onClick={() => setMembersPage(membersPage - 1)}
              >
                이전
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {membersPage} / {membersMeta.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={membersPage >= membersMeta.totalPages}
                onClick={() => setMembersPage(membersPage + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Banned Tab */}
      {activeTab === 'banned' && (
        <div className="space-y-4">
          {bannedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">차단된 사용자가 없습니다.</p>
          ) : (
            bannedUsers.map((ban) => (
              <Card key={ban.user.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {ban.user.profileImage ? (
                        <img
                          src={ban.user.profileImage}
                          alt={ban.user.nickname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{ban.user.nickname.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{ban.user.nickname}</span>
                      {ban.reason && (
                        <p className="text-sm text-muted-foreground">사유: {ban.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        차단일: {formatRelativeTime(ban.createdAt)}
                        {ban.expiresAt &&
                          ` · 만료: ${new Date(ban.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUnbanUser(ban.user.id)}>
                    차단 해제
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">라운지 설명</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="라운지 설명을 입력하세요"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">라운지 규칙 (마크다운 지원)</label>
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="라운지 규칙을 입력하세요"
              rows={10}
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      )}

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-lg font-semibold">{banTarget.nickname} 차단</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">차단 사유 (선택)</label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="차단 사유를 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  차단 기간 (일, 비워두면 영구)
                </label>
                <Input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  placeholder="예: 7"
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBanTarget(null)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={handleBanUser}>
                  차단
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
