const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['images.clerk.dev'],
  },
};

module.exports = withBundleAnalyzer(nextConfig); 