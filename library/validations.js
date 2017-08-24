/**
 * Contains reusable backend validations
 * Some notes:
 * - try to keep naming consistent with field names
 **/


let validator = function () {
    let validators = {
        email: function (req) {
            req.assert('email', 'Email address is not valid.').isEmail().len(1,500);
        },
        password: function (req) {
            req.assert('password', "Password is not valid. 6 to 25 characters required.").len(6, 25);
        },
        passwordOptional: function (req) {
            req.assert('password', "Password is not valid. 6 to 25 characters required.").optionalOrLen(6, 25);
        },
        firstname: function (req) {
            req.assert('firstname', 'First name is required.').notEmpty().len(1,40);
        },
        lastname: function (req) {
            req.assert('lastname', 'Last name is required.').notEmpty().len(1,40);
        },
        phonenumber: function (req) {
            req.body.phonenumber = req.body.phonenumber.replace(/-/g, '');
            req.assert('phonenumber', 'Please enter a valid US phone number.').isMobilePhone('en-US');
        },
        major: function (req) {
            req.assert('major', 'Major is required.').len(1, 50);
        },
        genderDropdown: function (req) {
            req.assert('genderDropdown', 'Gender is required.').notEmpty();
        },
        dietary: function (req) {
            req.assert('dietary', 'Please specify dietary restrictions.').notEmpty();
        },
        tshirt: function (req) {
            req.assert('tshirt', 'Please specify a t-shirt size.').notEmpty();
        },
        linkedin: function (req) {
            req.assert('linkedin', 'LinkedIn URL is not valid.').optionalOrisURL();
        },
        collegeid: function (req) {
            req.assert('collegeid', 'Please specify a school.').notEmpty();
        },
        q1: function (req) {
            req.assert('q1', 'Question 1 must be less than 5000 characters.').len(1,5000);
        },
        q2: function (req) {
            req.assert('q2', 'Question 2 must be less than 5000 characters.').len(1,5000);
        }, //fixme refine this
        yearDropdown: function (req) {
            req.assert('yearDropdown', 'Please specify a graduation year.').notEmpty();
        },
        hackathonsAttended: function (req) {
            req.assert('hackathonsAttended', 'Please specify the number of hackathons you have attended.').notEmpty();
        },
        cornellEmail: function (req) {
            req.assert('cornellEmail', 'Email address is not valid.').isEmail();
        },
        anythingelse: function(req) {
            req.assert('anythingelse', "Additional information must be less than 5000 characters.").optionalOrLen(0, 5000);
        },
        hardware: function(req) {
            req.assert('hardware', "That's a bit too much hardware for us.").len(0,500);
        },
        company: function (req) {
            req.assert('company', 'Please specify your company name.').notEmpty();
        },
        skills: function (req) {
            req.assert('skills', 'Please specify your skills as a comma-separated list.').notEmpty();
        },
        bio: function (req) {
            req.assert('bio', 'Please specify your biography.').notEmpty();
        },
    };


    /**
     * runs an array of validations
     * @param req
     * @param validations
     * @returns {runValidations}
     */
    let validate = function validate(req, validations) {
        for (let i = 0; i < validations.length; i++) {
            if (!validators.hasOwnProperty(validations[i])) {
                console.log("Error: validation ", validations[i], "does not exist");
                continue;
            }
            validators[validations[i]](req);
        }
        return req;
    };


    return {
        validate: validate
    };

};

module.exports = validator();
