// Node Modules and utilities
const _ = require("underscore");
const async = require("async");
const authHelp = require("../../util/helpers/auth");
const config = require('../../config.js');
const email = require('../../util/email');
const helper = require("../../util/routes_helper");
const multiparty = require('multiparty');

// Mongo Models
let enums = require('../../models/enum.js');
let User = require("../../models/user");

// Variables
const ALWAYS_OMIT = 'password confirmpassword'.split('');
const MAX_FILE_SIZE = 1024 * 1024 * 15;

/**
 * @api {GET} /register Get registration page based on current server configuration
 * @apiName Register
 * @apiGroup Auth
 */
function registerGet(req, res) {
    // return res.redirect("/");
    async.series({
        college: (cb) => {
            if (req.params && req.params.name) {
                //get full college object
                authHelp._findCollegeFromFilteredParam(req.params.name, function (err, college) {
                    if (college === null || err) {
                        //college does not exist, or not allowed
                        return cb(err || "College does not exist.");
                    }
                    else {
                        return cb(null, college);
                    }
                });
            }
            else {
                return cb(null, null);
            }
        }
    }, (err, result) => {
        if (!err) {
            let college = null, collegeName = null, collegeParam = null;
            if (req.params && req.params.name && result.college) {
                college = result.college;
                collegeName = result.college.name;
                collegeParam = req.params.name;
            }
            return res.render("register_general", {
                college: college,
                enums: enums,
                error: req.flash('error'),
                limit: config.admin.cornell_auto_accept,
                title: collegeName || "BigRed//Hacks | Register",
                urlparam: collegeParam,
                cornellOpen: config.admin.cornell_reg_open
            });
        }
        else {
            console.log(err);
            req.flash("error", "An error occurred while trying to register!");
            return res.redirect("/");
        }
    });
}

/**
 * @api {PUT} /register Register a new user
 * @apiName Register
 * @apiGroup Auth
 */
function registerPost(req, res) {
    async.waterfall([
        (cb) => {
            let sanitizedEmail = req.body.email ? req.body.email.trim().toLowerCase() : req.body.email;
            User.findOne({ email: sanitizedEmail }).exec((err, user) => {
                if (!err) {
                    if (typeof user !== "undefined" && user) {
                        return cb("A user with this email address has already registered!");
                    }
                    else {
                        return cb(null);
                    }
                }
                else {
                    return cb(err);
                }
            });
        },
        (cb) => {
            // Parse the resume
            const form = new multiparty.Form({ maxFilesSize: MAX_FILE_SIZE });
            form.parse(req, function (err, fields, files) {
                if (err) {
                    return cb(err);
                }
                else {
                    req.body = helper.reformatFields(fields);
                    req.files = files;
                    let resume = files.resume[0];
                    req = authHelp.validateAll(req);
                    let errors = req.validationErrors();
                    if (errors) {
                        let errorParams = errors.map(function (x) {
                            return x.param;
                        });
                        req.body = _.omit(req.body, errorParams.concat(ALWAYS_OMIT));
                        let returnErr = [req.body, errors];
                        return cb(returnErr);
                    }
                    else {
                        helper.uploadFile(resume, { type: "resume" }, (err, file) => {
                            if (!err && typeof file !== "string") {
                                return cb(null, file);
                            }
                            else {
                                return cb(err || file || "An unknown error occurred while uploading your resume.");
                            }
                        });
                    }
                }
            });
        },
        (resume, cb) => {
            // Get the user's college if exists as a parameter
            if (req.params && req.params.name) {
                //get full college object
                authHelp._findCollegeFromFilteredParam(req.params.name, function (err, college) {
                    if (college === null || err) {
                        //college does not exist, or not allowed
                        return cb(err || "College does not exist.");
                    }
                    else {
                        if (config.admin.cornell_reg_open !== true &&
                            (authHelp._isCornellian(college) || req.body.email.split("@")[1].split(".")[0] === "cornell")) {
                            return cb("We aren't accepting applications from Cornell University students right now. Subscribe to our email list for more info.");
                        }
                        else {
                            return cb(null, college, resume);
                        }
                    }
                });
            }
            else {
                if (config.admin.cornell_reg_open !== true &&
                    (req.body.email.split("@")[1].split(".")[0] === "cornell" || req.body.college.indexOf("Cornell University") !== -1)) {
                    return cb("We aren't accepting applications from Cornell University students right now. Subscribe to our email list for more info.");
                }
                else {
                    let college = {
                        _id: req.body.collegeid,
                        display: req.body.college
                    };
                    return cb(null, college, resume);
                }
            }
        },
        (college, resume, cb) => {
            // Create the user
            let newUser = new User({
                name: {
                    first: req.body.firstname,
                    last: req.body.lastname
                },
                email: req.body.email,
                password: req.body.password,
                gender: req.body.genderDropdown,
                phone: req.body.phonenumber,
                logistics: {
                    dietary: req.body.dietary,
                    tshirt: req.body.tshirt,
                    anythingelse: req.body.anythingelse
                },
                school: {
                    id: college._id,
                    name: college.display,
                    year: req.body.yearDropdown,
                    major: req.body.major
                },
                internal: {
                    cornell_applicant: authHelp._isCornellian(college)
                },
                app: {
                    github: req.body.github,
                    linkedin: req.body.linkedin,
                    resume: resume.filename,
                    hackathonsAttended: req.body.hackathonsAttended,
                    questions: {
                        q1: req.body.q1,
                        q2: req.body.q2,
                        hardware: req.body.hardware.split(",")
                    }
                },
                role: "user"
            });
            newUser.save((err, user) => {
                if (!err) {
                    return cb(null, college, user);
                }
                else {
                    return cb(err);
                }
            });
        },
        (college, newUser, cb) => {
            // Add to email lists
            async.parallel([
                (cb2) => {
                    // All Cornell students are on the waitlist when registering. The pending status
                    // means that nobody has been accepted yet, since once we run a lottery,
                    // all non-winners are moved onto waitlist.
                    helper.addSubscriber(config.mailchimp.l_applicants, req.body.email, req.body.firstname, req.body.lastname, (err, result) => {
                        if (err) {
                            console.log(err);
                        }
                        return cb2(null);
                    });
                },
                (cb2) => {
                    if (newUser.internal.cornell_applicant === true) {
                        helper.addSubscriber(config.mailchimp.l_cornell_applicants, newUser.email, newUser.name.first, newUser.name.last, (err, result) => {
                            if (err) {
                                console.log(err);
                            }
                            return cb2(null);
                        });
                    }
                    else {
                        return cb2(null);
                    }
                }
            ], (err) => {
                if (!err) {
                    req.login(newUser, (err) => {
                        if (!err) {
                            return cb(null, college, newUser);
                        }
                        else {
                            return cb(err);
                        }
                    });
                }
                else {
                    return cb(err);
                }
            });
        },
        (college, newUser, cb) => {
            // Send confirmation email
            const email_subject = "BigRed//Hacks Registration Confirmation";
            let template_content;
            let newUserEmail = newUser.email.split("@")[1].split(".")[0];
            if (newUserEmail === "cornell" || authHelp._isCornellian(college)) {
                template_content =
                    `<p>Hi ${newUser.name.full},</p>` +
                    `<p>Thank you for your interest in BigRed//Hacks! This email is a confirmation ` +
                    `that we have received your registration.</p>` +
                    `<p>You can log in to our website any time to view your status or update your resume.</p>` +
                    `<p>We will initially have a lottery to admit Cornell students. ` +
                    `<p>After that, Cornellians will be admitted off the waitlist in order of registration.</p>` +
                    `<p>If you haven't already, make sure to like us on <a href='https://www.facebook.com/bigredhacks/' target='_blank'>Facebook</a> and ` +
                    `follow us on <a href='https://twitter.com/bigredhacks'>Twitter</a>!</p>` +
                    `<p>Cheers,</p>` +
                    `<p>BigRed//Hacks Team </p>`;
            } else {
                template_content =
                    `<p>Hi ${newUser.name.full},</p>` +
                    `<p>Thank you for your interest in BigRed//Hacks! This email is a confirmation ` +
                    `that we have received your registration.</p>` +
                    `<p>You can log in to our website any time until the registration deadline ` +
                    `to update your information or add team members.</p>` +
                    `<p>If you haven't already, make sure to like us on <a href='https://www.facebook.com/bigredhacks/' target='_blank'>Facebook</a> and ` +
                    `follow us on <a href='https://twitter.com/bigredhacks'>Twitter</a>!</p>` +
                    `<p>Cheers,</p>` +
                    `<p>BigRed//Hacks Team </p>`;
            }
            const config = {
                "subject": email_subject,
                "from_email": "info@bigredhacks.com",
                "from_name": "BigRed//Hacks",
                "to": {
                    "email": newUser.email,
                    "name": newUser.name.full
                }
            };
            email.sendCustomEmail(template_content, config);
            return cb(null);
        }
    ], (err) => {
        if (!err) {
            req.flash("success", "Successfully registered!");
            return res.redirect('/user/dashboard');
        }
        else {
            console.error(err);
            req.flash("error", err);
            return res.render('register_general', {
                enums: enums,
                error: req.flash('error'),
                errors: err,
                input: req.body,
                title: "BigRed//Hacks | Register",
                cornellOpen: config.admin.cornell_reg_open
            });
        }
    });
}

module.exports = {
    get: registerGet,
    post: registerPost
};
