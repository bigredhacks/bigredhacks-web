"use strict";
const express = require('express');
const router = express.Router();
const validator = require('../library/validations.js');
const helper = require('../util/routes_helper');
const middle = require('./middleware.js');
const async = require('async');
const Announcement = require ('../models/announcement.js');
const Inventory = require ('../models/hardware_item.js');

const config = require('../config.js');
const util = require('../util/util');

/**
 * @api {GET} /index Home page.
 * @apiName Index
 * @apiGroup Index
 */
router.get('/', function (req, res, next) {
    let ev = req.flash();
    console.log(ev);
    res.render('index', {
        title: 'Cornell\'s Ultimate Hackathon',
        messages: ev
    });
});

/**
 * @api {POST} /subscribe subscribe a student to the mailing list
 * @apiName Subscribe
 * @apiGroup Index
 * @params isCornell- is the student from Cornell or not?
 * @params cornellEmail or email- the email to subscribe
 */
router.get('/subscribe', function (req, res, next) {
    req = validator.validate(req, ['email']);
    var email = req.query['email'];
    if (req.validationErrors()) {
        console.log(req.validationErrors());
        res.send({status: false, message: "Please enter a valid email"});
    }
    else {
        helper.addSubscriber(config.mailchimp.l_interested, email, "", "", function (err, result) {
            if (err) {
                if (err.name === "List_AlreadySubscribed") {
                    res.send({status: false, message: "You're already subscribed!"});
                }
                else {
                    console.log(err);
                    res.send({status: false, message: "There was an error adding your email to the list."});
                }
            }
            else {
                res.send({status: true, message: "Your email has been added to the mailing list!"});
            }  
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
