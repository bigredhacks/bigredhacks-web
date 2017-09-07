// Node Modules and utilities
const _            = require("underscore");
const authHelp     = require("../../util/helpers/auth");
const async        = require("async");
const config       = require('../../config.js');
const mentorSkills = require("../../util/mentor_skills");

// Mongo Models
let enums         = require('../../models/enum');
let Mentor        = require('../../models/mentor');

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
    const io = this;
    let skillList;
    async.waterfall([
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
                    let sanitizedEmail = req.body.email ? req.body.email.trim().toLowerCase() : req.body.email;
                    Mentor.findOne({email: sanitizedEmail}).exec((err, user) => {
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
                    if (req.body.mentorRegistrationKey === config.mentor.mentorRegistrationKey) {
                        return cb(null);
                    }
                    else {
                        return cb("Please enter a valid mentor registration key.");
                    }
                },
                passwordCheck: (cb) => {
                    if (req.body.password === req.body.confirmpassword) {
                        return cb(null);
                    }
                    else {
                        return cb("Please enter two matching passwords.");
                    }
                },
            }, cb);
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
                if (err) {
                    return cb(err);
                }
                else {
                    return cb(null, newMentor);
                }
            });
        },
        (newMentor, cb) => {
            // Update existing mentor requests with this mentor's skillset
            mentorSkills(io, (err) => {
                if (err) {
                    return cb(err);
                }
                else {
                    return cb(null, newMentor);
                }
            });
        }
    ], (err, newMentor) => {
        if (!err) {
            req.login(newMentor, function (err) {
                if (err) {
                    console.error(err);
                }
                else {
                    return res.redirect('/mentor/dashboard');
                }
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
                req.flash("error", typeof err === "string" ? err : "An unknown error occurred.");
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
