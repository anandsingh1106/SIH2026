import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point every test at a throwaway database, never the development one.
// This must run before any module reads config/env.js.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = path.join(__dirname, '.tmp', 'test.sqlite');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';
process.env.FRONTEND_URL = 'http://localhost:3000';

const tmpDir = path.dirname(process.env.DATABASE_URL);
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
