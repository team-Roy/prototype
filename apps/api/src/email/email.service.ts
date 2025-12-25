import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.get('AWS_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.fromEmail = this.configService.get('SES_FROM_EMAIL', 'noreply@fandom-lounge.com');
    this.appUrl = this.configService.get('APP_URL', 'https://fandom-lounge.vercel.app');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;
    const toAddresses = Array.isArray(to) ? to : [to];

    try {
      const command = new SendEmailCommand({
        Source: `팬덤 라운지 <${this.fromEmail}>`,
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html,
            },
            ...(text && {
              Text: {
                Charset: 'UTF-8',
                Data: text,
              },
            }),
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`Email sent successfully to ${toAddresses.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; padding: 20px 0; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #6366f1; margin: 0;">팬덤 라운지</h1>
          </div>
          <div class="content">
            <h2>비밀번호 재설정</h2>
            <p>안녕하세요!</p>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">비밀번호 재설정</a>
            </p>
            <p style="color: #888; font-size: 14px;">
              이 링크는 1시간 동안만 유효합니다.<br>
              본인이 요청하지 않은 경우, 이 이메일을 무시해주세요.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 팬덤 라운지. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
팬덤 라운지 - 비밀번호 재설정

안녕하세요!

비밀번호 재설정을 요청하셨습니다.
아래 링크를 클릭하여 새 비밀번호를 설정해주세요.

${resetUrl}

이 링크는 1시간 동안만 유효합니다.
본인이 요청하지 않은 경우, 이 이메일을 무시해주세요.
    `;

    return this.sendEmail({
      to: email,
      subject: '[팬덤 라운지] 비밀번호 재설정',
      html,
      text,
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; padding: 20px 0; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #6366f1; margin: 0;">팬덤 라운지</h1>
          </div>
          <div class="content">
            <h2>이메일 인증</h2>
            <p>안녕하세요! 팬덤 라운지에 가입해주셔서 감사합니다.</p>
            <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" class="button">이메일 인증하기</a>
            </p>
            <p style="color: #888; font-size: 14px;">
              이 링크는 24시간 동안만 유효합니다.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 팬덤 라운지. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
팬덤 라운지 - 이메일 인증

안녕하세요! 팬덤 라운지에 가입해주셔서 감사합니다.

아래 링크를 클릭하여 이메일 인증을 완료해주세요.

${verifyUrl}

이 링크는 24시간 동안만 유효합니다.
    `;

    return this.sendEmail({
      to: email,
      subject: '[팬덤 라운지] 이메일 인증',
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, nickname: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; padding: 20px 0; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #6366f1; margin: 0;">팬덤 라운지</h1>
          </div>
          <div class="content">
            <h2>${nickname}님, 환영합니다! 🎉</h2>
            <p>팬덤 라운지에 가입해주셔서 감사합니다.</p>
            <p>이제 좋아하는 크리에이터의 팬 커뮤니티에 참여하고, 다른 팬들과 소통해보세요!</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${this.appUrl}" class="button">팬덤 라운지 둘러보기</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2024 팬덤 라운지. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `[팬덤 라운지] ${nickname}님, 가입을 환영합니다!`,
      html,
    });
  }
}
