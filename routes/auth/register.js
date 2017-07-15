// Node Modules and utilities
const _          = require("underscore");
const authHelp   = require("../../util/helpers/auth");
const config     = require('../../config.js');
const email      = require('../../util/email');
const helper     = require("../../util/routes_helper");
const multiparty = require('multiparty');

// Mongo Models
let enums   = require('../../models/enum.js');
let User    = require("../../models/user");

// Variables
const ALWAYS_OMIT = 'password confirmpassword'.split('');
const MAX_FILE_SIZE = 1024 * 1024 * 15;

/**
 * @api {GET} /register Get registration page based on current server configuration
 * @apiName Register
 * @apiGroup Auth
 */
function registerGet (req, res) {
    res.render("register_general", {
        title: "Register",
        enums: enums,
        error: req.flash('error')
    });
}

/**
 * @api {PUT} /register Register a new user
 * @apiName Register
 * @apiGroup Auth
 */
function registerPost (req, res) {
    const form = new multiparty.Form({maxFilesSize: MAX_FILE_SIZE});
    form.parse(req, function (err, fields, files) {
        if (err) {
            console.log(err);
            req.flash('error', "Error parsing form.");
            return res.redirect('/register');
        }

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
            console.log(errors);
            req.flash('error', 'The following errors occurred:');
            res.render('register_general', {
                title: 'Register',
                errors: errors,
                input: req.body,
                enums: enums
            });
        }
        else {
            helper.uploadFile(resume, {type: "resume"}, function (err, file) {
                if (err) {
                    console.log(err);
                    req.flash('error', "File upload failed. :(");
                    return res.redirect('/register');
                }
                if (typeof file === "string") {
                    req.flash('error', file);
                    return res.redirect('/register');
                }

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
                        id: req.body.collegeid,
                        name: req.body.college,
                        year: req.body.yearDropdown,
                        major: req.body.major
                    },
                    app: {
                        github: req.body.github,
                        linkedin: req.body.linkedin,
                        resume: file.filename,
                        questions: {
                            q1: req.body.q1,
                            q2: req.body.q2,
                            hardware: req.body.hardware.split(",")
                        },
                        hackathonsAttended: req.body.hackathonsAttended
                    },
                    role: "user"
                });

                // Set user as admin if designated in config for easy setup
                if (newUser.email === config.admin.email) {
                    newUser.role = "admin";
                }

                newUser.save(function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        console.log(err);
                        req.flash("error", "An error occurred.");
                        res.render('register_general', {
                            title: 'Register', error: req.flash('error'), input: req.body, enums: enums
                        });
                    }
                    else {
                        helper.addSubscriber(config.mailchimp.l_applicants, req.body.email, req.body.firstname, req.body.lastname, function (err, result) {
                            if (err) {
                                // TODO: If this happens, the user wasn't added to the listserv. This is probably okay
                                // Since the email is probably fake anyway, but the user IS still registered.
                                // console.log(err);
                            }
                            else {
                                // console.log(result);
                            }

                            //send email and redirect to home page
                            req.login(newUser, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                                const email_body =
                                    `<p>Hi ${newUser.name.first} ${newUser.name.last},</p>` +
                                    `<p>Thank you for your interest in BigRed//Hacks! This email is a confirmation ` +
                                    `that we have received your registration.</p>` +
                                    `<p>You can log in to our website any time until the registration deadline ` +
                                    `to update your information or add team members.</p>` +
                                    `<p>If you haven't already, make sure to like us on <a href='https://www.facebook.com/bigredhacks/' target='_blank'>Facebook</a> and ` +
                                    `follow us on <a href='https://twitter.com/bigredhacks'>Twitter</a>!</p>` +
                                    `<p>Cheers,</p>` +
                                    `<p>BigRed//Hacks Team </p>`;

                                const config = {
                                    "subject": "BigRed//Hacks Registration Confirmation",
                                    "from_email": "info@bigredhacks.com",
                                    "from_name": "BigRed//Hacks",
                                    "to": {
                                        "email": newUser.email,
                                        "name": newUser.name.first + " " + newUser.name.last,
                                    }
                                };
                                email.sendCustomEmail(email_body, config);
                                res.redirect('/user/dashboard');
                            });
                        });
                    }
                });
            });
        }
    });
}

module.exports = {
    get:  registerGet,
    post: registerPost
};