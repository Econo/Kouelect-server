const debug = require('debug')('app:middleware:isLoggedIn');
const config = require('config');
const jwt = require('jsonwebtoken');

const authSecret = config.get('auth.secret');

function isLoggedIn(){
  return(req, res, next) =>{
    if (!req.auth) {
      return res.status(401).json({ error: 'You are not logged in!' });
    } else {
      return next();
    }
  };
}

module.exports = isLoggedIn;