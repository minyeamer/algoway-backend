const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * 이메일 전송을 위한 transporter 생성
 * 개발 환경: Ethereal Email (테스트용)
 * 프로덕션 환경: 실제 SMTP 서버
 */
const createTransporter = async () => {
  if (process.env.SMTP_HOST) {
    // SMTP 환경변수가 있으면 사용 (개발: Mailpit, 프로덕션: 실제 SMTP)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  } else {
    // 폴백: Ethereal Email (인터넷 연결 필요)
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
};

/**
 * 인증 코드 이메일 전송
 */
const sendVerificationEmail = async (email, code, verificationType) => {
  try {
    const transporter = await createTransporter();

    const typeText = {
      student: '학생',
      employee: '직장인',
      others: '일반'
    }[verificationType] || '일반';

    const mailOptions = {
      from: '"알고타 (Algo-Way)" <noreply@algoway.com>',
      to: email,
      subject: `[알고타] ${typeText} 인증 코드`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background-color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; border: 2px dashed #4F46E5; border-radius: 8px; margin: 20px 0; }
            .info { font-size: 14px; color: #6b7280; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 알고타 (Algo-Way)</h1>
              <p>같은 길, 같이 가자</p>
            </div>
            <div class="content">
              <h2>이메일 인증 코드</h2>
              <p>안녕하세요!</p>
              <p>${typeText} 인증을 위한 인증 코드입니다.</p>
              <p>아래 인증 코드를 앱에 입력해주세요.</p>
              
              <div class="code-box">${code}</div>
              
              <div class="info">
                <p>ℹ️ 이 인증 코드는 <strong>10분간 유효</strong>합니다.</p>
                <p>⚠️ 본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 알고타 (Algo-Way). All rights reserved.</p>
              <p>문의: support@algoway.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    // 개발 환경에서는 메일 확인 방법 안내
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.SMTP_HOST === 'mailpit') {
        logger.info(`📧 Mailpit Web UI: http://localhost:8025  |  code: ${code}`);
      } else {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) logger.info('📧 Email Preview URL:', previewUrl);
      }
    }

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('❌ Email sending failed:', error);
    throw new Error('이메일 전송에 실패했습니다.');
  }
};

/**
 * 환영 이메일 전송 (회원가입 완료)
 */
const sendWelcomeEmail = async (email, nickname) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: '"알고타 (Algo-Way)" <noreply@algoway.com>',
      to: email,
      subject: '[알고타] 회원가입을 환영합니다! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 알고타 (Algo-Way)</h1>
              <p>같은 길, 같이 가자</p>
            </div>
            <div class="content">
              <h2>환영합니다, ${nickname}님! 🎉</h2>
              <p>알고타 가입을 축하드립니다!</p>
              <p>이제 같은 방향으로 가는 사람들과 함께 이동 비용을 절감하세요.</p>
              
              <h3>알고타의 주요 기능</h3>
              <ul>
                <li>🔍 실시간 팟 모집 및 검색</li>
                <li>💰 이동 비용 절감 (1/n 분담)</li>
                <li>💬 실시간 채팅</li>
                <li>✅ 신원 인증으로 안전한 매칭</li>
                <li>⭐ 매너 평가 시스템</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="https://algoway.com" class="button">지금 시작하기</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2026 알고타 (Algo-Way). All rights reserved.</p>
              <p>문의: support@algoway.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV !== 'production') {
      logger.info('📧 Email Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('❌ Welcome email sending failed:', error);
    // 환영 이메일은 실패해도 서비스에 영향 없음
    return { success: false };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail
};
