const config = require('../../config.js');

/**
 * @api {GET} /login Render the login page.
 * @apiName Login
 * @apiGroup Auth
 */
function loginGet (req, res, next) {
    res.render('login', {
        title: 'Login',
        user: req.user
    });
}

/**
 * @api {POST} /login Login a user
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam user.role 'admin' if user is trying to login as admin
 * @apiParam user.email Email for login
 */
function loginPost (req, res) {
    // successful auth, user is set at req.user.  redirect as necessary.
    if (req.user.role === "admin" || req.user.email === config.admin.email) {
        req.session.np = true; //enable no participation mode
        return res.redirect('/admin');
    }
    else if (req.user.role === "mentor") {
        return res.redirect('/mentor/dashboard');
    }
    else {
        return res.redirect('/user');
    }
}

module.exports = {
    get:  loginGet,
    post: loginPost
};