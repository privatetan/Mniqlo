/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true, //启动时加载instrumentation.ts 用于加载cron
  },
}

module.exports = nextConfig
