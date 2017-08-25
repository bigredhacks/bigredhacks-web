"use strict";

const express       = require('express');
const middle        = require('../routes/middleware.js');
const passport      = require('passport');
let router          = express.Router();
const LocalStrategy = require('passport-local').Strategy;

let Mentor = require('../models/mentor');

passport.use('mentor_strat',
    new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    function (req, email, password, done) {
        Mentor.findOne({email: email}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (user === null || !user.validPassword(password)) {
                return done(null, false, function () {
                    req.flash('email', email);
                    req.flash('error', 'Incorrect username or email.');
                }());
            }
            return done(null, user);
        });
    })
);

const claimPost    = require("./mentor/claim").post;
const dashboardGet = require("./mentor/dashboard").get;
const registerGet  = require("./mentor/register").get;
const registerPost = require("./mentor/register").post;

module.exports = function (io) {
    /**
     * @api {GET} /mentor Mentor dashboard.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/', function (req, res) {
        return res.redirect('/mentor/dashboard');
    });

    /**
     * @api {GET} /mentor/dashboard Dashboard of logged in mentor.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/dashboard', middle.requireMentor, dashboardGet);

    /**
     * @api {GET} /mentor/register Registration page for a mentor
     */
    router.get('/register', registerGet);

    /**
     * @api {POST} /mentor/register Registration submission for a mentor
     */
    router.post('/register', registerPost.bind(io));

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
    router.post('/claim', middle.requireMentor, claimPost);

    return router;
};
