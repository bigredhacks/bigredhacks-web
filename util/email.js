"use strict";

const global_config = require("../config");
const moment = require("moment");
// Can be used as a constant since all accepted use the current config let at the time of announcement
const rsvpTime = moment.duration(Number(global_config.admin.days_to_rsvp), 'days');
const sendgrid = require("sendgrid")(global_config.setup.sendgrid_api_key);
const year = new Date().getFullYear();

/**
 * Decisions
 */

// Subjects
const ACCEPTED_SUBJECT             = `You've been accepted to BigRed//Hacks ${year}!`;
const ACCEPTED_TO_REJECTED_SUBJECT = `BigRed//Hacks ${year} RSVP Deadline Passed`;
const DEADLINE_WARNING_SUBJECT     = "One day left to RSVP to BigRed//Hacks!";
const HARDWARE_TRANSACTION_SUBJECT = 'BigRed//Hacks Hardware Transaction';
const REJECTED_SUBJECT             = `BigRed//Hacks ${year} Decision Status`;
const WAITLISTED_SUBJECT           = `BigRed//Hacks ${year} Decision Status`;

// Generic (Canned) responses
const GENERIC_ACCEPTED_BODY               = "Take a deep breath, all of your hard work has finally paid off.  We know the suspense was killing you.</p>" +
    "<p>We're trying to make sure that everyone who wants to come has the opportunity, so please head over to " +
    `<a href=http://www.bigredhacks.com/>our website</a> and let us know within <b>${rsvpTime.humanize()}</b> if you're able to make it, ` +
    "or we will have to offer your spot to someone else.</p>" +
    "<p>A more updated schedule will be posted soon.  We hope to see you there!</p>" +
    "<p>BigRed//Hacks Team</p>";

const GENERIC_WAITLISTED_OR_REJECTED_BODY =  "<p>Thank you for applying for BigRed//Hacks! With so many hackathons " +
                                             "happening this year, we're honored that we were on your list.</p>";

// Bodies
const ACCEPTED_BODY               = `<p>Congratulations, you have been accepted to BigRed//Hacks ${year}! ` + GENERIC_ACCEPTED_BODY;

const ACCEPTED_TO_REJECTED_BODY   =  "<p>Because you did not RSVP within the time frame we requested, we are " +
                                     "rescinding your acceptance. We want to be fair to our applicants and ensure that " +
                                     "everyone who wants to attend has the opportunity. If you still want to come, please email " +
                                     '<a href="mailto:info@bigredhacks.com?subject=Rejection Appeal" target="_blank">info@bigredhacks.com</a> ' +
                                     "immediately, though we cannot guarantee that we will be able to offer you a spot again.</p>" +
                                     "<p>All the best for the future, and keep on hacking!</p>" +
                                     "<p>BigRed//Hacks Team</p>";

const DEADLINE_WARNING_BODY       = "<p>We wanted to remind you that you have <b>less than one day</b> left to RSVP to BigRed//Hacks. " +
                                    "Please log on to <a href=http://www.bigredhacks.com/>our website</a> and let us know if you'll be able to make it, or " +
                                    "we may have to offer your spot to someone else.</p>" +
                                    "<p>We hope to see you there!</p>" +
                                    "<p>BigRed//Hacks Team</p>";

const REJECTED_BODY               = GENERIC_WAITLISTED_OR_REJECTED_BODY +
                                    `<p>Unfortunately, we aren't able to offer you a spot at BigRed//Hacks ${year}. We had a ` +
                                    "record number of applications and a very limited amount of space. But know that we still think you're " +
                                    `awesome, and would love for you to apply again for BigRed//Hacks ${year+1}!</p>` +
                                    "<p>All the best for the future, and keep on hacking!</p>" +
                                    "<p>BigRed//Hacks Team</p>";

const WAITLISTED_BODY             = GENERIC_WAITLISTED_OR_REJECTED_BODY +
                                   "<p>We had a record number of applications, and a very limited amount of space. While we " +
                                   "aren't able to offer you a spot immediately, you are on our waitlist and we'll reach out to you as soon " +
                                   "as one becomes available. Last year, we were able to accept a lot of hackers from our waitlist, so check" +
                                   " your email often!</p>" +
                                   "<p>If you aren't interested in coming to BigRed//Hacks at all anymore, then please" +
                                   " <a href='https://www.bigredhacks.com/user/dashboard'>let us know</a> by logging into your dashboard.</p>" +
                                   "<p>All the best for the future, and keep on hacking!</p>" +
                                   "<p>BigRed//Hacks Team</p>";

const WAITLISTED_TO_ACCEPTED_BODY = `<p>Congratulations, you've survived the wait list and have been accepted to BigRed//Hacks ${year}! ` + GENERIC_ACCEPTED_BODY;

/**
 * Asynchronously sends a transactional email
 * @param body Contains the html body of the email
 * @param config Contains parameters: to.email, to.name, from_email, from_name, and subject
 * @param callback a function of (err, json) to handle callback
 */
function sendCustomEmail (bodyText, config, callback) {
    // If callback doesn't exist, default to the default callback
    callback = (!callback) ? defaultCallback : callback;

    // Generate the SendGrid request (as per Web API 3.0)
    // https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/index.html
    let request = sendgrid.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: {
            personalizations: [
                {
                    to: [
                        {
                            email: config.to.email
                        }
                    ],
                    subject: config.subject
                }
            ],
            from: {
                email: config.from_email,
                name: config.from_name
            },
            content: [
                {
                    type: 'text/html',
                    value: bodyText
                }
            ],
            template_id: global_config.sendgrid.sg_general
        }
    });

    sendgrid.API(request, function (error, response) {
        if (error) {
            console.log(error);
            callback(error);
        }
        else{
            callback();
        }
    });
}

module.exports.sendDecisionEmail = function (name, notifyStatus, newStatus, config, callback) {
  if (notifyStatus === "Waitlisted" && newStatus === "Accepted") {
      config.subject = ACCEPTED_SUBJECT;
      sendCustomEmail(`<p>Hey ${name},</p>` + WAITLISTED_TO_ACCEPTED_BODY, config, callback);
  } else if (notifyStatus === "Accepted" && newStatus === "Rejected") {
      config.subject = ACCEPTED_TO_REJECTED_SUBJECT;
      sendCustomEmail(`<p>Hi ${name},</p>` + ACCEPTED_TO_REJECTED_BODY, config, callback);
  } else {
      switch (newStatus) {
          case "Accepted":
              config.subject = ACCEPTED_SUBJECT;
              sendCustomEmail(`<p>Hey ${name},</p>` + ACCEPTED_BODY, config, callback);
              break;
          case "Waitlisted":
              config.subject = WAITLISTED_SUBJECT;
              sendCustomEmail(`<p>Hi ${name},</p>` + WAITLISTED_BODY, config, callback);
              break;
          case "Rejected":
              config.subject = REJECTED_SUBJECT;
              sendCustomEmail(`<p>Hi ${name},</p>` + REJECTED_BODY, config, callback);
              break;
          case "Pending":
              // In this case, we revoked a decision. No email should be sent as this only
              // should happen in exceptional cases.
              callback();
              break;
          default:
              callback('Error: Saw unknown status in sendDecisionEmail: ' + newStatus);
              break;
      }
  }
};

module.exports.sendDeadlineEmail = function (name, config, callback) {
    config.subject = DEADLINE_WARNING_SUBJECT;
    sendCustomEmail(`<p>Hi ${name},</p>` + DEADLINE_WARNING_BODY, config, callback);
};

module.exports.sendHardwareEmail = function (checkingOut, quantity, itemName, firstName, lastName, studentEmail, callback) {
    let config = {
        "subject": HARDWARE_TRANSACTION_SUBJECT,
        "from_email": "info@bigredhacks.com",
        "from_name": "BigRed//Hacks",
        "to": {
            "email": studentEmail,
            "name": `${firstName} ${lastName}`
        }
    };

    let body = `<p>Hi '${firstName},</p>` +
        '<p>This is to confirm that you have ' +
        `${checkingOut ? "checked out " : "returned "}` +
        `${quantity} ${itemName}</p>` +
        '<p>Cheers</p>' +
        '<p>BigRed//Hacks Team</p>';

    sendCustomEmail(body, config, callback);
};

module.exports.sendRequestMadeEmail = function (email, name, callback) {
    let config = {
        "subject": 'Mentorship Request Created',
        "from_email": "info@bigredhacks.com",
        "from_name": "BigRed//Hacks",
        "to": {
            "email": email,
            "name": `${name.first} ${name.last}`
        }
    };

    let body = `<p>Hi ${name.first},</p>` +
        '<p>This is to confirm that you have created a request for a mentor. The mentors will ' +
        'view your request, and someone will respond shortly. Please make sure you are at the location that ' +
        'you provided in your request!</p>' +
        '<p>Cheers</p>' +
        '<p>BigRed//Hacks Team</p>';

    sendCustomEmail(body, config, callback);
};

module.exports.sendRequestClaimedStudentEmail = function (email, studentName, mentorName, callback) {
    let config = {
        "subject": 'Mentorship Request Claimed',
        "from_email": "info@bigredhacks.com",
        "from_name": "BigRed//Hacks",
        "to": {
            "email": email,
            "name": `${studentName.first} ${studentName.last}`
        }
    };

    let body = `<p>Hi ${studentName.first},</p>` +
        `<p>A mentor ${mentorName.first} ${mentorName.last} has claimed your request!</p>` +
        '<p>Please be on the lookout for your mentor, and make sure you are at the location you specified ' +
        'in your request!</p>' +
        '<p>Cheers</p>' +
        '<p>BigRed//Hacks Team</p>';

    sendCustomEmail(body, config, callback);
};

module.exports.sendRequestClaimedMentorEmail = function (email, studentName, mentorName, callback) {
    let config = {
        "subject": 'Mentorship Request Claimed',
        "from_email": "info@bigredhacks.com",
        "from_name": "BigRed//Hacks",
        "to": {
            "email": email,
            "name": `${mentorName.first} ${mentorName.last}`
        }
    };

    let body = `<p>Hi ${mentorName.first},</p>` +
        `<p>This is to confirm you have claimed a mentor request from ${studentName.first} ${studentName.last}.'</p>` +
        '<p>Cheers</p>' +
        '<p>BigRed//Hacks Team</p>';

    sendCustomEmail(body, config, callback);
};

module.exports.sendCustomEmail = sendCustomEmail;

let defaultCallback = function (err, json) {
    console.log(err ? err : json);
};
