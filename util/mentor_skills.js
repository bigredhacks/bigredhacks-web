"use strict";

const async       = require("async");
const authHelp    = require("./helpers/auth");
let Mentor        = require('../models/mentor');
let MentorRequest = require('../models/mentor_request');
let User          = require("../models/user");

/**
 * Determine skill overlap with mentors and one or more mentor requests.
 * @param io            Socket.io object to update clients with
 * @param mentorRequest Optional: Mongo object representing a single mentorRequest to inspect and update
 * @param mainCB        Callback function on completion
 */
module.exports = (io, mentorRequest, mainCB) => {
    // User may not have specified an individual mentor request to do skill analysis on
    // If that's the case, we examine all mentor request.
    // If the user *does* provide an individual mentor request, only look at that one request.
    mainCB = typeof mentorRequest === "function"
        ? mentorRequest
        : mainCB;
    async.parallel({
        mentorRequests: (cb) => {
            if (typeof mentorRequest === "object") {
                return cb(null, [mentorRequest]);
            }
            else {
                MentorRequest.find({}).exec(cb);
            }
        },
        mentors: (cb) => {
            Mentor.find({}).exec(cb);
        }
    }, (err, results) => {
        let mentorRequests = results.mentorRequests;
        let mentors        = results.mentors;
        async.each(mentorRequests, (curRequest, eachRequestCB) => {
            let numMatchingMentors = 0;
            async.each(mentors, (curMentor, eachMentorCB) => {
                if (curMentor.skills && curRequest.skills
                && authHelp._matchingSkills(curMentor.skills, curRequest.skills)) {
                    numMatchingMentors++;
                    curRequest.update({ $inc: { num_matching_mentors: 1} }).exec(eachMentorCB);
                }
                else {
                    return eachMentorCB(null);
                }
            }, (err) => {
                if (err) {
                    return eachRequestCB(err);
                }
                else {
                    User.findOne({_id: curRequest.user._id.toString()}).exec((err, user) => {
                        if (err) {
                            return eachRequestCB(err);
                        }
                        else {
                            let currentMentorRequest = {
                                mentorRequestPubid: curRequest.pubid,
                                nummatchingmentors: numMatchingMentors
                            };
                            io.sockets.emit(`New number of mentors ${user.pubid}`, currentMentorRequest);
                            return eachRequestCB(null);
                        }
                    });
                }
            });
        }, mainCB);
    });
};
