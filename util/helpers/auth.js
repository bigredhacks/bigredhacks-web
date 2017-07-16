const College   = require("../../models/college");
const validator = require("../../library/validations");

let helper = {};

/**
 *
 * @param req User submitted object from registration
 * @returns {*} A validation object
 */
helper.validateAll = (req) => {
    //todo reorder validations to be consistent with form
    return validator.validate(req, [
        'email',
        'password',
        'firstname',
        'lastname',
        'phonenumber',
        'major',
        'genderDropdown',
        'dietary',
        'tshirt',
        'linkedin',
        'collegeid',
        'q1',
        'q2',
        'anythingelse',
        'hackathonsAttended',
        'yearDropdown',
        'hardware'
    ]);
};

// Cornell has its own set of fields to validate
helper._validateCornell = (req) => {
    //todo reorder validations to be consistent with form
    return validator.validate(req, [
        'email',
        'password',
        'firstname',
        'lastname',
        'phonenumber',
        'major',
        'genderDropdown',
        'dietary',
        'tshirt',
        'linkedin',
        'q1',
        'q2',
        'anythingelse',
        'hackathonsAttended',
        'yearDropdown',
        'hardware'
    ]);
};

/**
 * Find a college entry from a (url) param. This ensures consistent results as only certain params are allowed
 * @param name
 * @param callback
 * @returns {*} College object if it exists, otherwise null. Also null if the param does not meet the filter
 * @private
 */
helper._findCollegeFromFilteredParam = (name, callback) => {
    let collegeName = "";

    //todo refactor
    const schools = {
        cornelltech: "Cornell Tech",
        cornelluniversity: "Cornell University"
    };

    if (schools.hasOwnProperty(name)) {
        collegeName = schools[name];
    } else {
        return callback(null, null);
    }

    College.findOne({name: collegeName}, callback);
};

/**
 * Return if a student is from cornell
 * @param {Object} college
 * @returns boolean True if college name is Cornell, else false. This is used to differentiate extra external
 *          routes from cornell university
 * @private
 */
helper._isCornellian = (college) => {
    return typeof college !== "undefined"
        ? college.name === "Cornell University" || college.display === "Cornell University"
        : false;
};

/**
 * Returns true if there is any intersection between a mentor's skills (mentorSkills) and the user's
 * skills (userSkills), false otherwise
 * @param mentorSkills string array representing mentor's skills
 * @param userSkills string array representing user's skills
 * @returns boolean whether or not there is an intersection between a mentor's skills and the user's skills
 */
helper._matchingSkills = (mentorSkills, userSkills) => {
    for (let i = 0; i < mentorSkills.length; i++) {
        for (let j = 0; j < userSkills.length; j++) {
            //Check equality of first five characters so there is a match between skills like "mobile app dev"
            //and "mobile applications"
            if (mentorSkills[i].toLowerCase().substring(0, 5) === userSkills[j].toLowerCase().substring(0, 5)) {
                return true;
            }
        }
    }
    return false;
};

module.exports = helper;