"use strict";

const async = require("async");

let User = require("../../../models/user.js");

module.exports.cornellLottery = (req, res) => {
    if (!req.body.numberToAccept || req.body.numberToAccept < 0) {
        return res.status(500).send("Please provide a numberToAccept >= 0");
    }

    // Find all non-accepted Cornell students
    User.find({
        $and: [
            { "school.name": /Cornell University/g},
            { "internal.status": { $ne: "Accepted" } },
            { "internal.status": { $ne: "Rejected" } }
        ]
    }).exec((err, pendings) => {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }
        else {
            // Filter into sets for making decisions
            let notFemale = [];
            let female = [];
            pendings.forEach(function (user) {
                if (user.gender === "Female") {
                    female.push(user);
                }
                else {
                    notFemale.push(user);
                }
            });

            let accepted = [];
            while (accepted.length < req.body.numberToAccept && (female.length || notFemale.length)) {
                let _drawLottery = function (pool) {
                    if (pool.length > 0) {
                        let randomIndex = Math.floor((Math.random() * pool.length));
                        let winner = pool[randomIndex];
                        accepted.push(winner);
                        pool.splice(randomIndex, 1);
                    }
                };

                _drawLottery(female);
                if (accepted.length >= req.body.numberToAccept) {
                    break;
                }
                _drawLottery(notFemale);
            }

            // Save decisions
            async.parallel([
                (cb) => {
                    async.each(accepted, (curHacker, cb) => {
                        curHacker.internal.status = "Accepted";
                        curHacker.save(cb);
                    }, cb);
                },
                (cb) => {
                    async.each(notFemale, (curHacker, cb) => {
                        curHacker.internal.status = "Waitlisted";
                        curHacker.save(cb);
                    }, cb);
                },
                (cb) => {
                    async.each(female, (curHacker, cb) => {
                        curHacker.internal.status = "Waitlisted";
                        curHacker.save(cb);
                    }, cb);
                }
            ], (err) => {
                if (err) {
                    console.error("ERROR in lottery: " + err);
                    req.flash("error", "Error in lottery");
                    return res.redirect("/admin/dashboard");
                }
                else {
                    req.flash("success", `Lottery successfully performed. ${accepted.length} have been accepted.`);
                    return res.redirect("/admin/dashboard");
                }
            });
        }
    });
};

module.exports.cornellWaitlist = (req, res) => {
    // Find all non-accepted Cornell students
    if (!req.body.numberToAccept || req.body.numberToAccept <= 0) {
        return res.status(500).send("Need a positive numberToAccept");
    }

    User.find({
        $and: [
            { "internal.cornell_applicant": true },
            { "internal.status": { $ne: "Accepted" } },
            { "internal.status": { $ne: "Rejected" } }
        ]
    }).sort({ "created_at": "asc" }).exec((err, pendings) => {
        let numAccepted = 0;
        pendings.forEach((student) => {
            if (numAccepted < req.body.numberToAccept) {
                student.internal.status = "Accepted";
                numAccepted++;
            }
        });

        async.each(pendings, (student, cb) => {
            student.save(cb);
        }, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            req.flash("success", `Successfully moved ${numAccepted} students off the waitlist!`);
            return res.redirect("/admin/dashboard");
        });
    });
};
