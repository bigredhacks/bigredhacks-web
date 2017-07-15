const config = require('../../config.js');
let   User   = require('../../models/user.js');

/**
 * @api {GET} /admin/settings Settings page to set user roles.
 * @apiName UserRoles
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    //todo change to {role: {$ne: "user"}} in 2016 deployment
    User.find({$and: [{role: {$ne: "user"}}, {role: {$exists: true}}]}).sort('name.first').exec((err, users) => {
        if (err) {
            console.log(err);
        }

        //add config admin to beginning
        let configUser = {};
        configUser.email = config.admin.email;
        users.unshift(configUser);

        return res.render('admin/settings', {
            title: 'Admin Dashboard - Settings',
            users: users,
            params: req.query
        });
    });
};
