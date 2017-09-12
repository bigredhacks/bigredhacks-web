"use strict";

let User = require("../../../models/user.js");

module.exports.removeUser = (req, res) => {
    User.findOne({ pubid: req.body.pubid }, (err, user) => {
        if (err) {
            console.error(err);
            req.flash("error", "An error occurred while finding the user");
            return res.status(500).send(err);
        }
        else if (!user) {
            req.flash("error", "Cannot find user with this pubid");
            return res.status(500).send("User not found! ");
        }
        else {
            user.remove({ "pubid": req.body.pubid }, (err) => {
                if (err) {
                    console.error("Remove error: " + err);
                    return res.sendStatus(500);
                }
                else {
                    console.log("Success: removed user " + req.body.pubid);
                    req.flash("success", "Successfully removed user " + req.body.pubid);
                    res.sendStatus(200);
                }
            });
        }
    });
};

module.exports.setUserRole = (req, res) => {
    let sanitizedEmail = req.params.email
        ? req.params.email.trim().toLowerCase()
        : req.params.email;
    User.findOne({ email: sanitizedEmail }, (err, user) => {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.role = req.body.role.toLowerCase();
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

module.exports.setUserStatus = (req, res) => {
    User.findOne({ pubid: req.params.pubid }, function (err, user) {
        if (err || !user) {
            console.log("Error: " + err);
            return res.sendStatus(500);
        }
        else {
            user.internal.status = req.body.status;

            // Redirect to home page
            user.save((err) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                else {
                    return res.sendStatus(200);
                }
            });

        }
    });
};
