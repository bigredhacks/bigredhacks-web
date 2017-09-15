"use strict";
/**
 * Common helper functions
 */

var async = require("async");
var icalendar = require("icalendar");
var request = require("request");
var config = require("../config");
var moment = require("moment");
var util = {};

// Callback for most saves
util.dbSaveCallback = function (res) {
    return (function(err) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        return res.sendStatus(200);
    });
};

/**
 * Removes user from its current bus, factored out for reuse
 * @param user
 */
util.removeUserFromBus = (Bus, req, res,user) => {
    Bus.findOne({_id: req.body.busid}, function (err, bus) {
        if (user.internal.busid === req.body.busid) {
            user.internal.busid = null;
            var newmembers = [];
            // Remake user list without the user being removed included
            async.each(bus.members, function (member, callback) {
                if (member.id !== user.id) {
                    newmembers.push(member);
                }

                callback();
            }, (err) => {
                bus.members = newmembers;
                bus.save(function (err) {
                    if (err) {
                        console.error(err);
                        return res.sendStatus(500);
                    }
                    else {
                        user.save(function (err) {
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
            });
        }
        else {
            user.internal.busid = null;
            user.save(function (err) {
                if (err) {
                    return res.sendStatus(500);
                }
                else {
                    return res.sendStatus(200);
                }
            });
        }
    });
};

// 3 minute cache
const CACHE_EXPIRATION_IN_MILLIS = 1000 * 60 * 3;
// Last grabbed calendar
var cachedCalendar = null;

function updateCached(up) {
    cachedCalendar = up;
}

// Date of when calendar was last updated
var lastCalendarUpdate = null;
/**
 * Returns a sorted calendar (see APIdoc in api.js). Uses a simple cache
 * to reduce load on ical source.
 */
util.grabCalendar = function grabCalendar(callback) {
    if (!lastCalendarUpdate || lastCalendarUpdate < Date.now() - CACHE_EXPIRATION_IN_MILLIS) {
        // This serves as a lock so that we do not repeat requests. While this occurs, stale calendar data will
        // be fed temporarily to subsequent requests.
        lastCalendarUpdate = Date.now();
        request(config.setup.ical, (err, response, ical) => {
            if (err) {
                return callback(err);
            }
            else if (response.statusCode !== 200) {
                return callback("ERROR: Bad response on calendar request!");
            }
            else {
                let calendar = icalendar.parse_calendar(ical);

                let calendarEvents = calendar.events().map(element => {
                    console.log(element.properties.SUMMARY[0].value);
                    console.log("string");
                    console.log(element.properties.DTSTART[0].value, element.properties.DTEND[0].value);
                    console.log("date:");
                    console.log(new Date(element.properties.DTSTART[0].value), new Date(element.properties.DTEND[0].value));
                    console.log("==");
                    return {
                        description: element.properties.DESCRIPTION[0].value,
                        end:         Date.parse(new Date(element.properties.DTEND[0].value)),
                        event:       element.properties.SUMMARY[0].value,
                        location:    element.properties.LOCATION[0].value,
                        start:       Date.parse(new Date(element.properties.DTSTART[0].value)),
                    };
                });

                calendarEvents = calendarEvents.sort((x,y) => {
                    return x.start < y.start
                        ? -1
                        : x.start> y.start
                            ? 1
                            : 0;
                });

                // Update cache
                updateCached(calendarEvents);
                return callback(null, calendarEvents);
            }
        });
    }
    else {
        callback(null, cachedCalendar);
    }
};

/**
 * TODO: Refactor routes/user.js to reuse this function
 * Return distance in miles between two coordinates/points
 * @param coordinate1 [lon,lat] coordinate pair of first point
 * @param coordinate2 [lon,lat] coordinate pair of second point
 * @returns {number} represents distance in miles between the two colleges
 */
util.distanceBetweenPointsInMiles = function distanceBetweenPointsInMiles(coordinate1, coordinate2) {
    let radius = 3958.754641; // Radius of the earth in miles
    let dLat = (Math.PI / 180) * (coordinate2[1] - coordinate1[1]);
    let dLon = (Math.PI / 180) * (coordinate2[0] - coordinate1[0]);
    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((Math.PI / 180) * (coordinate1[1])) *
        Math.cos((Math.PI / 180) * (coordinate2[1])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = radius * c; // Distance in miles
    return distance;
};

// Calculates reimbursement using the ordering: user-override => school-override => default
util.calculateReimbursement = function calculateReimbursement(reimbursements, user, rsvpOnly) {
    // Checks through per-school reimbursements to see if user matches any of those schools
    let _filterSchoolReimbursement = function _filterSchoolReimbursement(user) {
        for (let i = 0; i < reimbursements.length; i++) {
            let x = reimbursements[i];
            if (x.college.id === user.school.id) {
                return x.amount;
            }
        }

        return -1;
    };

    if (user.internal.going === false || (rsvpOnly && !user.internal.going)) {
        return 0;
    }

    if (user.internal.reimbursement_override > 0) {
        return user.internal.reimbursement_override;
    }

    let school_override = _filterSchoolReimbursement(user);
    return (school_override === -1) ? Number(config.admin.default_reimbursement) : school_override;
};

module.exports = util;