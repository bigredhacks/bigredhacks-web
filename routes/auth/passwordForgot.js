const email = require('../../util/email');
const uid   = require("uid2");

// Mongo models
let User    = require("../../models/user");

/**
 * @api {GET} /forgotpassword Returns page for resetting password.
 * @apiName Register
 * @apiGroup Auth
 */
function forgotPasswordGet (req, res) {
    res.render('forgotpassword/forgotpass_prompt', {
        title: 'Reset Password',
        user: req.user,
        email: req.flash('email')
    });
}

/**
 * @api {POST} /forgotpassword Sends a forgotpassword email, if the email is valid.
 * @apiName ForgotPassword
 * @apiGroup Auth
 */
function forgotPasswordPost (req, res) {
    let sanitizedEmail = req.body.email ? req.body.email.trim().toLowerCase() : req.body.email;
    User.findOne({email: sanitizedEmail}, function (err, user) {
        if (user === null) {
            req.flash('error', 'No account is associated with that email.');
            res.redirect('/forgotpassword');
        }
        else {
            //fixme possible header error (promises?)
            res.render('forgotpassword/forgotpass_done', {
                title: 'Reset Password',
                user: req.user,
                email: user.email
            });
            user.passwordtoken = uid(15);
            user.save(function (err, doc) {
                if (err) {
                    // If it failed, return error
                    console.err(err);
                    req.flash("error", "An error occurred.");
                    res.redirect('/forgotpassword');
                }
                else {
                    const passwordreseturl = `${req.protocol}://${req.get('host')}/resetpassword?token=${user.passwordtoken}`;
                    const template_content =
                        `<p>Hello ${user.name.first} ${user.name.last},</p>` +
                        `<p>You can reset your password by visiting the following link:</p>` +
                        `<p><a style='color: #B31B1B' href='${passwordreseturl}'>${passwordreseturl}</a></p>` +
                        `<p>If you did not request to change your password, please ignore and delete this email.</p>` +
                        `<p>Cheers,</p>` +
                        `<p>BigRed//Hacks Team </p>`;
                    const config = {
                        "subject": "BigRed//Hacks Password Reset",
                        "from_email": "info@bigredhacks.com",
                        "from_name": "BigRed//Hacks",
                        "to": {
                            "email": user.email,
                            "name": `${user.name.first} ${user.name.last}`,
                        }
                    };
                    email.sendCustomEmail(template_content, config);
                }
            });
        }
    });
}

module.exports = {
    get:  forgotPasswordGet,
    post: forgotPasswordPost
};
