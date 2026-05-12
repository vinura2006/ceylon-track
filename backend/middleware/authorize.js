/**
 * authorize - Express middleware factory
 * Returns middleware that checks if req.user.role is included in the allowed roles array.
 * Must be used AFTER authenticateToken.
 * Returns 401 if req.user is missing (authentication not performed).
 * Returns 403 if the user's role is not in the allowed roles list.
 */
function authorize(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required.'
            });
        }

        const userRole = String(req.user.role || '').toLowerCase();
        const allowed = allowedRoles.map((r) => String(r).toLowerCase());
        if (!allowed.includes(userRole)) {
            return res.status(403).json({
                error: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
}

module.exports = { authorize };
