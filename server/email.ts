import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set - emails will be logged to console only");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log(`📧 Email would be sent to: ${params.to}`);
      console.log(`📧 Subject: ${params.subject}`);
      console.log(`📧 Content: ${params.text || 'HTML content'}`);
      return true;
    }

    await mailService.send({
      to: params.to,
      from: 'noreply@trendotalk.com', // You can change this to your verified sender
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function createOTPEmailTemplate(otp: string, email: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TrendoTalk - Email Verification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 40px 30px;
        }
        .otp-box {
            background: linear-gradient(135deg, #f3e8ff, #fce7f3);
            border: 2px solid #ec4899;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #7c3aed;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 20px 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 TrendoTalk</h1>
            <p style="margin: 0; opacity: 0.9;">Email Verification Required</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Verify Your Email Address</h2>
            
            <p style="color: #475569; font-size: 16px;">
                Hello! You've requested to verify your email address <strong>${email}</strong> for your TrendoTalk account.
            </p>
            
            <div class="otp-box">
                <p style="margin: 0; color: #7c3aed; font-weight: bold;">Your Verification Code:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Valid for 10 minutes</p>
            </div>
            
            <p style="color: #475569;">
                Enter this code in the TrendoTalk app to complete your email verification. This helps us keep your account secure and enables important notifications.
            </p>
            
            <div class="warning">
                <strong>🔒 Security Notice:</strong> Never share this code with anyone. TrendoTalk will never ask for this code via phone, email, or social media.
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent from TrendoTalk's secure verification system.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <p style="margin-top: 15px;">
                <strong>TrendoTalk</strong> - Connect, Share, Trend
            </p>
        </div>
    </div>
</body>
</html>`;

  const text = `
TrendoTalk - Email Verification

Hello! You've requested to verify your email address ${email} for your TrendoTalk account.

Your Verification Code: ${otp}
(Valid for 10 minutes)

Enter this code in the TrendoTalk app to complete your email verification.

Security Notice: Never share this code with anyone. TrendoTalk will never ask for this code via phone, email, or social media.

If you didn't request this verification, please ignore this email.

TrendoTalk - Connect, Share, Trend
`;

  return { html, text };
}