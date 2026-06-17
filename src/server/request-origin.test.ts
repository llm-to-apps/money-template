import { describe, expect, it } from 'vitest';

import { publicProtocol } from './request-origin';

describe('publicProtocol', () => {
  it('keeps localhost origins on http', () => {
    expect(publicProtocol('localhost:3000', 'https')).toBe('http');
    expect(publicProtocol('money-dev.localhost', null)).toBe('http');
    expect(publicProtocol('127.0.0.1:3000', 'https')).toBe('http');
    expect(publicProtocol('[::1]:3000', 'https')).toBe('http');
  });

  it('uses https for public os7 domains behind an http proxy hop', () => {
    expect(publicProtocol('money-kilogram.os7.dev', 'http')).toBe('https');
    expect(publicProtocol('margolik-yenom.os7.dev', null)).toBe('https');
  });

  it('honors forwarded https for non-os7 public domains', () => {
    expect(publicProtocol('example.com', 'https')).toBe('https');
  });
});
