/** @type {import('next').NextConfig} */
const nextConfig = {
  // export estático: gera a pasta out/ que o Capacitor empacota dentro do APK
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
