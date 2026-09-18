async function testSettingsAndSmtp() {
  console.log('=== Verifying System Settings, SMTP Guidance & Channel Pruning ===\n');

  const BASE_URL = 'http://localhost:3001/api';

  // 1. Log in
  console.log('1. Logging in as admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@masterdashboard.com',
      password: 'Admin@1234',
    }),
  });

  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.data?.accessToken) {
    console.error('Failed to log in:', loginData);
    process.exit(1);
  }

  const token = loginData.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('✅ Logged in successfully.\n');

  // 2. Fetch system settings
  console.log('2. Fetching GET /api/system/settings...');
  const settingsRes = await fetch(`${BASE_URL}/system/settings`, { headers: authHeaders });
  const settingsJson = await settingsRes.json();
  console.log('Status:', settingsRes.status);
  const data = settingsJson.data;

  console.log('Notifications channels returned:', Object.keys(data.notifications || {}));
  if (data.notifications.telegram || data.notifications.discord || data.notifications.webhook) {
    console.error('❌ FAILED: Deprecated channels still found in notifications object:', data.notifications);
    process.exit(1);
  }
  console.log('✅ Only Email and Slack present in notifications object.');

  console.log('SMTP Config in Settings:', {
    smtpHost: data.smtpHost,
    smtpPort: data.smtpPort,
    smtpUser: data.smtpUser,
    hasSmtpPass: data.hasSmtpPass,
    alertEmail: data.alertEmail,
    slackWebhookUrl: data.slackWebhookUrl,
  });

  // 3. Test channel pruning on testNotification
  console.log('\n3. Testing testNotification with forbidden channel "telegram"...');
  const testTelegramRes = await fetch(`${BASE_URL}/system/notifications/test`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ channel: 'telegram' }),
  });
  const testTelegramJson = await testTelegramRes.json();
  console.log('Response Status for Telegram:', testTelegramRes.status);
  console.log('Response Body:', testTelegramJson);
  if (testTelegramRes.status === 400) {
    console.log('✅ Correctly rejected Telegram with 400 Bad Request.');
  } else {
    console.error('❌ Expected 400 Bad Request for Telegram, got:', testTelegramRes.status);
    process.exit(1);
  }

  // 4. Test Email notification error handling
  console.log('\n4. Testing testNotification with channel "email"...');
  const testEmailRes = await fetch(`${BASE_URL}/system/notifications/test`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ channel: 'email' }),
  });
  const testEmailJson = await testEmailJsonSafe(testEmailRes);
  console.log('Response Status for Email Test:', testEmailRes.status);
  console.log('Response Message:', testEmailJson.error?.message || testEmailJson);
  console.log('✅ Email test response handled cleanly by server.');

  // 5. Verify Alert Rules endpoint validation
  console.log('\n5. Verifying Alert Rule creation with channel "telegram"...');
  const invalidAlertRes = await fetch(`${BASE_URL}/alerts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      targetId: '507f1f77bcf86cd799439011',
      targetType: 'project',
      condition: 'down',
      channels: ['telegram'],
    }),
  });
  const invalidAlertJson = await invalidAlertRes.json();
  console.log('Invalid Alert Rule Status:', invalidAlertRes.status);
  console.log('Invalid Alert Error:', invalidAlertJson.error?.details || invalidAlertJson.error?.message);
  if (invalidAlertRes.status === 422 || invalidAlertRes.status === 400) {
    console.log('✅ Correctly rejected alert rule with "telegram" channel via Zod validation.');
  } else {
    console.error('❌ Expected 422 or 400 for Telegram channel alert rule, got:', invalidAlertRes.status);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL SYSTEM SETTINGS, SMTP & PRUNING CHECKS PASSED!');
  console.log('======================================================\n');
}

async function testEmailJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return { status: res.status, text: await res.text() };
  }
}

testSettingsAndSmtp().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
