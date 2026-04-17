import ApiError from "../utils/ApiError.js";
import { brevoApiKey, brevoSenderEmail, brevoSenderName } from "../utils/config.js";
import {BrevoClient} from '@getbrevo/brevo'
import { requiredField } from "../utils/helper.js";

const apiInstance = new BrevoClient({ apiKey: brevoApiKey });

export const emailService = async (
  email,
  name,
  status,
  tableNo,
  noOfGuest,
  reservationDate = null,
  startTime = null,
  endTime = null,
  reservationId = null,
  options = {}
) => {
  requiredField([email, name, status, tableNo, noOfGuest]);

  const validStatuses = ['Confirm', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const { retryCount = 3, testMode = false } = options;

  const statusConfig = {
    'Confirm': {
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: '✅',
      title: 'Reservation Confirm!',
      badge: 'Confirm',
      actionButtonText: 'View Reservation Details',
      secondaryMessage: '🎉 Your table has been reserved successfully! We look forward to serving you.'
    },
    'Cancelled': {
      color: '#ef4444',
      bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icon: '❌',
      title: 'Reservation Cancelled',
      badge: 'CANCELLED',
      actionButtonText: 'Make a New Reservation',
      secondaryMessage: '🔄 Your reservation has been successfully cancelled. We hope to serve you again soon!'
    }
  };

  const config = statusConfig[status];

  const formattedDate = reservationDate
    ? new Date(reservationDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const formattedStartTime = startTime || '--:--';
  const formattedEndTime = endTime || '--:--';

  const sendWithRetry = async (emailData, attempt = 1) => {
    try {
      if (testMode) {
        console.log('📧 [TEST MODE] Email would be sent:', {
          to: email,
          subject: emailData.subject,
          status,
          attempt
        });
        return {
          success: true,
          messageId: `test_${Date.now()}`,
          testMode: true,
          recipient: email
        };
      }

      const response = await apiInstance.transactionalEmails.sendTransacEmail(emailData);
      return {
        success: true,
        messageId: response.messageId,
        recipient: email,
        status: status,
        tableNo: tableNo,
        attempt
      };
    } catch (error) {
      if (attempt < retryCount) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(`⚠️ Email send failed (attempt ${attempt}/${retryCount}), retrying in ${delay}ms...`, {
          error: error.message,
          recipient: email
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWithRetry(emailData, attempt + 1);
      }
      throw error;
    }
  };

  try {
    const sendSmtpEmail = {
      sender: {
        email: brevoSenderEmail,
        name: brevoSenderName
      },
      to: [{
        email: email,
        name: name
      }],
      subject: `${status === 'Confirm' ? '✅' : '❌'} Reservation ${status} - Table ${tableNo} | Athenura`,

      htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reservation ${status} - Athenura</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }

          .email-container {
            max-width: 650px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .header {
            background: ${config.bgGradient};
            padding: 48px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
            transform: rotate(45deg);
          }

          .header-icon {
            font-size: 64px;
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
            animation: bounce 0.6s ease;
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .header h1 {
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
            position: relative;
            z-index: 1;
          }

          .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            padding: 6px 16px;
            border-radius: 50px;
            color: white;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1px;
            margin-top: 12px;
            position: relative;
            z-index: 1;
          }

          .content {
            padding: 40px 32px;
            background: #ffffff;
          }

          .greeting {
            font-size: 26px;
            color: #1f2937;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .greeting-name {
            color: ${config.color};
            border-bottom: 2px solid ${config.color};
            display: inline-block;
          }

          .divider {
            width: 60px;
            height: 4px;
            background: ${config.color};
            margin: 24px 0;
            border-radius: 2px;
          }

          .reservation-table {
            width: 100%;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 20px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
          }

          .reservation-title {
            font-size: 18px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 20px;
            text-align: center;
            letter-spacing: 1px;
          }

          .details-table {
            width: 100%;
            border-collapse: collapse;
          }

          .details-table tr {
            border-bottom: 1px solid #e2e8f0;
          }

          .details-table tr:last-child {
            border-bottom: none;
          }

          .details-table td {
            padding: 14px 8px;
            vertical-align: middle;
          }

          .details-table td:first-child {
            font-weight: 600;
            color: #64748b;
            width: 35%;
            font-size: 14px;
          }

          .details-table td:last-child {
            color: #1f2937;
            font-weight: 500;
            font-size: 15px;
          }

          .table-highlight {
            background: ${config.color};
            color: white !important;
            font-weight: 700;
            font-size: 18px;
          }

          .message-box {
            background: ${status === 'Confirm' ? '#ecfdf5' : '#fef2f2'};
            border-left: 4px solid ${config.color};
            padding: 20px;
            border-radius: 12px;
            margin: 24px 0;
          }

          .message-box p {
            color: ${status === 'Confirm' ? '#065f46' : '#991b1b'};
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
          }

          .action-button {
            display: inline-block;
            background: ${config.color};
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 50px;
            font-weight: 600;
            margin: 16px 0 8px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          }

          .footer {
            background: #f9fafb;
            padding: 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }

          .footer-logo {
            font-size: 20px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
          }

          .footer-text {
            color: #9ca3af;
            font-size: 12px;
            line-height: 1.5;
          }

          .social-links {
            margin-top: 20px;
          }

          .social-links span {
            margin: 0 8px;
            color: #9ca3af;
            font-size: 20px;
          }

          @media (max-width: 480px) {
            .content {
              padding: 24px 20px;
            }

            .details-table td {
              padding: 10px 6px;
            }

            .details-table td:first-child {
              font-size: 12px;
            }

            .details-table td:last-child {
              font-size: 13px;
            }

            .greeting {
              font-size: 22px;
            }
          }
        </style>
      </head>

      <body>
        <div class="email-container">
          <div class="header">
            <div class="header-icon">${config.icon}</div>
            <h1>${config.title}</h1>
            <div class="badge">${config.badge}</div>
          </div>

          <div class="content">
            <div class="greeting">
              Hello <span class="greeting-name">${name}</span>!
            </div>
            <div class="divider"></div>

            <div class="reservation-table">
              <div class="reservation-title">📋 RESERVATION DETAILS</div>
              <table class="details-table">
                <tr>
                  <td>🎫 Reservation ID</td>
                  <td><strong>${reservationId || 'N/A'}</strong></td>
                </tr>
                <tr>
                  <td>🍽️ Table Number</td>
                  <td><strong style="color: ${config.color}; font-size: 18px;">#${tableNo}</strong></td>
                </tr>
                <tr>
                  <td>👥 Number of Guests</td>
                  <td><strong>${noOfGuest} ${noOfGuest === 1 ? 'Guest' : 'Guests'}</strong></td>
                </tr>
                <tr>
                  <td>📅 Reservation Date</td>
                  <td><strong>${formattedDate}</strong></td>
                </tr>
                <tr>
                  <td>⏰ Start Time</td>
                  <td><strong>${formattedStartTime}</strong></td>
                </tr>
                <tr>
                  <td>⏰ End Time</td>
                  <td><strong>${formattedEndTime}</strong></td>
                </tr>
                <tr>
                  <td>📊 Status</td>
                  <td><strong style="color: ${config.color};">${status}</strong></td>
                </tr>
              </table>
            </div>

            <div class="message-box">
              <p>${config.secondaryMessage}</p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">✨ Athenura ✨</div>
            <div class="footer-text">
              Fine Dining Experience<br />
              ${new Date().getFullYear()} Athenura. All rights reserved.
            </div>
            <div class="social-links">
              <span>📧</span> <span>📱</span> <span>📍</span>
            </div>
            <div class="footer-text" style="margin-top: 16px; font-size: 11px;">
              This is an automated email, please do not reply.<br />
              For assistance, contact us at support@athenura.com
            </div>
          </div>
        </div>
      </body>
      </html>
      `,

      tags: ['Reservation', status, `Table_${tableNo}`, `Guests_${noOfGuest}`],

      headers: {
        'X-Priority': status === 'Confirm' ? '1 (Highest)' : '3 (Normal)',
        'X-Mailer': 'Athenura-Reservation-System',
        'X-Reservation-ID': reservationId || 'N/A'
      }
    };

    const response = await sendWithRetry(sendSmtpEmail);

    return {
      success: true,
      messageId: response.messageId,
      recipient: email,
      status: status,
      tableNo: tableNo,
      noOfGuest: noOfGuest,
      reservationDate: formattedDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      reservationId: reservationId,
      testMode: response.testMode || false
    };

  } catch (error) {
    console.error('❌ Error sending email:', {
      error: error.message,
      recipient: email,
      status: status,
      timestamp: new Date().toISOString()
    });

    throw new ApiError(
      500,
      error.message || 'Failed to send email',
      { recipient: email, status: status }
    );
  }
};

import { verifyEmailURi } from "../utils/config.js";


export const sendEmailVerifyUser = async (
  email,
  name,
  unHashedToken,
  options = {}
) => {
  requiredField([email, name, unHashedToken]);

  const { retryCount = 3, testMode = false } = options;

  const verifyLink = `${verifyEmailURi}/verify-email?token=${unHashedToken}`;

  const sendWithRetry = async (emailData, attempt = 1) => {
    try {
      if (testMode) {
        console.log("📧 [TEST MODE] Verify email would be sent:", {
          to: email,
          verifyLink,
          attempt,
        });

        return {
          success: true,
          messageId: `test_${Date.now()}`,
          testMode: true,
          recipient: email,
        };
      }

      const response =
        await apiInstance.transactionalEmails.sendTransacEmail(emailData);

      return {
        success: true,
        messageId: response.messageId,
        recipient: email,
        attempt,
      };
    } catch (error) {
      if (attempt < retryCount) {
        const delay = 1000 * Math.pow(2, attempt - 1);

        console.warn(
          `⚠️ Verify email failed (attempt ${attempt}/${retryCount}), retrying...`,
          {
            error: error.message,
            recipient: email,
          }
        );

        await new Promise((r) => setTimeout(r, delay));
        return sendWithRetry(emailData, attempt + 1);
      }

      throw error;
    }
  };

  try {
    const sendSmtpEmail = {
      sender: {
        email: brevoSenderEmail,
        name: brevoSenderName,
      },

      to: [
        {
          email,
          name,
        },
      ],

      subject: "🔐 Verify your email - Athenura",

      htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
      </head>

      <body style="font-family: Arial; background:#f3f4f6; padding:40px;">
        <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:12px;text-align:center;">

          <h2>👋 Welcome ${name}</h2>

          <p>Please verify your email to activate your account.</p>

          <a href="${verifyLink}"
             style="display:inline-block;margin-top:20px;padding:12px 24px;
             background:#10b981;color:white;text-decoration:none;border-radius:999px;">
             Verify Email
          </a>

          <p style="margin-top:20px;font-size:12px;color:#6b7280;word-break:break-all;">
            ${verifyLink}
          </p>

          <p style="margin-top:30px;font-size:11px;color:#9ca3af;">
            If you did not create this account, ignore this email.
          </p>

        </div>
      </body>
      </html>
      `,

      tags: ["Auth", "VerifyEmail"],

      headers: {
        "X-Mailer": "Athenura-Auth-System",
      },
    };

    const response = await sendWithRetry(sendSmtpEmail);

    return {
      success: true,
      messageId: response.messageId,
      recipient: email,
      testMode: response.testMode || false,
    };
  } catch (error) {
    console.error("❌ Verify email send failed:", {
      error: error.message,
      email,
    });

    throw new ApiError(
      500,
      error.message || "Failed to send verification email",
      { email }
    );
  }
};
