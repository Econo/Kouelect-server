require('dotenv').config();

const debug = require('debug')('app: server');
const debugError = require('debug')('app:error');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('config');
const database = require('./database');
const cors = require('cors');
const helmet = require("helmet");
const compression = require('compression');
const morgan = require('morgan');


// create application

const app = express();

if (config.get('env') === 'production') {
app.use(helmet()); // production
app.use(compression());// production
}         
if (config.get('morgan.enabled') === true || config.get('morgan.enabled') === 'true' ) {  
  const morganFormat = config.get('morgan.format');           
  app.use(morgan(morganFormat)); // variable
}
app.use(cors()); // all
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('./middleware/auth')());

// app.use(require('./middleware/authApiKey')());
// app.use(cors({ origin: 'http://localhost:3000'}))

// register routes

app.use('/api/user', require('./routes/api/user.js'));
app.use('/api/card', require('./routes/api/card.js'));
app.use('/api/card', require('./routes/api/comment.js'));
app.use('/api/bug', require('./routes/api/request.js'));
app.use('/', express.static('public', { index: 'index.html' }));

// register error handlers 21 app.use((req, res, next) => {
app.use((req, res, next) => {
  debugError(`Sorry couldn't find ${req.originalUrl}`);
  res.status(404).type('text/plain').send(`Sorry couldn't find ${req.originalUrl}`);
});
app.use((err, req, res, next) => {
  debugError(err);
  res.status(500).type('text/plain').send(err.message);
});

// listen for requests
const hostname = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debug(`Server running at http://${hostname}:${port}`);
});