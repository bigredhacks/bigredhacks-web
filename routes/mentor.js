"use strict";
var express = require('express');
var async = require('async');
var enums = require('../models/enum.js');
var app = require('../app');
var email = require('../util/email');
var middle = require('../routes/middleware.js');
var multiparty = require('multiparty');
var helper = require('../util/routes_helper.js');
var socketutil = require('../util/socketutil');
var moment = require('moment');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var MentorAuthKey = require('../models/mentor_authorization_key');
var MentorRequest = require('../models/mentor_request');
var Mentor = require('../models/mentor');

var router = express.Router();

passport.use('mentor_strat', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function (req, email, password, done) {
        Mentor.findOne({email: email}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (user == null || !user.validPassword(password)) {
                return done(null, false, function () {
                    req.flash('email', email);
                    req.flash('error', 'Incorrect username or email.');
                }());
            }
            return done(null, user);
        });
    }
));

module.exports = function(io) {
    /**
     * @api {GET} /mentor Mentor dashboard.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/', function (req, res, next) {
        return res.redirect('/mentor/dashboard');
    });

    /**
     * @api {GET} /mentor/dashboard Dashboard of logged in mentor.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/dashboard', middle.requireMentor, function (req, res, next) {
        MentorRequest.find({}).populate('user mentor').sort({'createdAt' : 'desc'}).exec(function (err, mentorRequests) {
            if (err) console.error(err);
            res.render('mentor/index', {
                mentor: req.user,
                title: "Dashboard Home",
                mentorRequests
            });
        });
    });

    /**
     * @api {GET} /mentor/register Registration page for a mentor
     */
    router.get('/register', function (req, res) {
        res.render('register_mentor', {
            title: "Mentor Registration"
        });
    });

    /**
     * @api {GET} /mentor/login Login page for a mentor
     */
    router.get('/login', function (req, res) {
        res.render('mentor/login', {
            title: "Mentor Login"
        });
    });

    /**
     * @api {POST} /mentor/login Do login for mentor
     */
    router.post('/login',
        passport.authenticate('mentor_strat', {
            failureRedirect: '/mentor/login',
            failureFlash: true
        }), function (req, res) {
            return res.redirect('/mentor/dashboard');
        }
    );

    /**
     * @api {GET} /mentor/logout Logout the current mentor
     * @apiName Logout
     * @apiGroup Mentor
     */
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    /**
     * @api {POST} /mentor/claim Route for mentors to claim a user
     *
     * @apiParam {String} requestId The mongo id of the request being claimed
     * @apiParam {String} mentorId The mongo id of the mentor making the claim
     */
    router.post('/claim', function (req, res) {
        async.parallel({
            request: function request(callback) {
                MentorRequest.findOne({'_id' : req.body.requestId}).populate('user').exec(callback);
            },
            mentor: function mentor(callback) {
                Mentor.findOne({'_id' : req.body.mentorId}).exec(callback);
            }
        }, function(err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send('an error occurred');
            } else if (!result.request || !result.mentor) {
                return res.status(500).send('missing request or mentor');
            } else if (result.request.mentor !== null) {
                return res.status(500).send('another mentor has already claimed this');
            }

            result.request.mentor = result.mentor;
            result.request.status = 'Claimed';

            async.series({
                notifyStudent: function notifyStudent(callback) {
                    email.sendRequestClaimedStudentEmail(result.request.user.email, result.request.user.name, result.mentor.name, callback);
                },
                notifyMentor: function notifyMentor(callback) {
                    email.sendRequestClaimedMentorEmail(result.mentor.email, result.request.user.name, result.mentor.name, callback);
                },
                saveRequest: function saveRequest(callback) {
                    result.request.save(callback);
                }
            }, function(err) {
                if (err) {
                    console.error(err);
                }

                socketutil.updateRequests(null);
                req.flash('success', 'You have claimed the request for help! Please go see ' + result.request.user.name.full + ' at ' + result.request.location);
                res.status(200).redirect('/');
            });
        });
    });

    /**
     * @api {POST} /mentor/register Registration submission for a mentor
     */
    router.post('/register', function (req, res) {
        var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
                req.flash('error', "Error parsing form.");
                return res.redirect('/mentor/register');
            }

            req.body = helper.reformatFields(fields);

            // TODO: Actually validate fields
            var authKey = req.body.auth;
            console.log(authKey);
            MentorAuthKey.findOne({key: authKey}, function(err, key) {
                if (!key) {
                    req.flash('error', 'Invalid authorization code!');
                    return res.redirect('/mentor/register');
                }

                var newMentor = new Mentor({
                    name: {
                        first: req.body.firstname,
                        last: req.body.lastname
                    },
                    company: req.body.company,
                    email: req.body.em,
                    password: req.body.password
                });

                async.series([
                    function saveMentor(cb) {
                        newMentor.save(cb);
                    },
                    function deleteKey(cb) {
                        key.remove(cb);
                    }
                ], function(err) {
                    if (err) {
                        console.error(err);
                        req.flash("error", "An error occurred.");
                        return res.redirect('/mentor/register');
                    }

                    return res.redirect('/mentor/dashboard');
                });
            });
        });
    });

    return router;
};
