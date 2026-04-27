/** @type {import('next').NextConfig} */

function buildVersion() {
  const now = new Date()
  const yy  = now.getUTCFullYear().toString().slice(2)
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(now.getUTCDate()).padStart(2, '0')
  const hh   = String(now.getUTCHours()).padStart(2, '0')
  const min  = String(now.getUTCMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd}.${hh}${min}`
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion(),
  },
}

export default nextConfig
