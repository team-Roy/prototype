'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { adminApi, CreatorApplication } from '@/lib/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInitialized && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadApplications();
    }
  }, [user, activeTab]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getCreatorApplications(activeTab);
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 신청을 승인하시겠습니까?')) return;

    try {
      setIsSubmitting(true);
      await adminApi.reviewCreatorApplication(id, { action: 'APPROVE' });
      alert('승인되었습니다.');
      setSelectedApp(null);
      loadApplications();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApi.reviewCreatorApplication(id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      alert('거절되었습니다.');
      setSelectedApp(null);
      setRejectionReason('');
      loadApplications();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            대기중
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            승인됨
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            거절됨
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 초기화 전이면 로딩 표시
  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  // 관리자가 아니면 접근 거부 (useEffect에서 리다이렉트 처리)
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>

      <Card>
        <CardHeader>
          <CardTitle>크리에이터 신청 관리</CardTitle>
          <CardDescription>크리에이터 신청을 검토하고 승인/거절할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="PENDING">대기중</TabsTrigger>
              <TabsTrigger value="APPROVED">승인됨</TabsTrigger>
              <TabsTrigger value="REJECTED">거절됨</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">신청 내역이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <Card key={app.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">{app.creatorName}</span>
                              {getStatusBadge(app.status)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                신청자: {app.user?.nickname} ({app.user?.email})
                              </p>
                              <p>카테고리: {app.channelType}</p>
                              <p>신청일: {new Date(app.createdAt).toLocaleString()}</p>
                              {app.channelUrl && (
                                <p>
                                  포트폴리오:{' '}
                                  <a
                                    href={app.channelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {app.channelUrl}
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                          {app.status === 'PENDING' && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                              상세보기
                            </Button>
                          )}
                        </div>

                        {app.status === 'REJECTED' && app.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-md">
                            <p className="text-sm text-red-800">
                              <span className="font-medium">거절 사유:</span> {app.rejectionReason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 상세보기 모달 */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">크리에이터 신청 상세</h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">활동명</Label>
                  <p className="font-medium">{selectedApp.creatorName}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">신청자</Label>
                  <p className="font-medium">
                    {selectedApp.user?.nickname} ({selectedApp.user?.email})
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">카테고리</Label>
                  <p className="font-medium">{selectedApp.channelType}</p>
                </div>

                {selectedApp.channelUrl && (
                  <div>
                    <Label className="text-muted-foreground">포트폴리오 URL</Label>
                    <p>
                      <a
                        href={selectedApp.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {selectedApp.channelUrl}
                      </a>
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">자기소개</Label>
                  <p className="whitespace-pre-wrap bg-muted p-3 rounded-md mt-1">
                    {selectedApp.introduction}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">신청일</Label>
                  <p>{new Date(selectedApp.createdAt).toLocaleString()}</p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label htmlFor="rejectionReason">거절 사유 (거절 시 필수)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="거절 사유를 입력하세요..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApp(null);
                  setRejectionReason('');
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                닫기
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedApp.id)}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '거절'}
              </Button>
              <Button
                onClick={() => handleApprove(selectedApp.id)}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '승인'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
