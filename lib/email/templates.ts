type EmailTemplateOptions = {
  title: string;
  body: string;
  previewText?: string;
};

const brandColor = "#7a9442";
const textColor = "#232742";
const mutedColor = "#5c6478";

function emailShell({ title, body, previewText }: EmailTemplateOptions) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${previewText ? `<meta name="x-apple-disable-message-reformatting" />` : ""}
  </head>
  <body style="margin:0;padding:0;background-color:#f7f7f3;font-family:Arial,Helvetica,sans-serif;color:${textColor};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f7f3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e8e2;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:${brandColor};color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">Health Academy</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;font-weight:700;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;border-top:1px solid #ecece6;color:${mutedColor};font-size:13px;line-height:1.6;">
                <p style="margin:0;">Natural Health Academy by Happy Nutrition LTD</p>
                <p style="margin:8px 0 0;">Questions? Reply to this email or contact us through healthacademy.ca.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildContactNotificationEmailHtml({
  fullName,
  email,
  subject,
  message,
}: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}) {
  return emailShell({
    title: "New contact form message",
    body: `
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${textColor};">
        A new message was submitted through the Health Academy contact form.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;line-height:1.6;">
        <tr><td style="padding:8px 0;color:${mutedColor};width:110px;">Name</td><td style="padding:8px 0;"><strong>${fullName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:${mutedColor};">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:${brandColor};">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:${mutedColor};">Subject</td><td style="padding:8px 0;">${subject}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f9faf6;border:1px solid #ecece6;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:${mutedColor};">Message</p>
        <p style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.7;color:${textColor};">${message}</p>
      </div>
    `,
  });
}

export function buildContactConfirmationEmailHtml({
  fullName,
  subject,
}: {
  fullName: string;
  subject: string;
}) {
  return emailShell({
    title: "We received your message",
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${textColor};">
        Hi ${fullName},
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${textColor};">
        Thank you for contacting the Natural Health Academy. We received your message about
        <strong>${subject}</strong> and will get back to you as soon as possible.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${mutedColor};">
        This is an automated confirmation. Please do not reply to this email unless you need to add more details.
      </p>
    `,
  });
}
