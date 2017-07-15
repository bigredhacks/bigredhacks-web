/**
 * @api {GET} /admin Get home page.
 * @apiName Index
 * @apiGroup AdminAuth
 */
module.exports = function (req, res, next) {
    return res.redirect('/admin/dashboard');
};
