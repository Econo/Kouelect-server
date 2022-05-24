const debug = require('debug')('app:middleware:hasAnyRole');
const config = require('config');
const jwt = require('jsonwebtoken');


function hasPermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You are not logged in!' });
    } else if (!req.auth.permissions) {
      return res.status(403).json({ error: 'You do not have any permissions!' });
    } else {
      for (const permission of requiredPermissions) {
        if (!req.auth.permissions[permission]) {
          return res.status(403).json({ error: `You do not have permission ${permission}!` });
        }
      }
      return next(); 
    }
  };
}

module.exports = hasPermission;