const async = require("async");
const util  = require("../../../util/util.js");

let Bus     = require("../../../models/bus.js");
let User    = require("../../../models/User.js");

module.exports.deleteBusCaptain = (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(500).send("Missing email");
    }
    else {
        async.waterfall([
            (cb) => {
                async.parallel({
                    captain: function (callback) {
                        User.findOne({ "email": email }, callback);
                    },
                    bus: function (callback) {
                        Bus.findOne({ "captain.email": email }, callback);
                    }
                }, (err, results) => {
                    return cb(err, results.captain, results.bus);
                });
            },
            (captain, bus, cb) => {
                if (!bus || !captain) {
                    return res.status(500).send("Could not find bus or captain");
                }
                else {
                    bus.captain.name = null;
                    bus.captain.email = null;
                    bus.captain.college = null;
                    bus.captain.id = null;

                    captain.internal.busCaptain = false;

                    async.parallel([
                        (cb) => {
                            captain.save(cb);
                        },
                        (cb) => {
                            bus.save(cb);
                        }
                    ], cb);
                }
            }
        ], (err) => {
            if (err) {
                if (typeof err === "string") {
                    return res.status(500).send(err);
                }
                else {
                    console.error(err);
                    return res.sendStatus(500);
                }
            }
            else {
                return res.redirect("/admin/businfo");
            }
        });
    }
};

module.exports.busConfirmationHandler = (confirm) => {
    return (req, res) => {
        Bus.findOne({ _id: req.body.busid }, (err, bus) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            else if (!bus) {
                return res.status(500).send("Bus not found!");
            }

            bus.confirmed = confirm;
            bus.save(util.dbSaveCallback(res));
        });
    };
};

module.exports.deleteBusOverride = (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(500).send("Missing email");
    }

    User.findOne({ "email": email }, (err, user) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else if (!user) {
            return res.status(500).send("No such user");
        }
        if (user.internal.busid) {
            // User has already RSVP'd for a bus, undo this
            let fakeRes = {};
            fakeRes.sendStatus = function (status) {
            }; // FIXME: Refactor to not use a void function
            util.removeUserFromBus(Bus, req, fakeRes, user);
        }

        user.internal.busOverride = null;
        user.save(util.dbSaveCallback(res));
    });
};


module.exports.removeBus = (req, res) => {
    Bus.remove({ _id: req.body.busid }, (err) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else {
            return res.sendStatus(200);
        }
    });
};

module.exports.setBusCaptain = (req, res) =>  {
    const email     = req.body.email;
    const routeName = req.body.routeName;

    if (!email || !routeName) {
        return res.sendStatus(500);
    }

    async.waterfall([
        (cb) => {
            async.parallel({
                captain: function (callback) {
                    User.findOne({ "email": email }, callback);
                },
                bus: function (callback) {
                    Bus.findOne({ "name": routeName }, callback);
                }
            }, (err, results) => {
                return cb(err, results.captain, results.bus);
            });
        },
        //res.status(500).send('User has not signed up for that bus');
        (captain, bus, cb) => {
            if (bus.captain.name) {
                return cb("Bus already has a captain");
            }
            else if (captain && captain.internal.busid !== bus.id) {
                return cb("User has not signed up for that bus");
            }
            else {
                bus.captain.name    = `${captain.name.first} ${captain.name.last}`;
                bus.captain.email   = captain.email;
                bus.captain.college = captain.school.name;
                bus.captain.id      = captain.id;

                captain.internal.busCaptain = true;

                async.parallel([
                    (cb) => {
                        captain.save(cb);
                    },
                    (cb) => {
                        bus.save(cb);
                    }
                ], cb);
            }
        }
    ], (err) => {
        if (err) {
            if (typeof err === "string") {
                return res.status(500).send(err);
            }
            else {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        else {
            return res.redirect("/admin/businfo");
        }
    });
};

module.exports.setBusOverride = (req, res) => {
    const email = req.body.email;
    const routeName = req.body.routeName;

    if (!email || !routeName) {
        return res.status(500).send("Missing email or route name");
    }

    User.findOne({ "email": email }, function (err, user) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else if (!user) {
            return res.status(500).send("No such user");
        }

        if (user.internal.busid) {
            // User has already RSVP'd for a bus, undo this
            let fakeRes = {};
            fakeRes.sendStatus = function (status) {
            }; // FIXME: Refactor to not use a void function
            util.removeUserFromBus(Bus, req, fakeRes, user);
        }

        // Confirm bus exists
        Bus.findOne({ name: req.body.routeName }, function (err, bus) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            else if (!bus) {
                return res.status(500).send("No such bus route");
            }
            else {
                user.internal.busOverride = bus._id;
                user.save(util.dbSaveCallback(res));
            }
        });
    });
};

module.exports.updateBus = (req, res) => {
    Bus.findOne({ _id: req.body.busid }, (err, bus) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else {
            bus.name          = req.body.busname; //bus route name
            bus.stops         = req.body.stops;
            bus.capacity      = parseInt(req.body.buscapacity);
            bus.customMessage = req.body.customMessage;
            bus.save((err) => {
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
