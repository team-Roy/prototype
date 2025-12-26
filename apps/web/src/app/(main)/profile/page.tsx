'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { userApi } from '@/lib/user';
import { creatorApi, CreatorApplication } from '@/lib/creator';

type ModalType = 'profile' | 'password' | 'creator' | 'delete' | null;

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const { isLoading } = useRequireAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myApplications, setMyApplications] = useState<CreatorApplication[]>([]);

  // 프로필 수정 폼
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');

  // 비밀번호 변경 폼
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 크리에이터 신청 폼
  const [stageName, setStageName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // 회원 탈퇴
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setBio(user.bio || '');
      loadMyApplications();
    }
  }, [user]);

  const loadMyApplications = async () => {
    try {
      const apps = await creatorApi.getMyApplications();
      setMyApplications(apps);
    } catch {
      // 에러 무시
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStageName('');
    setCategory('');
    setDescription('');
    setPortfolioUrl('');
    setDeletePassword('');
  };

  const openModal = (type: ModalType) => {
    resetForm();
    if (user) {
      setNickname(user.nickname);
      setBio(user.bio || '');
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    resetForm();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 닉네임 중복 체크
      if (nickname !== user?.nickname) {
        const { available } = await userApi.checkNickname(nickname, user?.id);
        if (!available) {
          setError('이미 사용 중인 닉네임입니다.');
          setIsSubmitting(false);
          return;
        }
      }

      await userApi.updateProfile({ nickname, bio });
      await refreshUser();
      setSuccess('프로필이 수정되었습니다.');
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || '프로필 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setSuccess('비밀번호가 변경되었습니다.');
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatorApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!stageName || !category || !description) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await creatorApi.apply({
        stageName,
        category,
        description,
        portfolioUrl: portfolioUrl || undefined,
      });
      setSuccess('크리에이터 신청이 완료되었습니다. 관리자 승인 후 크리에이터가 됩니다.');
      await loadMyApplications();
      setTimeout(() => {
        closeModal();
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || '크리에이터 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await userApi.deleteAccount(deletePassword || undefined);
      await logout();
      router.push('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || '회원 탈퇴에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pendingApplication = myApplications.find((a) => a.status === 'PENDING');
  const isCreator = user.role === 'CREATOR';
  const isAdmin = user.role === 'ADMIN';
  const isSocialLogin = user.provider !== 'LOCAL';

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">내 정보</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>회원 정보를 확인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.nickname}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.bio && <p className="text-sm mt-1">{user.bio}</p>}
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">이메일</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">닉네임</span>
              <span>{user.nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">역할</span>
              <span>{isAdmin ? '관리자' : isCreator ? '크리에이터' : '일반 회원'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">로그인 방식</span>
              <span>{isSocialLogin ? '소셜 로그인' : '이메일'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>계정 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openModal('profile')}
          >
            프로필 수정
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openModal('password')}
            disabled={isSocialLogin}
          >
            비밀번호 변경 {isSocialLogin && '(소셜 로그인 사용자 불가)'}
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            로그아웃
          </Button>
        </CardContent>
      </Card>

      {!isCreator && !isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>크리에이터</CardTitle>
            <CardDescription>크리에이터가 되어 나만의 팬덤 라운지를 만들어보세요</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApplication ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">크리에이터 신청이 심사 중입니다.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  신청일: {new Date(pendingApplication.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <Button className="w-full" onClick={() => openModal('creator')}>
                크리에이터 신청하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">위험 구역</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => openModal('delete')}
          >
            회원 탈퇴
          </Button>
        </CardContent>
      </Card>

      {/* 모달들 */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* 프로필 수정 모달 */}
            {activeModal === 'profile' && (
              <form onSubmit={handleUpdateProfile}>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">프로필 수정</h2>
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nickname">닉네임</Label>
                      <Input
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">자기소개</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="간단한 자기소개를 입력하세요"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </form>
            )}

            {/* 비밀번호 변경 모달 */}
            {activeModal === 'password' && (
              <form onSubmit={handleChangePassword}>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">비밀번호 변경</h2>
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">현재 비밀번호</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">새 비밀번호</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <p className="text-xs text-muted-foreground mt-1">8자 이상 입력하세요</p>
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? '변경 중...' : '변경'}
                  </Button>
                </div>
              </form>
            )}

            {/* 크리에이터 신청 모달 */}
            {activeModal === 'creator' && (
              <form onSubmit={handleCreatorApply}>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">크리에이터 신청</h2>
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stageName">활동명 *</Label>
                      <Input
                        id="stageName"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        placeholder="크리에이터로 사용할 활동명"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">카테고리 *</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="예: 음악, 게임, 예술, 스포츠 등"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">자기소개 *</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="어떤 활동을 하시는지 소개해주세요"
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="portfolioUrl">포트폴리오 URL (선택)</Label>
                      <Input
                        id="portfolioUrl"
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? '신청 중...' : '신청하기'}
                  </Button>
                </div>
              </form>
            )}

            {/* 회원 탈퇴 모달 */}
            {activeModal === 'delete' && (
              <form onSubmit={handleDeleteAccount}>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4 text-destructive">회원 탈퇴</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?
                  </p>
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  {!isSocialLogin && (
                    <div>
                      <Label htmlFor="deletePassword">비밀번호 확인</Label>
                      <Input
                        id="deletePassword"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 p-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? '처리 중...' : '탈퇴하기'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
