"use strict";

const async    = require("async");
const mongoose = require("mongoose");
let Team       = require("../../../models/team.js");

module.exports.setTeamStatus = (req, res) => {
    const id = mongoose.Types.ObjectId(req.params.teamid);
    Team.findById(id, (err, team) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else if (!team) {
            console.log("No such team found.");
            return res.sendStatus(500);
        }
        else {
            team.populate("members.id", (err, team) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                else {
                    async.each(team.members, (user, callback) => {
                        user = user.id;
                        user.internal.status = req.body.status;
                        user.save(callback);
                    }, function (err) {
                        if (err) {
                            console.log(err);
                            return res.sendStatus(500);
                        }
                        else return res.sendStatus(200);
                    });
                }
            });
        }
    });
};
