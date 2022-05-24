const { json } = require("express");


const API_KEY = '1111';


function authApiKey() {
  return(req, res, next) => {
      const apiKey = req.body.apiKey;
      if(apiKey === API_KEY){
        return next();
      } else {
        return res.status(401).json({error: 'invalid api key'});
      }
  }
}

module.exports = authApiKey;