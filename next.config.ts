import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const isDev = process.env.APP_ENV !== 'production';

// Content Security Policy — HIPAA / ISO 27001
// Restricts what the browser can load/execute to prevent XSS and data exfiltration.
const csp = [
  "default-src 'self'",
  // Next.js requires inline scripts during hydration; nonce-based approach recommended for production
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",   // MUI injects styles via Emotion
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",             // audio playback from blob URLs
  "connect-src 'self'",                 // API calls go to same origin via rewrite
  "font-src 'self'",
  "frame-ancestors 'none'",             // prevent clickjacking
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  // HSTS — only in production; browser will refuse HTTP for 1 year
  ...(!isDev ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mui/material'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:8080'}/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
