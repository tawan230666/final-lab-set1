const { verifyToken } = require('./jwtUtils');

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    // Log JWT invalid (fire-and-forget) - can't use log service here, but we could log to own DB
    // For simplicity, we'll just respond
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
