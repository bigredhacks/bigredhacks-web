const async      = require("async");
const email      = require('../../util/email');
const socketutil = require('../../util/socketutil');

let Mentor        = require('../../models/mentor');
let MentorRequest = require('../../models/mentor_request');

function claimPost (req, res) {
    async.parallel({
        request: function request(callback) {
            MentorRequest.findOne({'_id' : req.body.requestId}).populate('user').exec(callback);
        },
        mentor: function mentor(callback) {
            Mentor.findOne({'_id' : req.body.mentorId}).exec(callback);
        }
    }, function(err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('An unexpected error occurred.');
        }
        else if (!result.request || !result.mentor) {
            return res.status(500).send('Missing request or mentor.');
        }
        else if (result.request.mentor !== null) {
            return res.status(500).send('Another mentor has already claimed this request.');
        }

        result.request.mentor = result.mentor;
        result.request.status = 'Claimed';

        async.series({
            notifyStudent: function notifyStudent(callback) {
                email.sendRequestClaimedStudentEmail(result.request.user.email, result.request.user.name, result.mentor.name, callback);
            },
            notifyMentor: function notifyMentor(callback) {
                email.sendRequestClaimedMentorEmail(result.mentor.email, result.request.user.name, result.mentor.name, callback);
            },
            saveRequest: function saveRequest(callback) {
                result.request.save(callback);
            }
        }, function(err) {
            if (err) {
                console.error(err);
            }

            socketutil.updateRequests(null);
            req.flash('success', `You have claimed the request for help! Please go see ${result.request.user.name.full} at ${result.request.location}`);
            res.status(200).redirect('/');
        });
    });
}

module.exports = {
    post: claimPost
};
