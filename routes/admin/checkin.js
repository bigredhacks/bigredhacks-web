/**
 * @api {GET} /admin/checkin Sign in page for checking in people.
 * @apiName CheckIn
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    return res.render('admin/checkin');
};
