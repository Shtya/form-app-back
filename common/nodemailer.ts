import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  async sendOTPEmail(to: string, otp: string, actionType: string) {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f9f9f9;
          padding: 20px;
          max-width: 600px;
          margin: auto;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 150px;
        }
        .content {
          text-align: center;
          line-height: 1.6;
        }
        .otp-code {
          display: inline-block;
          margin: 20px auto;
          padding: 10px 20px;
          color: #007BFF;
          background-color: #e9f5ff;
          font-size: 24px;
          font-weight: bold;
          border-radius: 5px;
          border: 1px solid #007BFF;
        }
        .copy-button {
          margin-top: 20px;
          padding: 10px 20px;
          color: #fff;
          background-color: #007BFF;
          font-size: 16px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #888;
        }
      </style>
    </head>
    <body>
  <div class="email-container">
    <div class="content">
      <h2>Your OTP Code</h2>
      <p>We received a request to ${actionType}. Use the OTP code below to proceed:</p>
      <div>
        <div class="otp-code">${otp}</div>
      </div>
      <p>This OTP code is valid for 5 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Your Project Name. All rights reserved.</p>
    </div>
  </div>
</body>
    </html>
    `;

    await this.transporter.sendMail({
      from: `"${process.env.PROJECT_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject: actionType,
      html: htmlContent,
    });
  }
  async sendLetters(to: string, title: string, message: string) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .email-container {
      font-family: Arial, sans-serif;
      color: #333;
      background-color: #f9f9f9;
      padding: 20px;
      max-width: 600px;
      margin: auto;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo img {
      max-width: 150px;
    }
    .content {
      text-align: center;
      line-height: 1.6;
    }
    .title {
      font-size: 28px;
      color: #007BFF;
      margin-bottom: 10px;
    }
    .message {
      font-size: 18px;
      margin: 20px 0;
    }
    .username {
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="message">${message}</p>
      <p class="username">Sent to: ${to}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Your Project Name. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

    await this.transporter.sendMail({
      from: `"${process.env.PROJECT_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject: title,
      html: htmlContent,
    });
  }

   async sendSupervisorReviewEmail(
    supervisorEmail: string,
    supervisorName: string,
    employeeName: string,
    employeeId: string,
    reviewLink: string,
  ) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .email-container {
      font-family: Arial, sans-serif;
      color: #333;
      background-color: #f9f9f9;
      padding: 20px;
      max-width: 600px;
      margin: auto;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo img {
      max-width: 150px;
    }
    .content {
      line-height: 1.6;
      text-align: left;
    }
    .title {
      font-size: 24px;
      color: #007BFF;
      margin-bottom: 20px;
      text-align: center;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 15px;
    }
    .employee-details {
      background-color: #e9f5ff;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #007BFF;
    }
    .action-button {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 24px;
      color: #fff;
      background-color: #007BFF;
      font-size: 16px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
    }
    .link-alternative {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
    }
    .note {
      background-color: #fff3cd;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
      border-left: 4px solid #ffc107;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="content">
      <h2 class="title">New Employee Review Required</h2>
      <p class="greeting">Dear ${supervisorName},</p>

      <p>A new employee has been added to the system and requires your review.</p>

      <div class="employee-details">
        <p><strong>Employee Name:</strong> ${employeeName}</p>
        <p><strong>Employee ID:</strong> ${employeeId}</p>
        <p><strong>Status:</strong> Pending Supervisor Approval</p>
      </div>

      <p>Please review the employee details and approve or reject the submission.</p>

      <div style="text-align: center;">
        <a href="${reviewLink}" class="action-button">Review Employee Details</a>
      </div>

      <p class="link-alternative">If the button above doesn't work, copy and paste this link in your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #007BFF;">${reviewLink}</p>

      <div class="note">
        <p><strong>Important:</strong> This review must be completed within 48 hours. After your approval, the job offer will be sent to the employee.</p>
      </div>

      <p>Best regards,<br>HR Department</p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${process.env.PROJECT_NAME || 'Your Project Name'}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`;

    await this.transporter.sendMail({
      from: `"HR Department - ${process.env.PROJECT_NAME}" <${process.env.EMAIL_USER}>`,
      to: supervisorEmail,
      subject: `Action Required: Review New Employee - ${employeeName}`,
      html: htmlContent,
    });
  }

  /**
   * Send email to author after supervisor updates and sends job offer
   */
  async sendAuthorFollowUpEmail(
    authorEmail: string,
    authorName: string,
    employeeName: string,
    employeeId: string,
    supervisorName: string,
    jobOfferLink: string,
    status: 'approved' | 'rejected',
    supervisorNotes?: string,
  ) {
    const statusColor = status === 'approved' ? '#28a745' : '#dc3545';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .email-container {
      font-family: Arial, sans-serif;
      color: #333;
      background-color: #f9f9f9;
      padding: 20px;
      max-width: 600px;
      margin: auto;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo img {
      max-width: 150px;
    }
    .content {
      line-height: 1.6;
      text-align: left;
    }
    .title {
      font-size: 24px;
      color: #007BFF;
      margin-bottom: 20px;
      text-align: center;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 15px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      background-color: ${status === 'approved' ? '#d4edda' : '#f8d7da'};
      color: ${status === 'approved' ? '#155724' : '#721c24'};
      border-radius: 20px;
      font-weight: bold;
      border: 1px solid ${status === 'approved' ? '#c3e6cb' : '#f5c6cb'};
      margin: 10px 0;
    }
    .details-card {
      background-color: #fff;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border: 1px solid #ddd;
    }
    .details-row {
      display: flex;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .details-label {
      font-weight: bold;
      width: 150px;
      color: #555;
    }
    .details-value {
      flex: 1;
    }
    .action-button {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 24px;
      color: #fff;
      background-color: #28a745;
      font-size: 16px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      text-align: center;
    }
    .notes-section {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
      border-left: 4px solid #6c757d;
    }
    .next-steps {
      background-color: #e9f5ff;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #007BFF;
    }
    .next-steps h3 {
      margin-top: 0;
      color: #0056b3;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="content">
      <h2 class="title">Employee Review Completed</h2>
      <p class="greeting">Dear ${authorName},</p>

      <p>The supervisor has completed the review for the employee you submitted.</p>

      <div class="status-badge">Status: ${statusText}</div>

      <div class="details-card">
        <div class="details-row">
          <div class="details-label">Employee Name:</div>
          <div class="details-value">${employeeName}</div>
        </div>
        <div class="details-row">
          <div class="details-label">Employee ID:</div>
          <div class="details-value">${employeeId}</div>
        </div>
        <div class="details-row">
          <div class="details-label">Reviewed By:</div>
          <div class="details-value">${supervisorName}</div>
        </div>
        <div class="details-row">
          <div class="details-label">Review Date:</div>
          <div class="details-value">${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      ${supervisorNotes ? `
      <div class="notes-section">
        <h3 style="margin-top: 0; color: #495057;">Supervisor Notes:</h3>
        <p>${supervisorNotes}</p>
      </div>
      ` : ''}

      ${status === 'approved' ? `
      <div class="next-steps">
        <h3>Next Steps:</h3>
        <p>The job offer has been prepared and is ready for your review.</p>

        <div style="text-align: center;">
          <a href="${jobOfferLink}" class="action-button">Review Job Offer</a>
        </div>

        <p style="text-align: center; font-size: 14px; margin-top: 10px;">
          <a href="${jobOfferLink}" style="color: #007BFF; word-break: break-all;">${jobOfferLink}</a>
        </p>
      </div>

      <p>Please review the job offer details and make any necessary adjustments before finalizing.</p>
      ` : `
      <div class="next-steps">
        <h3>Next Steps:</h3>
        <p>The employee application has been rejected. Please review the supervisor's notes and take appropriate action.</p>
        <p>You may need to contact the candidate or update the application based on the feedback provided.</p>
      </div>
      `}

      <p>Best regards,<br>HR System</p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${process.env.PROJECT_NAME || 'Your Project Name'}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
`;

    const subject = status === 'approved'
      ? `Job Offer Ready: ${employeeName} (${employeeId})`
      : `Application Rejected: ${employeeName} (${employeeId})`;

    await this.transporter.sendMail({
      from: `"HR System - ${process.env.PROJECT_NAME}" <${process.env.EMAIL_USER}>`,
      to: authorEmail,
      subject,
      html: htmlContent,
    });
  }

}

