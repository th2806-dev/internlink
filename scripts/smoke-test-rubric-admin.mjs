#!/usr/bin/env node

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:7109';
const USERNAME = process.env.SMOKE_USERNAME || 'admin';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Password123!';

const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${step} - ${detail}`);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload = text;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // keep raw text
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    throw new Error(`HTTP ${response.status} for ${path}: ${message}`);
  }

  return payload;
}

async function login() {
  const payload = await request('/api/Auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!payload?.success || !payload?.data?.token) {
    throw new Error(`Login failed for ${USERNAME}`);
  }

  return payload.data.token;
}

async function getOptional(path, token) {
  try {
    return await request(path, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (String(error.message).includes('HTTP 404')) {
      return null;
    }

    throw error;
  }
}

function getRubricStatus(response) {
  return response?.data?.status ?? response?.status ?? null;
}

async function main() {
  try {
    const token = await login();

    const semestersResponse = await request('/api/Admin/semesters', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const semesters = Array.isArray(semestersResponse?.data) ? semestersResponse.data : [];
    if (semesters.length === 0) {
      throw new Error('No semesters available for rubric smoke test. Seed or create a semester first.');
    }

    const semesterId = semesters[0].id;
    const existingRubricResponse = await getOptional(`/api/Admin/semesters/${semesterId}/rubric`, token);

    const criteria = [
      { name: 'Chuyên môn', description: 'Mốc kiểm tra chuyên môn', weight: 40, maxScore: 10, orderIndex: 1 },
      { name: 'Thái độ', description: 'Mốc kiểm tra thái độ', weight: 30, maxScore: 10, orderIndex: 2 },
      { name: 'Kỹ năng', description: 'Mốc kiểm tra kỹ năng', weight: 30, maxScore: 10, orderIndex: 3 },
    ];

    const requestBody = {
      name: existingRubricResponse?.data ? 'Smoke rubric updated' : 'Smoke rubric initial',
      applicationMode: 'Required',
      criteria,
    };

    const saveResponse = await request(`/api/Admin/semesters/${semesterId}/rubric`, {
      method: existingRubricResponse?.data ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestBody),
    });

    const rubric = saveResponse?.data;
    const statusOk = rubric?.status === 'Approved';
    const approvalOk = Boolean(rubric?.approvedByName) && Boolean(rubric?.approvedAt);

    record(
      '1. Admin CRUD rubric save',
      statusOk && approvalOk,
      `semesterId=${semesterId} status=${rubric?.status ?? 'unknown'} approvedBy=${rubric?.approvedByName ?? 'n/a'} approvedAt=${rubric?.approvedAt ?? 'n/a'}`,
    );

    const persistedResponse = await request(`/api/Admin/semesters/${semesterId}/rubric`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const persistedStatus = getRubricStatus(persistedResponse);
    const persistedStatusOk = persistedStatus === 'Approved';
    record(
      '2. Rubric persists as Approved',
      persistedStatusOk,
      `status=${persistedStatus ?? 'unknown'}`,
    );

    const fails = results.filter((result) => !result.ok);
    if (fails.length > 0) {
      console.log('');
      console.log('=== Summary ===');
      console.log(`${results.length - fails.length} / ${results.length} passed`);
      process.exit(1);
    }

    console.log('');
    console.log('=== Summary ===');
    console.log(`${results.length} / ${results.length} passed`);
  } catch (error) {
    record('SMOKE ABORT', false, error.message);
    console.log('');
    console.log('=== Summary ===');
    console.log(`0 / ${results.length || 1} passed`);
    process.exit(1);
  }
}

main();
