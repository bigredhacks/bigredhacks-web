"use strict";
var express = require('express');
var router = express.Router();
var validator = require('../library/validations.js');
var helper = require('../util/routes_helper');
var middle = require('./middleware.js');
var async = require('async');
var Announcement = require ('../models/announcement.js');
var Inventory = require ('../models/hardware_item.js');

var config = require('../config.js');
var util = require('../util/util');

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
router.get('/live',function (req, res, next) {
    async.parallel({
            announcements: function announcements(callback) {
                const PROJECTION = 'message time';
                Announcement.find({}, PROJECTION, callback);
            },
            calendar: function calendar(callback) {
                util.grabCalendar(callback);
            },
            inventory: function inventory(cb) {
                Inventory.find({}, null, {sort: {name: 'asc'}}, cb);
            }
        }, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500); // Do not expose error to users
        }

        return res.render('live', {
            title: 'Live',
            announcements: result.announcements,
            calendar: result.calendar
        });
    });
});

module.exports = router;
