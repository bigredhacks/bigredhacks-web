"use strict";

const async = require("async");
let Mentor  = require('../../models/mentor.js');

function optinPost (req, res) {
    async.waterfall([
        (cb) => {
            Mentor.findOne({_id: req.user._id.toString()}).exec(cb);
        },
        (foundMentor, cb) => {
            foundMentor.emailNewReq = req.body.newVal;
            foundMentor.save(cb);
        }
    ], (err) => {
        if (!err) {
            return res.status(200).send(req.body.newVal);
        }
        else {
            return res.status(500).send(err);
        }
    });
}

module.exports = {
    post: optinPost
};
