/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow tunnel URLs in dev (localtunnel, ngrok, cloudflare)
  allowedDevOrigins: [
    "*.loca.lt",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
