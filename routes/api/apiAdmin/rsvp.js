"use strict";

const util = require("../../../util/util.js");

let User = require("../../../models/user.js");

module.exports.checkInUser = (req, res) => {
    User.findOne({ pubid: req.params.pubid }, (err, user) => {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.internal.checkedin = normalize_bool(req.body.checkedin);
            user.internal.going = true;
            user.save((err) => {
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
                else {
                    return res.sendStatus(200);
                }
            });
        }
    });
};

module.exports.getUsersPlanningToAttend = (req, res) => {
    var project = "name pubid email school internal.checkedin";
    User.find({
        $or: [
            { "internal.status": { $eq: "Accepted" } },
            { "internal.status": { $eq: "Waitlisted" } },
            { "internal.going": { $eq: true } },
            { "internal.cornell_applicant": true }
        ]
    }).select(project).exec((err, users) => {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
        else {
            return res.send(users);
        }
    });
}

module.exports.rsvpDeadlineOverride = (req, res) => {
    if (!req.body.email || !req.body.daysToRSVP) {
        return res.status(500).send("Need email and daysToRSVP");
    }
    else if (req.body.daysToRSVP <= 0) {
        return res.status(500).send("Need positive daysToRSVP value");
    }

    let sanitizedEmail = req.body.email.trim().toLowerCase();
    User.findOne({ email: sanitizedEmail }, (err, user) => {
        if (err) {
            return res.status(500).send(err);
        }
        else if (!user) {
            return res.status(500).send("No such user");
        }

        user.internal.daysToRSVP = req.body.daysToRSVP;
        user.save(util.dbSaveCallback(res));
    });
};

module.exports.setRSVP = (req, res) => {
    let going = normalize_bool(req.body.going);
    if (going === "") {
        going = null;
    }

    //todo only allow changing if user is accepted
    User.findOne({ pubid: req.params.pubid }, function (err, user) {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.internal.going = going;
            user.save((err) => {
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
                else {
                    return res.sendStatus(200);
                }
            });
        }
    });
};

/**
 * Converts a bool/string to a bool. Otherwise returns the original var.
 */
function normalize_bool(string) {
    if (typeof string === "boolean") {
        return string;
    }
    else if (string.toLowerCase() === "true") {
        return true;
    }
    else if (string.toLowerCase() === "false") {
        return false;
    }
    else {
        return string;
    }

}
