const _          = require("underscore");
const authHelp   = require("../../util/helpers/auth");
const async      = require("async");

// Mongo Models
let enums         = require('../../models/enum.js');
let MentorRequest = require('../../models/mentor_request.js');
let User          = require("../../models/user");

/**
 * @api {GET} /mentorregistration mentor registration (TODO: Fix)
 * @apiName MentorRegistration
 * @apiGroup Auth
 */
function registerMentorGet (req, res) {
    res.render("register_mentor", {
        title: "Mentor Registration",
        enums: enums,
        error: req.flash('error')
    });
}

/**
 * @api {POST} /mentorregistration mentor registration (TODO: Fix)
 * @apiName MentorRegistration
 * @apiGroup Auth
 */
function registerMentorPost (req, res) {
    const io = this.io;

    let skillList = req.body.skills.split(",");
    for (let i = 0; i < skillList.length; i++) {
        skillList[i] = skillList[i].trim();
    }
    let newMentor = new User({
        name: {
            first: req.body.firstname,
            last: req.body.lastname
        },
        email: req.body.email,
        password: req.body.password,
        role: "mentor",
        mentorinfo: {
            company: req.body.companyDropdown,
            skills: skillList,
            bio: req.body.bio
        }
    });
    newMentor.save(function (err) {
        if (err) {
            // If it failed, return error
            console.log(err);
            req.flash("error", "An error occurred.");
            res.render('register_mentor', {
                title: 'Mentor Registration',
                error: req.flash('error'),
                input: req.body,
                enums: enums
            });
        }
        else {
            MentorRequest.find({}).exec(function (err, mentorRequests) {
                User.find({role: "mentor"}).exec(function (err, mentors) {
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
                                            if (err) console.error(err);
                                            else {
                                                let currentMentorRequest = {
                                                    mentorRequestPubid: mentorRequest.pubid,
                                                    nummatchingmentors: numMatchingMentors
                                                };
                                                io.sockets.emit("new number of mentors " + user.pubid, currentMentorRequest);
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
                            req.login(newMentor, function (err) {
                                res.redirect('/mentor/dashboard');
                            });
                        }
                    });
                });
            });
        }
    });
}

module.exports = {
    get:  registerMentorGet,
    post: registerMentorPost
};