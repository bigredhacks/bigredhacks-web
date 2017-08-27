"use strict";

let Mentor  = require('../../models/mentor');

function optinPost (req, res) {
    Mentor.findOneAndUpdate(
        {_id: req.user._id.toString()},
        {emailNewReq: req.body.newVal === "true"}
    ).exec((err) => {
        res.setHeader('Content-Type', 'application/json');
        if (err) {
            console.error(err);
            return res.status(500).send({
                err: "An unexpected error occurred."
            });
        }
        else {
            return res.status(200).send({
                msg: "Email status successfully changed!"
            });
        }
    });
}

module.exports = {
    post: optinPost
};
