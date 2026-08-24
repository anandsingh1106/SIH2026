/**
 * OpenAPI 3.0 description of the ArogyaSetu API (§45).
 *
 * Schemas are described at the level the endpoints actually enforce; the Zod
 * validators remain the source of truth for request validation.
 */

const envelope = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
});

const paginatedEnvelope = (itemSchema) => envelope({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 20 },
        total: { type: 'integer', example: 57 },
        totalPages: { type: 'integer', example: 3 },
      },
    },
  },
});

const ERROR_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};

const PAGINATION_PARAMS = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const RESPONSES = {
  400: { description: 'Validation failed', content: { 'application/json': { schema: ERROR_SCHEMA } } },
  401: { description: 'Not authenticated', content: { 'application/json': { schema: ERROR_SCHEMA } } },
  403: { description: 'Not authorized', content: { 'application/json': { schema: ERROR_SCHEMA } } },
  404: { description: 'Not found', content: { 'application/json': { schema: ERROR_SCHEMA } } },
  409: { description: 'Conflict', content: { 'application/json': { schema: ERROR_SCHEMA } } },
  429: { description: 'Rate limited', content: { 'application/json': { schema: ERROR_SCHEMA } } },
};

const ok = (schema, description = 'Success') => ({
  description,
  content: { 'application/json': { schema } },
});

/** Compact helper for the many CRUD-shaped routes. */
function crud({ tag, summary, params = [], body, response, roles, codes = [401, 403, 404] }) {
  const responses = { 200: ok(response) };
  for (const code of codes) responses[code] = RESPONSES[code];

  return {
    tags: [tag],
    summary,
    description: roles ? `Allowed roles: ${roles.join(', ')}.` : undefined,
    parameters: params,
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: body } } } } : {}),
    responses,
  };
}

const OBJ = (properties, required = []) => ({ type: 'object', properties, required });
const STR = { type: 'string' };
const NUM = { type: 'number' };
const INT = { type: 'integer' };
const BOOL = { type: 'boolean' };

const USER = OBJ({
  id: STR, name: STR, phone: STR, email: STR,
  role: { type: 'string', enum: ['patient', 'asha', 'doctor', 'specialist', 'admin'] },
  district: STR, facilityId: STR, facilityName: STR, isVerified: BOOL,
});

const APPOINTMENT = OBJ({
  id: STR, date: STR, time: STR, doctor: STR, specialty: STR, facility: STR,
  type: { type: 'string', enum: ['in-person', 'telemedicine'] },
  status: { type: 'string', enum: ['upcoming', 'completed', 'cancelled'] },
  reason: STR, tokenNumber: INT,
});

const PATIENT = OBJ({
  id: STR, abhaId: STR, name: STR, dateOfBirth: STR, gender: STR, phone: STR,
  district: STR, taluka: STR, village: STR, bloodGroup: STR,
});

const REFERRAL = OBJ({
  id: STR, referralCode: STR, patientId: STR, patientName: STR,
  urgency: { type: 'string', enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] },
  status: { type: 'string', enum: ['CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'] },
  specialty: STR, clinicalSummary: STR, history: { type: 'array', items: OBJ({ status: STR, note: STR, timestamp: STR }) },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MahaAarogya Sangam (ArogyaSetu) API',
    version: '1.0.0',
    description: `
Backend API for the MahaAarogya Sangam digital public health platform.

**Authentication.** Email + password via Supabase Auth. The browser signs in with
Supabase, then posts the resulting access token to \`POST /api/auth/session\`. The
server verifies it with Supabase and issues an httpOnly session cookie (JWT,
7-day expiry). Send credentials with every request.

**Roles.** \`patient\`, \`asha\`, \`doctor\`, \`specialist\`, \`admin\`. Roles are always
read from the database — a role supplied by the client is never trusted.

**Responses.** Success: \`{ "success": true, "data": ... }\`.
Error: \`{ "success": false, "error": { "code", "message", "details" } }\`.

**Pagination.** List endpoints accept \`?page=&limit=\` and return
\`{ items, pagination: { page, limit, total, totalPages } }\`.

**Privacy.** Endpoints that read patient data are scoped by role and are audited.
Unauthorized reads return 404 rather than 403 so record existence is not leaked.
    `.trim(),
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'Auth', description: 'Phone-OTP login and session' },
    { name: 'Patients', description: 'Patient records, allergies, family, vitals' },
    { name: 'Appointments', description: 'Booking, cancellation, rescheduling' },
    { name: 'Clinical', description: 'Consultations, prescriptions, medicines' },
    { name: 'Referrals', description: 'Referral lifecycle and timeline' },
    { name: 'Labs', description: 'Lab orders and results' },
    { name: 'Beds', description: 'Bed inventory and allocation' },
    { name: 'ASHA', description: 'Home visits, tasks, immunisation, maternal, NCD' },
    { name: 'Inventory', description: 'Stock, transactions and transfers' },
    { name: 'Queue', description: 'OPD token queue' },
    { name: 'Notifications', description: 'User and broadcast notifications' },
    { name: 'Messaging', description: 'Conversations and messages' },
    { name: 'Sync', description: 'Offline batch synchronisation' },
    { name: 'Analytics', description: 'Role dashboards and heatmaps' },
    { name: 'AI', description: 'Triage, assistant, drug interactions' },
    { name: 'Audit', description: 'Audit trail (admin only)' },
    { name: 'Public', description: 'Unauthenticated directory endpoints' },
    { name: 'System', description: 'Health and readiness' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check', security: [],
        responses: { 200: ok(OBJ({ status: STR, database: STR, timestamp: STR, version: STR })) } },
    },
    '/live': { get: { tags: ['System'], summary: 'Liveness probe', security: [], responses: { 200: ok(OBJ({ status: STR })) } } },
    '/ready': { get: { tags: ['System'], summary: 'Readiness probe', security: [], responses: { 200: ok(OBJ({ status: STR })) } } },

    '/api/auth/session': {
      post: {
        tags: ['Auth'], summary: 'Exchange a Supabase access token for a session',
        description: 'Verifies the Supabase access token and issues this app\'s session cookie. Logs in an existing user; on first sign-in the application account is provisioned from `name` and `role` (or from the metadata captured at signup). Missing both returns the `NEW_USER` error code so the client can collect a profile.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: OBJ({
          accessToken: STR, name: STR,
          role: { type: 'string', enum: ['patient', 'asha', 'doctor', 'specialist', 'admin'] },
          phone: STR, district: STR, taluka: STR, village: STR, abhaId: STR,
        }, ['accessToken']) } } },
        responses: { 200: ok(envelope(OBJ({ user: USER }))), 201: ok(envelope(OBJ({ user: USER })), 'Account created'),
                     400: RESPONSES[400], 401: RESPONSES[401], 429: RESPONSES[429] },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Current session user',
        responses: { 200: ok(envelope(OBJ({ user: USER }))), 401: RESPONSES[401] } },
    },
    '/api/auth/logout': {
      post: { tags: ['Auth'], summary: 'Clear the session cookie', security: [],
        responses: { 200: ok(envelope(OBJ({ message: STR }))) } },
    },

    '/api/patients': {
      get: crud({ tag: 'Patients', summary: 'List/search patients (scoped by role)',
        params: [...PAGINATION_PARAMS,
          { name: 'search', in: 'query', schema: STR },
          { name: 'district', in: 'query', schema: STR }],
        response: paginatedEnvelope(PATIENT) }),
      post: crud({ tag: 'Patients', summary: 'Register a patient',
        roles: ['asha', 'doctor', 'specialist', 'admin'],
        body: OBJ({ name: STR, abhaId: STR, dateOfBirth: STR, gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] }, phone: STR, district: STR }, ['name']),
        response: envelope(PATIENT), codes: [400, 401, 403, 409] }),
    },
    '/api/patients/{id}': {
      get: crud({ tag: 'Patients', summary: 'Get a patient with allergies, conditions and family',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(PATIENT) }),
      patch: crud({ tag: 'Patients', summary: 'Update a patient',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ phone: STR, address: STR, bloodGroup: STR }),
        response: envelope(PATIENT) }),
    },
    '/api/patients/{id}/vitals': {
      get: crud({ tag: 'Patients', summary: 'Vitals history',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope({ type: 'array', items: OBJ({ id: STR, bpSystolic: INT, pulse: INT, bmi: NUM, recordedAt: STR }) }) }),
      post: crud({ tag: 'Patients', summary: 'Record vitals (BMI derived server-side)',
        roles: ['asha', 'doctor', 'specialist', 'admin'],
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ temperature: NUM, bloodPressureSystolic: INT, bloodPressureDiastolic: INT, heartRate: INT, oxygenSaturation: INT, weight: NUM, height: NUM }),
        response: envelope(OBJ({ id: STR, bmi: NUM })) }),
    },

    '/api/appointments': {
      get: crud({ tag: 'Appointments', summary: 'List appointments (scoped by role)',
        params: PAGINATION_PARAMS, response: paginatedEnvelope(APPOINTMENT) }),
      post: crud({ tag: 'Appointments', summary: 'Book an appointment',
        body: OBJ({ date: STR, time: STR, type: { type: 'string', enum: ['in-person', 'telemedicine'] }, doctor: STR, facility: STR, specialty: STR, reason: STR }, ['date', 'time']),
        response: envelope(APPOINTMENT), codes: [400, 401, 403, 409] }),
    },
    '/api/appointments/{id}/cancel': {
      patch: crud({ tag: 'Appointments', summary: 'Cancel an appointment',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(APPOINTMENT), codes: [401, 404, 409] }),
    },
    '/api/appointments/{id}/reschedule': {
      patch: crud({ tag: 'Appointments', summary: 'Reschedule (rejects a taken doctor slot)',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ date: STR, time: STR }, ['date', 'time']),
        response: envelope(APPOINTMENT), codes: [400, 401, 404, 409] }),
    },

    '/api/consultations': {
      get: crud({ tag: 'Clinical', summary: 'List consultations', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, patientId: STR, diagnosis: STR, status: STR })) }),
      post: crud({ tag: 'Clinical', summary: 'Record a consultation', roles: ['doctor', 'specialist'],
        body: OBJ({ patientId: STR, chiefComplaint: STR, symptoms: { type: 'array', items: STR }, diagnosis: STR }, ['patientId']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/prescriptions': {
      get: crud({ tag: 'Clinical', summary: 'List prescriptions', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, patientId: STR, diagnosis: STR, status: STR })) }),
      post: crud({ tag: 'Clinical', summary: 'Issue a prescription', roles: ['doctor', 'specialist'],
        body: OBJ({ patientId: STR, diagnosis: STR, items: { type: 'array', items: OBJ({ medicineName: STR, dosage: STR, frequency: STR, duration: STR }, ['medicineName']) } }, ['patientId', 'items']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/medicines': {
      get: crud({ tag: 'Clinical', summary: 'Search the formulary',
        params: [...PAGINATION_PARAMS, { name: 'search', in: 'query', schema: STR }],
        response: paginatedEnvelope(OBJ({ id: STR, name: STR, genericName: STR })) }),
      post: crud({ tag: 'Clinical', summary: 'Add a medicine', roles: ['admin'],
        body: OBJ({ name: STR, genericName: STR, category: STR }, ['name']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403] }),
    },

    '/api/referrals': {
      get: crud({ tag: 'Referrals', summary: 'List referrals (specialists see their facility queue)',
        params: [...PAGINATION_PARAMS, { name: 'status', in: 'query', schema: STR }, { name: 'urgency', in: 'query', schema: STR }],
        response: paginatedEnvelope(REFERRAL) }),
      post: crud({ tag: 'Referrals', summary: 'Create a referral',
        roles: ['asha', 'doctor', 'specialist', 'admin'],
        body: OBJ({ patientId: STR, destinationFacilityId: STR, specialty: STR, urgency: { type: 'string', enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] }, clinicalSummary: STR }, ['patientId']),
        response: envelope(REFERRAL), codes: [400, 401, 403, 404] }),
    },
    '/api/referrals/{id}': {
      get: crud({ tag: 'Referrals', summary: 'Referral with full timeline',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }], response: envelope(REFERRAL) }),
      patch: crud({ tag: 'Referrals', summary: 'Apply a status transition',
        description: 'Transitions are validated against the referral state machine; an illegal jump returns 409.',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ status: STR, note: STR }, ['status']),
        response: envelope(REFERRAL), codes: [400, 401, 403, 404, 409] }),
    },
    '/api/referrals/{id}/accept': {
      post: crud({ tag: 'Referrals', summary: 'Accept (destination facility only)',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(REFERRAL), codes: [401, 403, 404, 409] }),
    },
    '/api/referrals/{id}/complete': {
      post: crud({ tag: 'Referrals', summary: 'Complete the referral',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(REFERRAL), codes: [401, 403, 404, 409] }),
    },

    '/api/lab-orders': {
      get: crud({ tag: 'Labs', summary: 'List lab orders', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, testName: STR, status: STR, priority: STR })) }),
      post: crud({ tag: 'Labs', summary: 'Order a test', roles: ['doctor', 'specialist'],
        body: OBJ({ patientId: STR, testName: STR, priority: { type: 'string', enum: ['ROUTINE', 'URGENT', 'STAT'] } }, ['patientId', 'testName']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/lab-orders/{id}/results': {
      post: crud({ tag: 'Labs', summary: 'Record a result (completes the order, alerts the clinician)',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ result: STR, unit: STR, abnormalFlag: { type: 'string', enum: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL'] } }),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404, 409] }),
    },

    '/api/beds': {
      get: crud({ tag: 'Beds', summary: 'List beds', params: [...PAGINATION_PARAMS, { name: 'facilityId', in: 'query', schema: STR }],
        response: paginatedEnvelope(OBJ({ id: STR, bedNumber: STR, type: STR, status: STR })) }),
    },
    '/api/beds/availability': {
      get: crud({ tag: 'Beds', summary: 'Aggregate availability by facility and type',
        response: envelope({ type: 'array', items: OBJ({ facilityName: STR, type: STR, total: INT, available: INT }) }) }),
    },
    '/api/beds/{id}/allocate': {
      post: crud({ tag: 'Beds', summary: 'Allocate a bed (transactional; double allocation returns 409)',
        roles: ['doctor', 'specialist', 'admin'],
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ patientId: STR, referralId: STR }, ['patientId']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404, 409] }),
    },
    '/api/beds/{id}/release': {
      post: crud({ tag: 'Beds', summary: 'Release a bed',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(OBJ({ id: STR, status: STR })), codes: [401, 403, 404, 409] }),
    },

    '/api/home-visits': {
      get: crud({ tag: 'ASHA', summary: 'List home visits', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, patientId: STR, date: STR, riskLevel: STR })) }),
      post: crud({ tag: 'ASHA', summary: 'Record a home visit (critical findings alert clinicians)',
        roles: ['asha', 'doctor', 'specialist', 'admin'],
        body: OBJ({ patientId: STR, visitDate: STR, riskLevel: { type: 'string', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] } }, ['patientId', 'visitDate']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/tasks': {
      get: crud({ tag: 'ASHA', summary: 'Task queue (own tasks unless admin)', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, title: STR, priority: STR, status: STR })) }),
      post: crud({ tag: 'ASHA', summary: 'Create/assign a task',
        body: OBJ({ title: STR, assignedTo: STR, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }, dueDate: STR }, ['title']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/vaccinations': {
      get: crud({ tag: 'ASHA', summary: 'List vaccinations (supports dueBefore)',
        params: [...PAGINATION_PARAMS, { name: 'dueBefore', in: 'query', schema: STR }],
        response: paginatedEnvelope(OBJ({ id: STR, name: STR, status: STR, scheduledDate: STR })) }),
      post: crud({ tag: 'ASHA', summary: 'Schedule a vaccination',
        body: OBJ({ patientId: STR, vaccineName: STR, scheduledDate: STR }, ['patientId', 'vaccineName']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/maternal-records': {
      get: crud({ tag: 'ASHA', summary: 'Maternal records (restricted)', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, eddDate: STR, highRisk: BOOL })) }),
      post: crud({ tag: 'ASHA', summary: 'Register a pregnancy (EDD derived from LMP)',
        body: OBJ({ patientId: STR, lmpDate: STR, gravida: INT, parity: INT }, ['patientId']),
        response: envelope(OBJ({ id: STR, eddDate: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/ncd-screenings': {
      get: crud({ tag: 'ASHA', summary: 'List NCD screenings', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, cbacScore: INT, riskCategory: STR })) }),
      post: crud({ tag: 'ASHA', summary: 'Record a screening (CBAC computed server-side)',
        body: OBJ({ patientId: STR, waistCircumference: NUM, tobaccoUse: BOOL, bloodPressureSystolic: INT, bloodGlucose: NUM }, ['patientId']),
        response: envelope(OBJ({ id: STR, cbacScore: INT, riskCategory: STR })), codes: [400, 401, 403, 404] }),
    },

    '/api/inventory': {
      get: crud({ tag: 'Inventory', summary: 'Stock levels (supports lowStock, expiringBefore)',
        params: [...PAGINATION_PARAMS, { name: 'lowStock', in: 'query', schema: BOOL }],
        response: paginatedEnvelope(OBJ({ id: STR, name: STR, stock: INT, isLow: BOOL })) }),
      post: crud({ tag: 'Inventory', summary: 'Add a stock item', roles: ['doctor', 'admin'],
        body: OBJ({ medicineId: STR, facilityId: STR, quantity: INT, reorderLevel: INT }, ['medicineId', 'facilityId']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404] }),
    },
    '/api/inventory/{id}/adjust': {
      post: crud({ tag: 'Inventory', summary: 'Adjust stock (never goes negative; 409 if insufficient)',
        roles: ['doctor', 'admin'],
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ type: { type: 'string', enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'EXPIRED'] }, quantity: INT, reason: STR }, ['type', 'quantity']),
        response: envelope(OBJ({ id: STR, stock: INT })), codes: [400, 401, 403, 404, 409] }),
    },
    '/api/inventory/transfer': {
      post: crud({ tag: 'Inventory', summary: 'Transfer stock between facilities (atomic)',
        roles: ['doctor', 'admin'],
        body: OBJ({ medicineId: STR, fromFacilityId: STR, toFacilityId: STR, quantity: INT }, ['medicineId', 'fromFacilityId', 'toFacilityId', 'quantity']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 403, 404, 409] }),
    },

    '/api/queue/token': {
      post: crud({ tag: 'Queue', summary: 'Issue an OPD token (sequential, no duplicates)',
        body: OBJ({ facilityId: STR, patientId: STR }, ['facilityId']),
        response: envelope(OBJ({ id: STR, tokenNumber: INT })), codes: [400, 401, 404, 409] }),
    },
    '/api/queue/{facilityId}': {
      get: crud({ tag: 'Queue', summary: 'Current queue for a facility',
        params: [{ name: 'facilityId', in: 'path', required: true, schema: STR }],
        response: envelope(OBJ({ date: STR, items: { type: 'array', items: OBJ({ tokenNumber: INT, status: STR }) }, summary: OBJ({ waiting: INT, currentToken: INT }) })) }),
    },
    '/api/queue/{tokenId}/call': {
      post: crud({ tag: 'Queue', summary: 'Call a token', roles: ['doctor', 'specialist', 'admin'],
        params: [{ name: 'tokenId', in: 'path', required: true, schema: STR }],
        response: envelope(OBJ({ id: STR, status: STR })), codes: [401, 403, 404, 409] }),
    },

    '/api/notifications': {
      get: crud({ tag: 'Notifications', summary: 'List notifications (own + matching broadcasts)',
        params: [...PAGINATION_PARAMS, { name: 'unreadOnly', in: 'query', schema: BOOL }],
        response: paginatedEnvelope(OBJ({ id: STR, title: STR, isRead: BOOL, priority: STR })) }),
    },
    '/api/notifications/{id}/read': {
      patch: crud({ tag: 'Notifications', summary: 'Mark one as read',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: envelope(OBJ({ id: STR, isRead: BOOL })), codes: [401, 404] }),
    },
    '/api/notifications/read-all': {
      post: crud({ tag: 'Notifications', summary: 'Mark all as read', response: envelope(OBJ({ updated: INT })), codes: [401] }),
    },

    '/api/conversations': {
      get: crud({ tag: 'Messaging', summary: 'List conversations you belong to', params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, subject: STR, unreadCount: INT })) }),
      post: crud({ tag: 'Messaging', summary: 'Start a conversation',
        body: OBJ({ subject: STR, memberIds: { type: 'array', items: STR } }),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 404] }),
    },
    '/api/conversations/{id}/messages': {
      get: crud({ tag: 'Messaging', summary: 'Messages (members only; 404 otherwise)',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        response: paginatedEnvelope(OBJ({ id: STR, text: STR, senderName: STR })) }),
      post: crud({ tag: 'Messaging', summary: 'Send a message',
        params: [{ name: 'id', in: 'path', required: true, schema: STR }],
        body: OBJ({ body: STR }, ['body']),
        response: envelope(OBJ({ id: STR })), codes: [400, 401, 404] }),
    },

    '/api/sync/batch': {
      post: {
        tags: ['Sync'],
        summary: 'Apply a batch of queued offline operations',
        description: `Idempotent. Each operation carries a client-generated \`operationId\`; replaying a
batch returns the original result and creates no duplicates. Each operation commits
independently, so one failure does not discard the rest. Authorization is enforced
exactly as on the equivalent REST route.

Supported: \`home_visit:CREATE\`, \`patient:CREATE\`, \`task:CREATE\`, \`task:UPDATE\`,
\`ncd_screening:CREATE\`, \`vaccination:CREATE\`, \`vitals:CREATE\`, \`referral:CREATE\`.`,
        requestBody: { required: true, content: { 'application/json': { schema: OBJ({
          operations: { type: 'array', items: OBJ({
            operationId: STR, entity: STR,
            action: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE'] },
            payload: { type: 'object' }, clientTimestamp: STR,
          }, ['operationId', 'entity', 'action']) },
        }, ['operations']) } } },
        responses: {
          200: ok(envelope(OBJ({ results: { type: 'array', items: OBJ({ operationId: STR, success: BOOL, serverId: STR, duplicate: BOOL, error: STR }) } }))),
          400: RESPONSES[400], 401: RESPONSES[401],
        },
      },
    },

    '/api/analytics/admin': {
      get: crud({ tag: 'Analytics', summary: 'Statewide dashboard', roles: ['admin'],
        params: [{ name: 'district', in: 'query', schema: STR }, { name: 'from', in: 'query', schema: STR }],
        response: envelope(OBJ({ patients: { type: 'object' }, referrals: { type: 'object' }, beds: { type: 'object' } })),
        codes: [401, 403] }),
    },
    '/api/analytics/heatmap': {
      get: crud({ tag: 'Analytics', summary: 'Aggregated geographic counts (no identifiers)', roles: ['admin'],
        params: [{ name: 'metric', in: 'query', schema: { type: 'string', enum: ['patients', 'ncd_high_risk', 'maternal_high_risk', 'referrals'] } }],
        response: envelope(OBJ({ metric: STR, points: { type: 'array', items: OBJ({ district: STR, value: INT }) } })),
        codes: [401, 403] }),
    },

    '/api/ai/triage': {
      post: {
        tags: ['AI'],
        summary: 'Assess triage risk',
        description: 'Deterministic red-flag rules decide the risk category; the AI layer only explains that result and never overrides it. Never diagnoses or recommends medication. Works without an AI key (explanation omitted).',
        requestBody: { required: true, content: { 'application/json': { schema: OBJ({
          symptoms: { type: 'array', items: STR }, vitals: { type: 'object' }, age: INT, notes: STR,
        }) } } },
        responses: {
          200: ok(envelope(OBJ({ riskScore: INT, riskCategory: { type: 'string', enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] }, detectedFindings: { type: 'array', items: { type: 'object' } }, recommendedAction: STR, explanation: STR, aiAssisted: BOOL, disclaimer: STR }))),
          400: RESPONSES[400], 401: RESPONSES[401], 429: RESPONSES[429],
        },
      },
    },
    '/api/ai/drug-interactions': {
      post: {
        tags: ['AI'], summary: 'Check for documented drug interactions',
        description: 'Uses a small curated dataset of well-documented pairs. Unknown pairs return "no known interaction in this dataset" — interactions are never invented.',
        requestBody: { required: true, content: { 'application/json': { schema: OBJ({ medicines: { type: 'array', items: STR } }, ['medicines']) } } },
        responses: { 200: ok(envelope(OBJ({ interactions: { type: 'array', items: { type: 'object' } }, severity: STR, recommendation: STR }))), 400: RESPONSES[400], 401: RESPONSES[401] },
      },
    },
    '/api/ai/assistant': {
      post: crud({ tag: 'AI', summary: 'Ask the clinical assistant',
        body: OBJ({ question: STR, context: STR }, ['question']),
        response: envelope(OBJ({ answer: STR, available: BOOL, disclaimer: STR })), codes: [400, 401, 429] }),
    },

    '/api/audit-logs': {
      get: crud({ tag: 'Audit', summary: 'Audit trail', roles: ['admin'], params: PAGINATION_PARAMS,
        response: paginatedEnvelope(OBJ({ id: STR, action: STR, resource: STR, userName: STR, timestamp: STR })),
        codes: [401, 403] }),
    },

    '/api/public/facilities': {
      get: { tags: ['Public'], summary: 'Facility directory', security: [],
        parameters: [...PAGINATION_PARAMS, { name: 'search', in: 'query', schema: STR }, { name: 'district', in: 'query', schema: STR }],
        responses: { 200: ok(paginatedEnvelope(OBJ({ id: STR, name: STR, type: STR, district: STR }))) } },
    },
    '/api/public/medicines': {
      get: { tags: ['Public'], summary: 'Public medicine directory', security: [],
        parameters: [...PAGINATION_PARAMS, { name: 'search', in: 'query', schema: STR }],
        responses: { 200: ok(paginatedEnvelope(OBJ({ id: STR, name: STR, genericName: STR }))) } },
    },
    '/api/public/bed-availability': {
      get: { tags: ['Public'], summary: 'Aggregate bed availability', security: [],
        responses: { 200: ok(envelope({ type: 'array', items: OBJ({ facilityName: STR, type: STR, available: INT }) })) } },
    },
    '/api/public/emergency': {
      get: { tags: ['Public'], summary: 'Emergency helplines and guidance', security: [],
        responses: { 200: ok(envelope(OBJ({ helplines: { type: 'array', items: OBJ({ name: STR, number: STR }) } }))) } },
    },
    '/api/public/health-programs': {
      get: { tags: ['Public'], summary: 'Government health programmes', security: [],
        responses: { 200: ok(envelope({ type: 'array', items: OBJ({ code: STR, name: STR, description: STR }) })) } },
    },

    '/api/stream': {
      get: {
        tags: ['System'], summary: 'Server-Sent Events stream',
        description: 'Emits real domain events (`notification`, `referral`, `queue`, `bed`) as they occur. Notification events are filtered to what the authenticated user may see. No simulated data.',
        responses: { 200: { description: 'text/event-stream' }, 401: RESPONSES[401] },
      },
    },
  },
};
