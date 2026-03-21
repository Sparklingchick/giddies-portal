// ═══════════════════════════════════════════════════════════
//  GX-EMAIL.JS — Automated Email Notifications
//  Uses Resend.com (free — 3,000 emails/month)
//  Get your free API key at resend.com
// ═══════════════════════════════════════════════════════════

const GXEmail = (() => {

  // ── SEND VIA RESEND ──────────────────────────────────────
  async function send(to, subject, html, text) {
    if (!GX_CONFIG.RESEND_API_KEY) {
      console.log('Email skipped — no API key configured. To:', to, 'Subject:', subject);
      return { ok: false, reason: 'No API key' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GX_CONFIG.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    `${GX_CONFIG.FROM_NAME} <${GX_CONFIG.FROM_EMAIL}>`,
          to:      [to],
          subject: subject,
          html:    html || `<p>${text}</p>`,
          text:    text || html?.replace(/<[^>]+>/g, '') || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { console.error('Resend error:', data); return { ok: false, error: data }; }
      console.log('✅ Email sent to', to);
      return { ok: true, data };
    } catch(e) {
      console.error('Email send failed:', e);
      return { ok: false, error: e.message };
    }
  }

  // ── EMAIL TEMPLATE ───────────────────────────────────────
  function template(title, bodyHtml, footerNote = '') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body{font-family:'DM Sans',Arial,sans-serif;background:#0A0A0A;margin:0;padding:0}
    .wrap{max-width:580px;margin:0 auto;padding:2rem 1.5rem}
    .header{text-align:center;padding:1.5rem 0 1rem}
    .header h1{font-size:1.8rem;letter-spacing:.04em;color:#FF6B00;margin:0}
    .header p{font-size:.85rem;color:#8A8F9E;margin:.3rem 0 0}
    .card{background:#111318;border:1px solid #2A2E38;border-radius:12px;padding:1.75rem 2rem;color:#F0F2F7}
    .card h2{font-size:1.25rem;margin:0 0 1rem;color:#F0F2F7}
    .card p{font-size:.9rem;line-height:1.7;color:#8A8F9E;margin:.65rem 0}
    .card p strong{color:#F0F2F7}
    .highlight{background:#1A1D24;border-left:4px solid #FF6B00;border-radius:4px;padding:1rem 1.25rem;margin:1rem 0}
    .highlight code{font-family:monospace;font-size:.95rem;color:#FF6B00}
    .btn{display:inline-block;background:linear-gradient(135deg,#FF6B00,#FF8C38);color:#fff!important;text-decoration:none;padding:.75rem 1.75rem;border-radius:8px;font-weight:600;font-size:.88rem;margin:1rem 0}
    .footer{text-align:center;padding:1.5rem 0;font-size:.75rem;color:#555A68}
    .divider{border:none;border-top:1px solid #2A2E38;margin:1.25rem 0}
    .ok{color:#22C55E} .er{color:#EF4444} .wa{color:#F59E0B}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Giddies Express</h1>
      <p>${GX_CONFIG.COMPANY_NAME} · Staff Portal</p>
    </div>
    <div class="card">
      <h2>${title}</h2>
      <hr class="divider"/>
      ${bodyHtml}
    </div>
    <div class="footer">
      ${footerNote || 'This is an automated message from the Giddies Express Staff Portal.<br>Do not reply to this email.'}
      <br><br>© ${new Date().getFullYear()} ${GX_CONFIG.COMPANY_NAME}
    </div>
  </div>
</body>
</html>`;
  }

  // ── SPECIFIC EMAIL TYPES ──────────────────────────────────

  async function sendWelcome(to, name, tempPassword) {
    const portalUrl = GX_CONFIG.PORTAL_URL || '[Portal URL]';
    const html = template(
      '👋 Welcome to Giddies Express!',
      `<p>Dear <strong>${name}</strong>,</p>
       <p>Congratulations! Your employment at <strong>Giddies Express</strong> has been approved. Your staff portal account is now active.</p>
       <div class="highlight">
         <p style="margin:0;font-size:.82rem;color:#8A8F9E">Your login credentials:</p>
         <p style="margin:.4rem 0 0"><strong>Email:</strong> <code>${to}</code></p>
         <p style="margin:.25rem 0 0"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
       </div>
       <p>Please log in and change your password on first login.</p>
       <a href="${portalUrl}" class="btn">🚀 Open Portal</a>
       <hr class="divider"/>
       <p style="font-size:.8rem">For any technical issues, contact IT Support by submitting a ticket in the portal.</p>`,
      'If you did not expect this email, please contact IT Support immediately.'
    );
    return send(to, `Welcome to ${GX_CONFIG.COMPANY_NAME} — Your Login Credentials`, html, `Dear ${name}, welcome to ${GX_CONFIG.COMPANY_NAME}! Your email: ${to}, Temp password: ${tempPassword}. Portal: ${portalUrl}`);
  }

  async function sendLeaveUpdate(to, name, leaveType, status, reason = '') {
    const approved = status === 'approved';
    const html = template(
      approved ? '✅ Leave Request Approved' : '❌ Leave Request Update',
      `<p>Dear <strong>${name}</strong>,</p>
       <p>Your <strong>${leaveType} leave</strong> request has been <strong class="${approved ? 'ok' : 'er'}">${status}</strong>.</p>
       ${reason ? `<div class="highlight"><p style="margin:0"><strong>Note:</strong> ${reason}</p></div>` : ''}
       ${approved ? `<p>Your leave is now recorded in the system. Enjoy your time off! 🌴</p>` : `<p>Please contact your Department Manager if you have questions.</p>`}
       <a href="${GX_CONFIG.PORTAL_URL || '#'}" class="btn">View in Portal</a>`
    );
    return send(to, `Leave Request ${approved ? 'Approved ✅' : 'Update'} — Giddies Express`, html, `Dear ${name}, your ${leaveType} leave has been ${status}. ${reason ? 'Reason: ' + reason : ''}`);
  }

  async function sendTaskAssigned(to, name, taskTitle, assignedBy, dueDate) {
    const html = template(
      '✅ New Task Assigned',
      `<p>Dear <strong>${name}</strong>,</p>
       <p>A new task has been assigned to you by <strong>${assignedBy}</strong>.</p>
       <div class="highlight">
         <p style="margin:0"><strong>Task:</strong> ${taskTitle}</p>
         <p style="margin:.3rem 0 0"><strong>Due Date:</strong> ${dueDate}</p>
         <p style="margin:.3rem 0 0"><strong>Assigned By:</strong> ${assignedBy}</p>
       </div>
       <p>Log in to the portal to view full details and update your progress.</p>
       <a href="${GX_CONFIG.PORTAL_URL || '#'}" class="btn">View Task</a>`
    );
    return send(to, `New Task Assigned: ${taskTitle}`, html, `Dear ${name}, ${assignedBy} assigned you: "${taskTitle}". Due: ${dueDate}`);
  }

  async function sendPasswordReset(to, name, tempPassword) {
    const html = template(
      '🔑 Password Reset',
      `<p>Dear <strong>${name}</strong>,</p>
       <p>Your portal password has been reset by IT Support.</p>
       <div class="highlight">
         <p style="margin:0"><strong>Email:</strong> <code>${to}</code></p>
         <p style="margin:.3rem 0 0"><strong>New Temporary Password:</strong> <code>${tempPassword}</code></p>
       </div>
       <p>Please log in and update your password immediately.</p>
       <a href="${GX_CONFIG.PORTAL_URL || '#'}" class="btn">Log In Now</a>
       <hr class="divider"/>
       <p style="font-size:.8rem">If you did not request this reset, contact IT Support immediately.</p>`,
      'This password reset was initiated by IT Support.'
    );
    return send(to, 'Password Reset — Giddies Express Portal', html, `Dear ${name}, your password has been reset. New temp password: ${tempPassword}`);
  }

  async function sendComplaintNotification(to, managerName, complaintSubject, filedBy, severity) {
    const html = template(
      '🚩 New Complaint Filed',
      `<p>Dear <strong>${managerName}</strong>,</p>
       <p>A complaint has been filed that requires your attention.</p>
       <div class="highlight">
         <p style="margin:0"><strong>Subject:</strong> ${complaintSubject}</p>
         <p style="margin:.3rem 0 0"><strong>Filed By:</strong> ${filedBy}</p>
         <p style="margin:.3rem 0 0"><strong>Severity:</strong> <span class="${severity === 'high' || severity === 'critical' ? 'er' : 'wa'}">${severity}</span></p>
       </div>
       <p>Please log in to review and take appropriate action.</p>
       <a href="${GX_CONFIG.PORTAL_URL || '#'}" class="btn">Review Complaint</a>`
    );
    return send(to, `New Complaint Filed — ${severity.toUpperCase()} priority`, html, `Dear ${managerName}, a complaint has been filed by ${filedBy}: ${complaintSubject}`);
  }

  async function sendJobApplicationConfirmation(to, name, role, refNo) {
    const html = template(
      '📋 Application Received',
      `<p>Dear <strong>${name}</strong>,</p>
       <p>Thank you for applying to join the <strong>${GX_CONFIG.COMPANY_NAME}</strong> team!</p>
       <p>We have received your application for the <strong>${role}</strong> position.</p>
       <div class="highlight">
         <p style="margin:0"><strong>Your Reference Number:</strong> <code style="color:#FF6B00;font-size:1rem">${refNo}</code></p>
       </div>
       <p>Save this reference number to track your application status on our careers portal.</p>
       <a href="${GX_CONFIG.PORTAL_URL ? GX_CONFIG.PORTAL_URL.replace('giddyexpress-login','giddyexpress-careers') : '#'}" class="btn">Track Application</a>
       <hr class="divider"/>
       <p style="font-size:.82rem">Our HR team will review your application and contact you within 5–7 business days. If you have not heard from us after 10 days, please check your reference number on the careers portal.</p>`,
      ''
    );
    return send(to, `Application Received — ${role} at ${GX_CONFIG.COMPANY_NAME}`, html, `Dear ${name}, we received your application for ${role}. Your reference: ${refNo}`);
  }

  async function sendApprovalNotification(to, managerName, requestType, requestTitle, submittedBy) {
    const html = template(
      '📋 New Approval Request',
      `<p>Dear <strong>${managerName}</strong>,</p>
       <p>A new request requires your approval.</p>
       <div class="highlight">
         <p style="margin:0"><strong>Type:</strong> ${requestType}</p>
         <p style="margin:.3rem 0 0"><strong>Request:</strong> ${requestTitle}</p>
         <p style="margin:.3rem 0 0"><strong>From:</strong> ${submittedBy}</p>
       </div>
       <a href="${GX_CONFIG.PORTAL_URL || '#'}" class="btn">Review & Approve</a>`
    );
    return send(to, `Approval Required: ${requestTitle}`, html, `Dear ${managerName}, ${submittedBy} submitted a ${requestType} for your approval: ${requestTitle}`);
  }

  // ── PUBLIC API ──
  return {
    send,
    sendWelcome,
    sendLeaveUpdate,
    sendTaskAssigned,
    sendPasswordReset,
    sendComplaintNotification,
    sendJobApplicationConfirmation,
    sendApprovalNotification,
  };

})();
