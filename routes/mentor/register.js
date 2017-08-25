// Node Modules and utilities
const _          = require("underscore");
const authHelp   = require("../../util/helpers/auth");
const async      = require("async");
const config     = require('../../config.js');
const helper     = require("../../util/routes_helper");
const multiparty = require('multiparty');

// Mongo Models
let enums         = require('../../models/enum');
let Mentor        = require('../../models/mentor');
let MentorRequest = require('../../models/mentor_request');
let User          = require("../../models/user");

// Variables
const ALWAYS_OMIT = 'password confirmpassword mentorRegistrationKey'.split(' ');

/**
 * @api {GET} /mentor/register mentor registration (TODO: Fix)
 * @apiName MentorRegistration
 * @apiGroup Auth
 */
function registerMentorGet (req, res) {
    res.render("mentor/register", {
        title: "Mentor Registration",
        enums: enums,
        error: req.flash('error'),
        mentorRegistration: true
    });
}

/**
 * @api {POST} /mentor/register mentor registration
 * @apiName MentorRegistration
 * @apiGroup Auth
 */
function registerMentorPost (req, res) {
    const io = this.io;
    let skillList;

    async.waterfall([
        (cb) => {
            const form = new multiparty.Form();
            form.parse(req, function (err, fields, files) {
                if (err) {
                    return cb(err);
                }
                else {
                    req.body = helper.reformatFields(fields);
                    req.files = files;
                    return cb(null);
                }
            });
        },
        (cb) => {
            req = authHelp.validateMentor(req);
            let errors = req.validationErrors();
            if (errors) {
                let errorParams = errors.map(x => x.param);
                return cb({
                    invalidBody: true,
                    input: _.omit(req.body, errorParams.concat(ALWAYS_OMIT)),
                    errors: errors
                });
            }
            else {
                return cb(null);
            }
        },
        (cb) => {
            if (!req.body.skills || req.body.skills.length === 0) {
                return cb("Please enter a comma-separated list of skills.");
            }
            else {
                skillList = req.body.skills.split(",");
                for (let i = 0; i < skillList.length; i++) {
                    skillList[i] = skillList[i].trim().toLowerCase();
                }
                return cb(null);
            }
        },
        (cb) => {
            // Parallelize some tasks that don't overlap
            async.parallel({
                existingMentor: (cb) => {
                    // Check for an existing mentor
                    Mentor.findOne({email: req.body.email}).exec((err, user) => {
                        if (!err) {
                            if (typeof user !== "undefined" && user) {
                                return cb("A mentor with this email address has already registered!");
                            }
                            else {
                                return cb(null);
                            }
                        }
                        else {
                            return cb(err);
                        }
                    });
                },
                mentorKey: (cb) => {
                    if (req.body.mentorRegistrationKey === config.mentor.mentorRegistrationKey
                        && req.body.mentorRegistrationKey.length === config.mentor.mentorRegistrationKey.length) {
                        return cb(null);
                    }
                    else {
                        return cb("Please enter a valid mentor registration key.");
                    }
                },
                passwordCheck: (cb) => {
                    if (req.body.password === req.body.confirmpassword
                        && req.body.password.length === req.body.confirmpassword.length) {
                        return cb(null);
                    }
                    else {
                        return cb("Please enter two matching passwords.");
                    }
                },
            }, (err) => {
                if (!err) {
                    return cb(null);
                }
                else {
                    return cb(err);
                }
            });
        },
        (cb) => {
            // Register this new mentor
            let newMentor = new Mentor({
                name: {
                    first: req.body.firstname,
                    last:  req.body.lastname
                },
                email:     req.body.email,
                password:  req.body.password,
                company:   req.body.company,
                skills:    skillList,
                bio:       req.body.bio
            });
            newMentor.save((err) => {
                if (!err) {
                    return cb(null, newMentor);
                }
                else {
                    return cb(err);
                }
            });
        },
        (newMentor, cb) => {
            async.parallel({
                mentorRequests: (cb) => {
                    MentorRequest.find({}).exec(cb);
                },
                mentors: (cb) => {
                    Mentor.find({}).exec(cb);
                }
            }, (err, results) => {
                if (!err && results) {
                    return cb(null, newMentor, results.mentors, results.mentorRequests);
                }
            });
        },
        (newMentor, mentors, mentorRequests, cb) => {
            async.each(mentorRequests, function (mentorRequest, callback) {
                let numMatchingMentors = 0;
                async.each(mentors, function (mentor, callback2) {
                    if (authHelp._matchingSkills(mentor.mentorinfo.skills, mentorRequest.skills)) {
                        numMatchingMentors = numMatchingMentors + 1;
                    }
                    callback2();
                }, function (err) {
                    if (err) console.error(err);
                    else {
                        mentorRequest.nummatchingmentors = numMatchingMentors;
                        mentorRequest.save(function (err) {
                            if (err) console.error(err);
                            else {
                                User.findOne({_id: mentorRequest.user.id}, function (err, user) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    else {
                                        let currentMentorRequest = {
                                            mentorRequestPubid: mentorRequest.pubid,
                                            nummatchingmentors: numMatchingMentors
                                        };
                                        io.sockets.emit("New number of mentors " + user.pubid, currentMentorRequest);
                                        callback();
                                    }
                                });
                            }
                        });
                    }
                });
            }, function (err) {
                if (err) console.error(err);
                else {
                    return cb(null, newMentor);
                }
            });
        }
    ], (err, newMentor) => {
        if (!err) {
            req.login(newMentor, function (err) {
                if (err) console.error(err);
                res.redirect('/mentor/dashboard');
            });
        }
        else {
            console.error(err);
            // If it failed, return error
            if (err.invalidBody === true) {
                if (typeof err === "object" && err.length > 1) {
                    err.forEach((curErr) => {
                        req.flash("error", curErr.msg);
                    });
                }
                return res.render('mentor/register', {
                    title: 'Mentor Registration',
                    input: req.body,
                    enums: enums,
                    errors: err.errors,
                });
            }
            else {
                req.flash("error", err);
                return res.render('mentor/register', {
                    title: 'Mentor Registration',
                    input: req.body,
                    enums: enums,
                });
            }
        }
    });
}

module.exports = {
    get:  registerMentorGet,
    post: registerMentorPost
};
