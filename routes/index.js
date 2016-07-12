"use strict";
var express = require('express');
var router = express.Router();
var validator = require('../library/validations.js');
var helper = require('../util/routes_helper');
var middle = require('./middleware.js');

var config = require('../config.js');

/**
 * @api {GET} /index Home page.
 * @apiName Index
 * @apiGroup Index
 */
router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Cornell\'s Ultimate Hackathon'
    });
});


/**
 * @api {POST} /cornell/subscribe subscribe a cornell student to the mailing list
 * @apiName Subscribe
 * @apiGroup Index
 */
router.post('/cornell/subscribe', function (req, res, next) {
    req = validator.validate(req, ['cornellEmail']);
    var email = req.body.cornellEmail;
    if (req.validationErrors()) {
        console.log(req.validationErrors());
        req.flash("error", "Please enter a valid email.");
        res.redirect("/");
    }
    else {
        helper.addSubscriber(config.mailchimp.l_interested, email, "", "", function (err, result) {
            if (err) {
                if (err.name === "List_AlreadySubscribed") {
                    req.flash("error", err.error);
                }
                else {
                    console.log(err);
                    req.flash("error", "There was an error adding your email to the list.");
                }
                //console.log(err);
            }
            else {
                //console.log(result);
                req.flash("success", "Your email has been added to the mailing list.");
            }
            res.redirect('/');
        })
    }
});

/**
 * @api {GET} /live Day-of information page.
 * @apiName DayOf
 * @apiGroup Index
 */
router.get('/live', middle.requireDayof,function (req, res, next) {
    res.render('live', {
        title: 'BigRed//Hacks | Live'
    });
});


module.exports = router;
