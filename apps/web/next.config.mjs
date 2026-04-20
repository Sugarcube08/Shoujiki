/** @type {import('next').NextConfig} */
// Force reload: 1776720037837
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    turbopack: {},
    webpack: (config) => {
        config.resolve.fallback = { fs: false, os: false, path: false };
        return config;
    },
};

export default nextConfig;
