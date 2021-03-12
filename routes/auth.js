"use strict";

// Node Modules and variables
const express = require("express");
const LocalStrategy = require("passport-local").Strategy;
const middle = require("./middleware");
const passport = require("passport");

// Mongo models
let Mentor = require("../models/mentor.js");
let User = require("../models/user.js");

// Route imports
const login           = require("./auth/login");
const passwordForgot  = require("./auth/passwordForgot");
const passwordReset   = require("./auth/passwordReset");
const register        = require("./auth/register");

passport.use("user_strat", new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
    passReqToCallback: true
},
function (req, email, password, done) {
    let sanitizedEmail = email ? email.trim().toLowerCase() : email;
    User.findOne({email: sanitizedEmail}, function (err, user) {
        if (err) {
            console.log("err");
            return done(err);
        }
        if (user === null || !user.validPassword(password)) {
            console.log("no user");
            return done(null, false, function () {
                req.flash("error", "Incorrect username or email.");
            }());
        }
        console.log("fine");
        return done(null, user);
    });
}));

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    // Passport shares all deserialization. Since mongo IDs are supposed to be unique even across collections,
    // we can just traverse both databases to differentiate users from mentors. See the following for more detail:
    // http://stackoverflow.com/questions/4677237/possibility-of-duplicate-mongo-objectids-being-generated-in-two-different-colle
    User.findById(id, function (err, user) {
        if (user) {
            done(err, user);
        }
        else {
            Mentor.findById(id, function (err, user) {
                done(err, user);
            });
        }
    });
});

module.exports = function (io) {
    let router = express.Router();

    // Login
    //router.get("/login",  login.get);
    //router.post("/login", passport.authenticate("user_strat", {
    //    failureRedirect: "/login",
    //    failureFlash: true
    //}), login.post);

    // Forgot Password
    router.get("/forgotpassword",  passwordForgot.get);
    router.post("/forgotpassword", passwordForgot.post);

    // Reset Password
    router.get("/resetpassword",   passwordReset.get);
    router.post("/resetpassword",  passwordReset.post);

    // Registration (General)
    // router.get("/register/:name?", (req, res, next) => {
    //     if (req.params.name) {
    //         return middle.requireCornellRegistrationOpen(req, res, next);
    //     }
    //     else {
    //         return next();
    //     }
    // }, middle.requireRegistrationOpen, middle.requireNoAuthentication, register.get);

    // router.post("/register/:name?", (req, res, next) => {
    //     if (req.params.name) {
    //         return middle.requireCornellRegistrationOpen(req, res, next);
    //     }
    //     else {
    //         return next();
    //     }
    // }, middle.requireRegistrationOpen, register.post);

    return router;
};
