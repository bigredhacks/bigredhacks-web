let fs = require('fs');
let async = require('async');
let mongoose = require('mongoose');
let helper = require('../../util/routes_helper.js');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
    useMongoClient: true,
    /* other options */
});
let User = require('../../models/user.js');

function getContactInfo(callback) {
    let query = { "internal.status": "Accepted" };

    User.find(query, null, { "name.first": 1 }, function (err, users) {
        if (err) {
            console.error("Error getting users.");
        }
        else {
            console.log("Starting user dump.");
            // let stream = fs.createWriteStream("participant_info.csv");
            let result = [];
            result.push("First Name,Last Name,Email,Phone Number,Major,Gender,Year\r\n");
            result = result.concat(users.map(user => user.name.first + "," + user.name.last + "," + user.email + "," + user.phone + "," + user.school.major + "," + user.gender + "," + user.school.year + "\r\n"));
            console.log("Finished writing users: ");
            console.log(result);
            
            callback(null, encodeURI(result.join("")));
        }
    });
}

// Also includes GitHub and LinkedIn
function getContactInfoExtra(callback) {
    let query = { "internal.status": "Accepted" };

    User.find(query, null, { "name.first": 1 }, function (err, users) {
        if (err) {
            console.error("Error getting users.");
        }
        else {
            console.log("Starting user dump.");
            // let stream = fs.createWriteStream("participant_info.csv");
            let result = [];
            result.push("First Name,Last Name,Email,Phone Number,Major,Gender,Year,GitHub,LinkedIn\r\n");
            result = result.concat(users.map(user => user.name.first + "," + user.name.last + "," + user.email + "," + user.phone + "," + user.school.major + "," + user.gender + "," + user.school.year + "," + (user.app.github ? "https://github.com/" + user.app.github : "") + "," + user.app.linkedin + "\r\n"));
            console.log("Finished writing users: ");
            console.log(result);
            
            callback(null, encodeURI(result.join("")));
        }
    });
}

/**
 * @api {GET} /admin/sponsors Sponsor related information
 * @apiName UserRoles
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        contactInfo: getContactInfo,
        deluxeContactInfo: getContactInfoExtra
    }, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500); // Do not expose error to users
        }

        return res.render('admin/sponsors', {
            title: 'Admin Dashboard - Sponsors',
            contactInfo: result.contactInfo,
            deluxeContactInfo: result.deluxeContactInfo
        });
    });
};
