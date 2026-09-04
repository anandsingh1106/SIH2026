import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  it('allows an ordinary internal path', () => {
    expect(safeRedirectPath('/doctor/dashboard')).toBe('/doctor/dashboard');
  });

  it('allows a path with a query string and fragment', () => {
    expect(safeRedirectPath('/patients?page=2#top')).toBe('/patients?page=2#top');
  });

  it.each([
    ['//evil.example.com', 'protocol-relative'],
    ['\\\\evil.example.com', 'backslash protocol-relative'],
    ['/\\evil.example.com', 'the react-router 6 backslash bypass'],
    ['https://evil.example.com', 'absolute external URL'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['data:text/html,<script>alert(1)</script>', 'data scheme'],
    ['relative/path', 'a path not anchored to the origin'],
    ['', 'an empty target'],
  ])('rejects %s (%s)', (input: string) => {
    expect(safeRedirectPath(input)).toBe('/dashboard');
  });

  it('rejects an encoded protocol-relative target', () => {
    expect(safeRedirectPath('/%2f%2fevil.example.com')).toBe('/dashboard');
  });

  it('rejects a target smuggling a scheme past a newline', () => {
    expect(safeRedirectPath('/\njavascript:alert(1)')).toBe('/dashboard');
  });

  it('rejects malformed percent-encoding rather than guessing', () => {
    expect(safeRedirectPath('/%E0%A4%A')).toBe('/dashboard');
  });

  it('rejects non-string input', () => {
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath({ toString: () => '/admin' })).toBe('/dashboard');
  });

  it('honours a caller-supplied fallback', () => {
    expect(safeRedirectPath('//evil.example.com', '/login')).toBe('/login');
  });
});
