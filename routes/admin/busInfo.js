// Node Modules and utilities
const async = require("async");

// Mongo models
let   Bus   = require('../../models/bus.js');
let   User  = require('../../models/user.js');

/**
 * @api {GET} /admin/businfo page to see bus information
 * @apiName BusInfo
 * @apiGroup AdminAuth
 */
function busInfoGet (req, res, next) {
    Bus.find().exec((err, buses) => {
        if (err) {
            console.log(err);
        }
        let _buses = [];
        async.each(buses, (bus, callback) => {
            async.each(bus.members, (member, callback2) => {
                // Confirm that all riding users are valid when returning results
                User.findOne({_id: member.id}, (err, user) => {
                    if (err) {
                        console.log(err);
                    }
                    callback2();
                });
            }, (err) => {
                _buses.push(bus);
                callback();
            });
        }, (err) => {
            User.find({"internal.busOverride": {$ne: null}}, (err, users) => {
                if (err) {
                    console.error(err);
                }

                let overrideUsers = [];
                // Setup an array of users with bus overrides
                users.forEach((user) => {
                    let info = {};
                    info.name = user.name.full;
                    info.school = user.school.name;
                    info.email = user.email;
                    info.route = "error";

                    for (let i = 0; i < _buses.length; i++) {
                        let route = _buses[i];
                        // _id has a non-string type, so coercing is required here
                        if (route._id + "" === user.internal.busOverride + "") {
                            info.route = route.name;
                            break;
                        }
                    }

                    overrideUsers.push(info);
                });
                return res.render('admin/businfo', {
                    title: 'Admin Dashboard - Bus Information',
                    buses: _buses,
                    overrides: overrideUsers
                });
            });
        });
    });
}

/**
 * @api {POST} /admin/businfo add new bus to list of buses
 * @apiName BusInfo
 * @apiGroup AdminAuth
 */
function busInfoPost (req, res, next) {
    //todo clean this up so that college ids and names enter coupled
    const errorMap = {
        busname: "Bus Name",
        collegeidlist: "College IDs",
        collegenamelist: "Bus Stops",
        buscapacity: "Bus Capacity"
    };

    const bodyKeys = Object.keys(req.body);
    for (let i = 0; i < bodyKeys.length; i++) {
        let curItem = req.body[bodyKeys[i]];
        if (curItem.length === 0) {
            req.flash("error", `Please enter the ${errorMap[bodyKeys[i]]} field.`);
            return res.redirect('/admin/businfo');
        }
    }

    let collegeidlist = req.body.collegeidlist.split(",");
    let collegenamelist = req.body.collegenamelist.split(",");
    let stops = [];
    if (collegeidlist.length !== collegenamelist.length) {
        console.error("Error: Cannot create bus route when colleges do not match!");
        console.log(collegeidlist, collegenamelist);
        return res.sendStatus(500);
    }
    for (let i = 0; i < collegeidlist.length; i++) {
        stops.push({
            collegeid: collegeidlist[i],
            collegename: collegenamelist[i]
        });
    }
    let newBus = new Bus({
        name: req.body.busname, //bus route name
        stops: stops,
        capacity: parseInt(req.body.buscapacity),
        members: []
    });
    newBus.save((err) => {
        if (err) console.log(err);
        res.redirect('/admin/businfo');
    });
}

module.exports = {
    busInfoGet:  busInfoGet,
    busInfoPost: busInfoPost
};
