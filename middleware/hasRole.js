const debug = require('debug')('app:middleware:hasRole');
const config = require('config');
const jwt = require('jsonwebtoken');

const authSecret = config.get('auth.secret');

function hasRole(allowedRole) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You are not logged in!' });
    } else if (req.auth.role === allowedRole) {
      return next();
    } else if (Array.isArray(req.auth.role) && req.auth.role.includes(allowedRole)) {
      return next();
    } else {
      return res.status(403).json({ error: `You are not a ${allowedRole}!` });
    }
  };
}

module.exports = hasRole;