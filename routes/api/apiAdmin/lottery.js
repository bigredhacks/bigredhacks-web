const async = require("async");

let User = require("../../../models/user.js");

module.exports.cornellLottery = (req, res) => {
    if (!req.body.numberToAccept || req.body.numberToAccept < 0) {
        return res.status(500).send("Please provide a numberToAccept >= 0");
    }
    // Find all non-accepted Cornell students
    User.find({
        $and: [
            { "internal.cornell_applicant": true },
            { "internal.status": { $ne: "Accepted" } },
            { "internal.status": { $ne: "Rejected" } }
        ]
    }, function (err, pendings) {
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
                let _drawLottery = function _drawLottery(pool) {
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
                    accepted.forEach(curHacker => curHacker.internal.status = "Accepted");
                    return cb(null);
                },
                (cb) => {
                    notFemale.forEach(curHacker => curHacker.internal.status = "Waitlisted");
                    return cb(null);
                },
                (cb) => {
                    female.forEach(curHacker => curHacker.internal.status = "Waitlisted");
                    return cb(null);
                }
            ]);

            async.parallel([
                (cb) => {
                    async.each(accepted, function (user, callback) {
                        user.save(callback);
                    }, cb);
                },
                (cb) => {
                    async.each(notFemale, function (user, callback) {
                        user.save(callback);
                    }, cb);
                },
                (cb) => {
                    async.each(female, function (user, callback) {
                        user.save(callback);
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

module.exports.cornellWaitlist = (req, res, next) => {
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
    }).sort({ "created_at": "asc" }).exec(function (err, pendings) {
        let numAccepted = 0;
        pendings.forEach(function (student) {
            if (numAccepted < req.body.numberToAccept) {
                student.internal.status = "Accepted";
                numAccepted++;
            }
        });

        async.each(pendings, function (student, cb) {
            student.save(cb);
        }, function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            req.flash("success", "Successfully moved " + numAccepted + " students off the waitlist!");
            return res.redirect("/admin/dashboard");
        });
    });
};