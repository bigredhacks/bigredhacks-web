"use strict";

let MentorRequest = require('../../models/mentor_request');

function dashboardGet (req, res) {
    MentorRequest.find({}).populate('user mentor').sort({'createdAt' : 'desc'}).exec(function (err, mentorRequests) {
        if (err) console.error(err);
        res.render('mentor/index', {
            mentor: req.user,
            title: "Dashboard Home",
            mentorRequests
        });
    });
}

module.exports = {
    get: dashboardGet
};
