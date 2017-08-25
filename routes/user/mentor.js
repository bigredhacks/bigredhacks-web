const authHelp   = require("../../util/helpers/auth");
const async      = require("async");
const email      = require("../../util/email");
const helper     = require("../../util/routes_helper");
const socketutil = require("../../util/socketutil");

let enums         = require('../../models/enum');
let MentorRequest = require('../../models/mentor_request');
let Mentor        = require('../../models/mentor.js');

function requestMentorGet (req, res) {
    MentorRequest.find({user: req.user}).exec((err, mentorRequests) => {
        if (!err) {
            return res.render("dashboard/request_mentor", {
                mentorRequests: mentorRequests
            });
        }
        else {
            console.error(err);
            req.flash("error", err.message || err.msg || err);
            return res.redirect("/user/dashboard");
        }
    });
}

function requestMentorPost (req, res) {
    async.waterfall([
        (cb) => {
            req = authHelp.validateMentorRequest(req);
            let errors = req.validationErrors();
            if (errors) {
                return cb({
                    invalidBody: true,
                    input: req.body,
                    errors: errors
                });
            }
            else {
                return cb(null);
            }
        },
        (cb) => {
            req.body.skills = req.body.skills.split(",").map(curSkill => curSkill.trim().toLowerCase());
            let newMentorRequest = new MentorRequest({
                description: req.body.description,
                skills:      req.body.skills,
                user:        req.user,
                status:      "Unclaimed",
                location:    req.body.location
            });
            newMentorRequest.save((err) => {
                if (!err) {
                    return cb(null, newMentorRequest);
                }
                else {
                    return cb(err);
                }
            });
        },
        (newMentorRequest, cb) => {
            async.parallel([
                (cb) => {
                    // Email the hacker who submitted the request
                    return email.sendRequestMadeEmail(req.user.email, req.user.name, cb);
                },
                (cb) => {
                    // Email mentors who wanted to be emailed
                    Mentor.find({emailNewReq: true}).exec((err, mentors) => {
                        if (!err) {
                            async.each(mentors, (curMentor, cb) => {
                                return email.sendNewMentorRequestEmail(curMentor, newMentorRequest, req.user.name, cb);
                            }, cb);
                        }
                        else {
                            return cb(err);
                        }
                    });
                },
                (cb) => {
                    // Send websocket update to everyone
                    MentorRequest.find({}).exec((err, mentorRequests) => {
                        if (!err) {
                            socketutil.updateRequests(mentorRequests);
                            return cb(null);
                        }
                        else {
                            return cb(err);
                        }
                    });
                }
            ], cb);
        }
    ], (err) => {
        if (!err) {
            req.flash("success", "Mentor request successfully submitted! Hang tight!");
            return res.redirect("/user/dashboard");
        }
        else {
            if (err.invalidBody === true) {
                if (typeof err === "object" && err.length > 1) {
                    err.forEach((curErr) => {
                        req.flash("error", curErr.msg);
                    });
                }
                return res.render('/dashboard/request_mentor', {
                    title: 'Mentor Registration',
                    input: req.body,
                    enums: enums,
                    errors: err.errors,
                });
            }
            else {
                req.flash("error", err);
                return res.render('/dashboard/request_mentor', {
                    title: 'Mentor Registration',
                    input: req.body,
                    enums: enums,
                });
            }
        }
    });
}

module.exports = {
    get:  requestMentorGet,
    post: requestMentorPost
};
