interface ResultsAreHere {
  actionUrl: string;
}

export function resultsAreHere({ actionUrl }: ResultsAreHere): string {
  return `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', Helvetica, sans-serif; background:#f4f4f4; padding:20px;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="padding:24px;color:#333; text-align: center;">
        <h1>Results Are Here!</h1>
        <img src="https://portal.garudahacks.com/assets/garudie-mail.png" alt="Garudie with Laptop Burn" width="175"
          style="display:block;margin:auto;" />
        <p>The wait is finally over! Head to the portal to see your application result. Whatever happens, we're rooting for you 🚀</p>
        <p style="text-align:center;margin:32px 0; margin-top: 50px;">
          <a href="${actionUrl}"
            style="background:#5079ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
            Open Portal
          </a>
        </p>
        <p style="margin-top: 50px;">Regards,</p>
        <p>Garuda Hacks 7.0 Committee</p>
        <hr style="border-color: #f9f5ff;">
        <div style="color: #909090; font-size: 10px;">
          <p>© 2026 Garuda Hacks. All rights reserved.</p>
          <p>Visit our <a href="https://garudahacks.com">website</a> or Contact <a
              href="mailto:heryan@garudahacks.com">support</a></p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
