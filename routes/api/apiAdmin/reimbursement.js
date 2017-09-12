"use strict";

const async = require("async");

let Reimbursements = require("../../../models/reimbursements.js");
let User           = require("../../../models/user.js");

module.exports.schoolReimbursementsDelete = (req, res) => {
    Reimbursements.remove({ "college.id": req.body.collegeid }, (err) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else {
            return res.sendStatus(200);
        }
    });
};

module.exports.schoolReimbursementsPatch = (req, res) => {
    Reimbursements.findOne({ "college.id": req.body.collegeid }, (err, rem) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else if (res === null) {
            return res.sendStatus(404);
        }
        else {
            rem.mode   = req.body.travel;
            rem.amount = req.body.amount;
            rem.save(function (err) {
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

module.exports.schoolReimbursementsPost = (req, res) => {
    async.waterfall([
        (cb) => {
            Reimbursements.findOne({ "college.id": req.body.collegeid }, (err, rem) => {
                if (err) {
                    return cb(err);
                }
                else if (rem) {
                    return cb("Entry already exists.");
                }
                else {
                    return cb(null);
                }
            });
        },
        (cb) => {
            let newRem = new Reimbursements({
                college: {
                    id: req.body.collegeid,
                    name: req.body.college
                },
                mode: req.body.travel,
                amount: req.body.amount
            });
            newRem.save(cb);
        }
    ], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        else {
            return res.sendStatus(200);
        }
    });
};

module.exports.studentReimbursementsDelete = (req, res) => {
    if (!req.body.email) {
        return res.status(500).send("Email required");
    }

    let sanitizedEmail = req.body.email.trim().toLowerCase();
    User.findOne({ email: sanitizedEmail }, (err, user) => {
        if (err) {
            console.log(`ERROR on delete: ${err}`);
            res.status(500).send("Error on delete: " + err);
        }
        else if (!user) {
            res.status(500).send("No such user");
        }
        else {
            user.internal.reimbursement_override = 0;
            user.save((err) => {
                if (err) {
                    console.log(`Error saving user: ${err}`);
                    res.status(500).send(`Error saving user: ${err}`);
                }
                else {
                    res.sendStatus(200);
                }
            });
        }
    });
};

module.exports.studentReimbursementsPost = (req, res) => {
    let sanitizedEmail = req.body.email
        ? req.body.email.trim().toLowerCase()
        : req.body.email;
    User.findOne({ email: sanitizedEmail }, (err, user) => {
        if (err) {
            console.log(`Reimbursement Error: ${err}`); // If null, check amount
            res.status(500).send(`Reimbursement Error: ${err}`);
        }
        else if (!req.body.amount || req.body.amount < 0) {
            res.status(500).send("Missing amount or amount is less than zero");
        }
        else if (!user) {
            res.status(500).send("No such user");
        }
        else {
            user.internal.reimbursement_override = req.body.amount;
            user.save((err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Could not save user");
                }
                else {
                    res.sendStatus(200);
                }
            });
        }
    });
};
