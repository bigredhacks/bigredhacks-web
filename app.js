"use strict";
const express = require('express');
var socket_io = require('socket.io');
var path = require('path');
const favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var validator = require('validator');
var session = require('cookie-session');
var flash = require('express-flash');
var compression = require('compression');

var config = require('./config.js');

var app = express();
var io = socket_io();
app.io = io;
if (config.setup.use_redis) {
    var redis = require('socket.io-redis'); // Needed to successfully scale out
        io.adapter(redis({
            host: process.env.REDISTOGO_URL || 'localhost',
            port: process.env.REDISTOGO_URL ? 11989 : 6379
        })); // Assuming constant REDIS port
}
var subdomain = require('subdomain');
var routes = require('./routes/index');
var user = require('./routes/user')(app.io);
var mentor = require('./routes/mentor')(app.io);
var socketutil = require('./util/socketutil');
socketutil.activateIo(app.io);
var admin = require('./routes/admin');
var apiRoute = require('./routes/api/api');
var apiAdminRoute = require('./routes/api/admin');
var authRoute = require('./routes/auth')(app.io);
var middle = require('./routes/middleware');

var passport = require("passport");

//mongoose setup
var mongoose = require('mongoose');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
  useMongoClient: true,
  /* other options */
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//require pretty output for proper html formatting
//Some elements, i.e. inline forms, require pretty
//for spaces to properly render.
app.locals.pretty = false;


app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
//@todo expressValidator does support isMobilePhone, but their dependencies are out of date. Rather than using npm shrinkwrap, I opted for a custom validator.
//this should be removed once expressValidator uses validator version >3.38.0
app.use(expressValidator({
    customValidators: {
        isMobilePhone: function (value, locale) {
            return validator.isMobilePhone(value, locale);
        },
        //optional only checks undefined, not truthiness
        optionalOrisURL: function (value) {
            return !value || validator.isURL(value);
        },
        optionalOrLen: function (value, min, max) {
            return !value || validator.isLength(value, min, max);
        },
    }
}));
app.use(cookieParser());
app.use(flash());
app.use(session({
    name: 'brh:sess',
    secret: config.setup.cookie_secret
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('less-middleware')(path.join(__dirname, 'public')));

if (app.get('env') === 'production') {
    var oneDay = 86400000;
    app.use(express.static(path.join(__dirname, 'build'), {maxAge: oneDay}));
    app.use(express.static(path.join(__dirname, 'public'), {maxAge: oneDay}));

}
else {

    app.use(express.static(path.join(__dirname, 'public')));
}

app.use(subdomain({base: config.setup.url}));

//generic middleware function
app.use(middle.allRequests);

//setup routes
//requireAuthentication must come before requireNoAuthentication to prevent redirect loops
app.use('/', routes);
app.use('/api/admin', middle.requireAdmin, apiAdminRoute);
app.use('/api', apiRoute);

app.use('/admin', middle.requireAdmin, admin);
app.use('/user', middle.requireAuthentication, user);
app.use('/mentor', mentor);
app.use('/', authRoute); //todo mount on separate route to allow use of noAuth without disabling 404 pages


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    res.status(400);
    res.render('404.pug', {title: '404: File Not Found'});
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('404', {});
});


//app.locals definitions
app.locals.enums = require("./models/enum.js");
app.locals.middlehelp = require("./routes/middleware").helper;
app.locals.moment = require('moment');

//@todo move to setup
//@todo force synchronous
//loading colleges
require('./util/load_static_data.js').collegeLoader.loadOnce(function (err) {
    if (err) {
        console.log(err);
    }
});

require('./util/load_static_data.js').hardwareLoader.loadOnce(function (err) {
    if (err) {
        console.log(err);
    }
});
// Start execution of cron jobs
require('./util/cron').go();
module.exports = app;