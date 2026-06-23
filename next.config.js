/** @type {import('next').NextConfig} */
const securityHeaders = [
  // HSTS — preload-eligible. 2 years, all subdomains.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Clickjacking protection. App is never iframed.
  { key: 'X-Frame-Options', value: 'DENY' },
  // No MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referer only sent on same-origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app doesn't need camera/mic/geo. Lock them down.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP — script-src keeps 'unsafe-inline' because Next.js's
  // streaming RSC payload uses inline scripts and the Supabase JS SDK
  // ships an inline bootstrapper. A nonce-based approach is a
  // follow-up; removing 'unsafe-eval' is safe (no app code uses eval
  // or new Function, and the production build emits none either).
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.paystack.co",
      "frame-src 'self' https://checkout.paystack.com",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = nextConfig