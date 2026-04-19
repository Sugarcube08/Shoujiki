/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    webpack: (config) => {
        config.resolve.fallback = { fs: false, os: false, path: false };
        return config;
    },
};

export default nextConfig;
