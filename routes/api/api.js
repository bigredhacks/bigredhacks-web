"use strict";

const async = require("async");
const express = require("express");
const email = require("../../util/email");
const mentorSkills = require("../../util/mentor_skills");
const middle = require("../middleware");
const socketutil = require("../../util/socketutil");
const util = require("../../util/util");

let router = express.Router();

let Announcement = require("../../models/announcement");
let Colleges = require("../../models/college");
let Hardware = require("../../models/hardware");
let Mentor = require("../../models/mentor");
let MentorRequest = require("../../models/mentor_request");
let User = require("../../models/user");

/**
 * @api {get} /api/colleges Request a full list of known colleges
 * @apiName GetColleges
 * @apiGroup API
 *
 * @apiSuccess {String[]} colleges A list of our colleges.
 */
router.get("/colleges", function (req, res, next) {
    Colleges.getAll(function (err, data) {
        if (err) console.log(err);
        else res.send(data);
    });
});

router.get("/hardware", function (req, res, next) {
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
router.get("/validEmail", function (req, res) {
    let sanitizedEmail = req.query.email ? req.query.email.trim().toLowerCase() : req.query.email;
    User.findOne({ email: sanitizedEmail }, function (err, user) {
        if (err) {
            return res.send("Please enter a valid email.");
        }
        else {
            return res.send(!user);
        }
    });
});

/**
 * @api {get} /api/validEmailMentor Confirm validity of email among mentors
 * @apiName ValidEmail
 * @apiGroup API
 *
 * @apiSuccess (200) {Boolean} valid True if the email isn't taken, false otherwise.
 * @apiSuccess (200) {String} error Request for valid email.
 */
router.get("/validEmailMentor", function (req, res) {
    let sanitizedEmail = req.query.email ? req.query.email.trim().toLowerCase() : req.query.email;
    Mentor.findOne({ email: sanitizedEmail }, function (err, user) {
        if (err) {
            return res.send("Please enter a valid email.");
        }
        else {
            return res.send(!user);
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
router.post("/rsvp/notinterested", middle.requireResultsReleased, function (req, res, next) {
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
router.patch("/rsvp/cornellstudent", middle.requireResultsReleased, function (req, res, next) {
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
router.get("/announcements", function (req, res, next) {
    Announcement.find({}, "message time", function (err, ann) {
        if (err) {
            console.error(err);
        }
        else {
            res.send({
                announcements: ann
            });
        }
    });
});

/**
 * @api {GET} /api/calendar Get a list of all calendar events
 * @apiName GETCalendar
 * @apiGroup Calendar
 *
 * @apiSuccess {Object[]} calendarEvents
 * @apiSuccess {String} calendarEvents.event Name of the event
 * @apiSuccess {Date} calendarEvents.start Start of the event
 * @apiSuccess {Date} calendarEvents.end End of the event
 * @apiSuccess {String} calendarEvents.location Location of the event or "" if not specified
 * @apiSuccess {String} calendarEvents.description Description of the event or "" if not specified
 */
router.get("/calendar", function (req, res, next) {
    util.grabCalendar(function (err, cal) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }

        return res.status(200).send(cal);
    });
});


/**
 * @api {POST} /api/RequestMentor Request a mentor
 * @apiName GETCalendar
 * @apiGroup Calendar
 *
 * @apiSuccess {String} email User's email matching an existing user in the database
 * @apiSuccess {String request A description of the help needed for the request
 * @apiSuccess {String} tableNumber Where the requester is located, usually a table number
 */
router.post("/RequestMentor", function (req, res) {
    async.waterfall([
        (cb) => {
            if (!req.body.tableNumber) {
                // This API was given without location originally, so this supports requests without location
                req.body.tableNumber = "Unknown";
            }
            let newMentorRequest = new MentorRequest({
                description: req.body.request,
                skills: req.body.skills,
                user: req.user._id.toString(),
                status: "Unclaimed",
                location: req.body.tableNumber
            });
            newMentorRequest.save((err) => {
                if (err) {
                    return cb(err);
                }
                else {
                    return cb(null, newMentorRequest);
                }
            });
        },
        (newMentorRequest, cb) => {
            async.parallel({
                mentorSkill: (cb) => {
                    // Update this mentor request with info on other mentors' skillsets
                    return mentorSkills(null, newMentorRequest, cb);
                },
                sendRequestMadeEmail: (cb) => {
                    // Email the hacker who submitted the request
                    return email.sendRequestMadeEmail(req.user.email, req.user.name, cb);
                },
                sendNewMentorRequestEmail: (cb) => {
                    // Email mentors who wanted to be emailed
                    Mentor.find({ emailNewReq: true }).exec((err, mentors) => {
                        if (err) {
                            return cb(err);
                        }
                        else {
                            async.each(mentors, (curMentor, cb) => {
                                email.sendNewMentorRequestEmail(curMentor, newMentorRequest, req.user.name, cb);
                            }, cb);
                        }
                    });
                },
                mentorRequests: (cb) => {
                    // Send websocket update to everyone and grab new MentorRequests
                    MentorRequest.find({}).populate("mentor user").exec((err, mentorRequests) => {
                        if (err) {
                            return cb(err);
                        }
                        else {
                            socketutil.updateRequests(mentorRequests);
                            mentorRequests = mentorRequests.filter(request => req.user._id.toString() === request.user._id.toString());
                            return cb(null, mentorRequests);
                        }
                    });
                }
            }, cb);
        },
    ], (err) => {
        if (err) {
            if (typeof err === "string") {
                return res.status(200).send(err);
            }
            else {
                console.error(err);
                return res.status(200).send("An unexpected error occurred.");
            }
        }
        else {
            return res.status(200).send("Request made!");
        }
    });
});

module.exports = router;
