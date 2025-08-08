import dotenv from 'dotenv'

dotenv.config()

/**
 * Simple admin key guard middleware.
 * Requires the request header 'x-admin-key' to match process.env.ADMIN_API_KEY.
 * Uses early returns and avoids nested conditionals per project guidelines.
 */
export default function adminGuard(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY
  if (!configuredKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' })
  }

  const incomingKey = req.header('x-admin-key')
  if (incomingKey !== configuredKey) {
    return res.status(403).json({ error: 'Unauthorized – invalid admin key' })
  }

  return next()
}
