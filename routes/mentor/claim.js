const async      = require("async");
const email      = require("../../util/email");
const socketutil = require("../../util/socketutil");

let Mentor        = require("../../models/mentor");
let MentorRequest = require("../../models/mentor_request");

function claimPost (req, res) {
    async.waterfall([
        (cb) => {
            Mentor.findOne({"_id" : req.body.mentorId}).exec(cb);
        },
        (curMentor, cb) => {
            if (!curMentor) {
                return cb("Mentor could not be found!");
            }
            else {
                MentorRequest.findOneAndUpdate(
                    {"_id" : req.body.requestId, "status": "Unclaimed"},
                    {"status": "Claimed", mentor: curMentor},
                    {returnNewDocument: true, new: true}
                ).populate("mentor user").exec(cb);
            }
        },
        (request, cb) => {
            if (!request) {
                return cb("Error finding the request! Has it already been claimed?");
            }
            else {
                async.parallel([
                    (cb) => {
                        MentorRequest.find({}).exec((err, requests) => {
                            if (err) {
                                return cb(err);
                            }
                            else {
                                socketutil.updateRequests(requests);
                                return cb(null);
                            }
                        });
                    },
                    (cb) => {
                        email.sendRequestClaimedStudentEmail(request.user.email, request.user.name, request.mentor.name, cb);
                    },
                    (cb) => {
                        email.sendRequestClaimedMentorEmail(request.mentor.email, request.user.name, request.mentor.name, cb);
                    }
                ], (err) => {
                    if (err) {
                        return cb(err);
                    }
                    else {
                        return cb(null, request);
                    }
                });
            }
        }
    ], (err, request) => {
        if (err) {
            console.error(err);
            req.flash("error", "An unexpected error occurred.");
        }
        else if (!request) {
            req.flash("error", "Missing mentor request.");
        }
        else {
            req.flash("success", `You have claimed the request for help! Please go see ${request.user.name.full} at ${request.location}.`);
        }
        MentorRequest.find({}).populate('user mentor').sort({'createdAt' : 'desc'}).exec(function (err, mentorRequests) {
            if (err) console.error(err);
            res.render('mentor/index', {
                error: req.flash("error"),
                mentor: req.user,
                title: "Dashboard Home",
                mentorRequests
            });
        });
    });
}

module.exports = {
    post: claimPost
};
