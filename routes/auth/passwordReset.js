// Node Modules and utilities
const validator = require('../../library/validations.js');

// Mongo models
let User    = require("../../models/user");

/**
 * @api {GET} /resetpassword Returns page for resetting password.
 * @apiName ResetPassword
 * @apiGroup Auth
 */
function passwordResetGet (req, res) {
    if (req.query.token === undefined || req.query.token === "") {
        return res.redirect('/forgotpassword');
    }
    User.findOne({passwordtoken: req.query.token}, function (err, user) {
        if (user === null) {
            return res.redirect('/');
        }
        else {
            return res.render('forgotpassword/resetpass_prompt', {
                title: 'Reset Password',
                email: user.email
            });
        }
    });
}

/**
 * @api {POST} /resetpassword Updates a password, if query.token is valid
 * @apiName ResetPassword
 * @apiGroup Auth
 */
function passwordResetPost (req, res) {
    User.findOne({passwordtoken: req.query.token}, function (err, user) {
        if (user === null || req.query.token === "" || req.query.token === undefined) {
            return res.redirect('/');
        }
        else {
            req = validator.validate(req, [
                'password'
            ]);
            let errors = req.validationErrors();
            if (errors) {
                req.flash('error', 'Password is not valid. 6 to 25 characters required.');
                res.redirect('/resetpassword?token=' + req.query.token);
            }
            else {
                user.password = req.body.password;
                user.passwordtoken = "";
                user.save(function (err, doc) {
                    if (err) {
                        // If it failed, return error
                        console.log(err);
                        req.flash("error", "An error occurred. Your password has not been reset.");
                        return res.redirect('/forgotpassword');
                    }
                    else {
                        return res.render('forgotpassword/resetpass_done', {
                            title: 'Reset Password',
                            email: user.email
                        });
                    }
                });
            }
        }
    });
}

module.exports = {
    get:  passwordResetGet,
    post: passwordResetPost
};
