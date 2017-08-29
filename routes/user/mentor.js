"use strict";

const authHelp     = require("../../util/helpers/auth");
const async        = require("async");
const email        = require("../../util/email");
const mentorSkills = require("../../util/mentor_skills");
const socketutil   = require("../../util/socketutil");

let enums         = require('../../models/enum');
let MentorRequest = require('../../models/mentor_request');
let Mentor        = require('../../models/mentor.js');

function requestMentorGet (req, res) {
    MentorRequest.find({user: req.user}).populate("mentor user").exec((err, mentorRequests) => {
        if (!err) {
            return res.render("dashboard/request_mentor", {
                mentorRequests: mentorRequests
            });
        }
        else {
            console.error(err);
            req.flash("error", err);
            return res.redirect("/user/dashboard");
        }
    });
}

function requestMentorPost (req, res) {
    if (req.body.cancelrequest || req.body.completerequest) {
        async.waterfall([
            (cb) => {
                if (req.body.completerequest) {
                    MentorRequest.findByIdAndUpdate(req.body.mentorRequestID, { status: "Complete" }).exec((err) => {
                        return cb(err || null);
                    });
                }
                else if (req.body.cancelrequest) {
                    MentorRequest.findByIdAndRemove(req.body.mentorRequestID).exec((err) => {
                        return cb(err || null);
                    });
                }
                else {
                    return cb("An unexpected error occurred.");
                }
            },
            (cb) => {
                MentorRequest.find({user: req.user}).populate("mentor user").exec(cb);
            }
        ], (err, mentorRequests) => {
            if (err) {
                console.error(err);
                req.flash("error", "An unexpected error occurred.");
            }
            else {
                req.flash("success", `Request successfully ${req.body.completerequest ? "completed" : "deleted"}!`);
            }
            return res.render("dashboard/request_mentor", {
                title: 'Mentor Registration',
                input: req.body,
                enums: enums,
                mentorRequests: mentorRequests
            });
        });
    }
    else {
        const io = this;
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
                        return mentorSkills(io, newMentorRequest, cb);
                    },
                    sendRequestMadeEmail: (cb) => {
                        // Email the hacker who submitted the request
                        return email.sendRequestMadeEmail(req.user.email, req.user.name, cb);
                    },
                    sendNewMentorRequestEmail: (cb) => {
                        // Email mentors who wanted to be emailed
                        Mentor.find({emailNewReq: true}).exec((err, mentors) => {
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
                            if (!err) {
                                socketutil.updateRequests(mentorRequests);
                                mentorRequests = mentorRequests.filter(request => req.user._id.toString() === request.user._id.toString());
                                return cb(null, mentorRequests);
                            }
                            else {
                                console.log("mentorRequests error");
                                return cb(err);
                            }
                        });
                    }
                }, cb);
            }
        ], (err, results) => {
            if (err) {
                if (err.invalidBody === true) {
                    if (typeof err === "object" && err.length > 1) {
                        err.forEach((curErr) => {
                            req.flash("error", curErr.msg);
                        });
                    }
                    return res.render('dashboard/request_mentor', {
                        title: 'Mentor Registration',
                        input: req.body,
                        enums: enums,
                        errors: err.errors,
                        error: req.flash('error'),
                        mentorRequests: results.mentorRequests
                    });
                }
                else {
                    req.flash("error", "An unexpected error occurred.");
                    return res.render('dashboard/request_mentor', {
                        title: 'Mentor Registration',
                        input: req.body,
                        enums: enums,
                        error: req.flash('error'),
                        mentorRequests: results.mentorRequests
                    });
                }
            }
            else {
                req.flash("success", "Mentor request successfully submitted! Hang tight!");
                return res.render('dashboard/request_mentor', {
                    title: 'Mentor Registration',
                    enums: enums,
                    mentorRequests: results.mentorRequests
                });
            }
        });
    }
}

module.exports = {
    get:      requestMentorGet,
    post:     requestMentorPost
};
