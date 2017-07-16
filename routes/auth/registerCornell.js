//TODO: Deprecate this file, merge with register.js

// Node Modules and utilities
const _          = require("underscore");
const async      = require("async");
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
 * @api {GET} /register/:name GET registration page for Cornell (University and Tech) Students.
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam name The name of the school being used for registration.
 */
function registerCornellGet (req, res) {
    //get full college object
    authHelp._findCollegeFromFilteredParam(req.params.name, function (err, college) {

        if (college === null) {
            //college does not exist, or not allowed
            return res.redirect('/');
        }
        else {
            res.render("register_cornell", {
                urlparam: req.params.name,
                title: college.name + " Registration",
                enums: enums,
                error: req.flash('error'),
                limit: config.admin.cornell_auto_accept,
                college: college
            });
        }
    });
}

/**
 * @api {POST} /register/:name register a new user from a specific school
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiParam name The name of the school being used for registration.
 * todo cleanup with async waterfall
 */
function registerCornellPost (req, res) {
    //get full college object
    authHelp._findCollegeFromFilteredParam(req.params.name, function (err, college) {

        if (err || college === null) {
            //college does not exist, or not allowed
            console.error(err);
            req.flash('error', "An error occurred.");
            return res.redirect('/');
        }

        const form = new multiparty.Form({maxFilesSize: MAX_FILE_SIZE});
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
                req.flash('error', "Error parsing form.");
                return res.redirect('/register/' + req.params.name);
            }
            req.body = helper.reformatFields(fields);
            req.files = files;
            let resume = files.resume[0];
            req = authHelp._validateCornell(req);
            let errors = req.validationErrors();
            if (errors) {
                let errorParams = errors.map(function (x) {
                    return x.param;
                });
                req.body = _.omit(req.body, errorParams.concat(ALWAYS_OMIT));
                res.render('register_cornell', {
                    urlparam: req.params.name,
                    limit: config.admin.cornell_auto_accept,
                    title: 'Register',
                    message: 'The following errors occurred',
                    errors: errors,
                    input: req.body,
                    enums: enums,
                    college: college
                });
            }
            else {
                helper.uploadFile(resume, {type: "resume"}, function (err, file) {
                    if (err) {
                        console.log(err);
                        req.flash('error', "File upload failed. :(");
                        return res.redirect('/register/' + req.params.name);
                    }
                    if (typeof file === "string") {
                        req.flash('error', file);
                        return res.redirect('/register/' + req.params.name);
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
                            resume: file.filename,
                            hackathonsAttended: req.body.hackathonsAttended,
                            questions: {
                                q1: req.body.q1,
                                q2: req.body.q2,
                                //hardware: req.body.hardware.split(",")
                            }
                        },
                        role: "user"
                    });

                    newUser.save(function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            console.log(err);
                            req.flash("error", "An error occurred.");
                            return res.redirect('/register/' + req.params.name);
                        } else {
                            async.parallel([
                                (cb2) => {
                                    // All Cornell students are on the waitlist when registering. The pending status
                                    // means that nobody has been accepted yet, since once we run a lottery,
                                    // all non-winners are moved onto waitlist.
                                    helper.addSubscriber(config.mailchimp.l_cornell_waitlisted, newUser.email, newUser.name.first, newUser.name.last, cb2);
                                },
                                (cb2) => {
                                    helper.addSubscriber(config.mailchimp.l_cornell_applicants, newUser.email, newUser.name.first, newUser.name.last, cb2);
                                }
                            ], function (err) {
                                if (err) {
                                    console.error(err);
                                }

                                //send email and redirect to home page
                                req.login(newUser, function (err) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    const email_subject = "BigRed//Hacks Registration Confirmation";
                                    let template_content;
                                    if (authHelp._isCornellian(college)) {
                                        template_content =
                                            `<p>Hi ${newUser.name.full},</p>` +
                                            `<p>Thank you for your interest in BigRed//Hacks! This email is a confirmation ` +
                                            `that we have received your registration.</p>` +
                                            `<p>You can log in to our website any time to view your status or update your resume.</p>` +
                                            `<p>We will initially have a lottery to admit Cornell students. After that, Cornellians` +
                                            `<p>will be admitted off the waitlist in order of registration.</p>` +
                                            `<p>If you haven't already, make sure to like us on <a href='https://www.facebook.com/bigredhacks/' target='_blank'>Facebook</a> and ` +
                                            `follow us on <a href='https://twitter.com/bigredhacks'>Twitter</a>!</p>` +
                                            `<p>Cheers,</p>` +
                                            `<p>BigRed//Hacks Team </p>`;

                                    } else {
                                        template_content =
                                            `<p>Hi ${newUser.name.full},</p>` +
                                            `<p>Thank you for your interest in BigRed//Hacks!  This email is a confirmation ` +
                                            `that we have received your registration.</p>` +
                                            `<p>You can log in to our website any time to view your status or update ` +
                                            `your resume. We will notify you if you are removed from the waitlist.</p>` +
                                            `<p>If you haven't already, make sure to like us on Facebook and ` +
                                            `follow us on Twitter!</p>` +
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
                                    return res.redirect('/user/dashboard');
                                });
                            });
                        }
                    });
                });
            }
        });
    });
}

module.exports = {
    get:  registerCornellGet,
    post: registerCornellPost
};
