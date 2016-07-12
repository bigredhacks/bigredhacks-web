"use strict";
var express = require('express');
var router = express.Router();
var Colleges = require('../../models/college.js');
var Hardware = require('../../models/hardware.js');
var User = require('../../models/user.js');
var Announcement = require ('../../models/announcement.js');

var middle = require('../middleware');

/**
 * @api {get} /api/colleges Request a full list of known colleges
 * @apiName GetColleges
 * @apiGroup API
 *
 * @apiSuccess {String[]} colleges A list of our colleges.
 */
router.get('/colleges', function (req, res, next) {
    Colleges.getAll(function (err, data) {
        if (err) console.log(err);
        else res.send(data);
    });
});

router.get('/hardware', function (req, res, next) {
    Hardware.getAll(function (err, data) {
        if (err) console.log(err);
        else res.send(data);
    });
});


//todo prevent access when registration is completely closed
/**
 * @api {get} /api/validEmail Confirm validity of email
 * @apiName ValidEmail
 * @apiGroup API
 *
 * @apiSuccess (200) {Boolean} valid True if the email isn't taken, false otherwise.
 * @apiSuccess (200) {String} error Request for valid email.
 */
router.get('/validEmail', function (req, res, next) {
    User.findOne({email: req.query.email}, function (err, user) {
        if (err) {
            res.send("Please enter a valid email.");
        }
        else {
            res.send(!user);
        }
    });
});

/**
 * @api {post} /rsvp/notinterested Toggle interested in attending for waitlisted
 * @apiName NotInterested
 * @apiGroup RSVP
 *
 * @apiError UserError Could not save RSVP info for user.
 */
router.post('/rsvp/notinterested', middle.requireResultsReleased, function (req, res, next) {
    var checked = (req.body.checked === "true");
    var user = req.user;
    if (user.internal.status == "Waitlisted") {
        user.internal.not_interested = checked;
        user.save(function (err) {
            if (err) {
                res.sendStatus(500);
            }
            else res.sendStatus(200);
        });
    }
});

/**
 * @api {PATCH} /rsvp/cornellStudent Toggle rsvp for cornell students
 * @apiName CornellStudent
 * @apiGroup RSVP
 *
 * @apiError UserError Could not save RSVP info for user.
 * @apiError NotCornell
 */
router.patch('/rsvp/cornellstudent', middle.requireResultsReleased, function (req, res, next) {
    var checked = (req.body.checked === "true");
    var user = req.user;
    if (user.internal.cornell_applicant) {
        user.internal.going = checked;
        user.save(function (err) {
            if (err) {
                res.sendStatus(500);
            }
            else res.sendStatus(200);
        });
    }
    else res.sendStatus(500);
});

/**
 * @api {GET} /api/announcements Get a list of all announcements made
 * @apiName GETAnnouncements
 * @apiGroup Announcements
 *
 * @apiSuccess {Object[]} announcements
 * @apiSuccess {String} announcements.message Body of the message
 * @apiSuccess {Date} announcements.time Time the announcement was made
 *
 */
router.get('/announcements', function (req, res, next) {
    Announcement.find({}, "message time", function (err, ann) {
        if (err) {
            console.error(err);
        } else {
            res.send({
                announcements: ann
            });
        }
    });
});



module.exports = router;
