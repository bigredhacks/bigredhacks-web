var global_config = require("../config");
var sendgrid = require("sendgrid")(global_config.setup.sendgrid_api_key);
var moment = require("moment");

const year = new Date().getFullYear();
const rsvpTime = moment.duration(global_config.admin.days_to_rsvp, 'days');

const acceptedSubject = "You've been accepted to BigRed//Hacks "+year+"!";

const waitlistedSubject = "BigRed//Hacks " + year + " Decision Status";

const rejectectSubject = "BigRed//Hacks " + year + " Decision Status";

const acceptedBody = "<p>Congratulations, you have been accepted to BigRed//Hacks "+year+"! " +
    "Take a deep breath, all of your hard work has finally paid off.  We know the suspense was killing you.</p>" +
    "<p>We're trying to make sure that everyone who wants to come has the opportunity, so please head over to " +
    "<a href=http://www.bigredhacks.com/>our website</a> and let us know within <b>" + rsvpTime.humanize() +"</b> if you're able to make it, " +
    "or we will have to offer your spot to someone else.</p>" +
    "<p>A more updated schedule will be posted soon.  We hope to see you there!</p>" +
    "<p>BigRed//Hacks Team</p>";

const waitlistedBody = "<p>Thank you for applying for BigRed//Hacks! With so many hackathons " +
                        "happening this year, we're honored that we were on your list.</p>" +
                        "<p>We had a record number of applications, and a very limited amount of space. While we " +
                        "aren't able to offer you a spot immediately, you are on our waitlist and we'll reach out to you as soon " +
                        "as one becomes available. Last year, we were able to accept a lot of hackers from our waitlist, so check" +
                        " your email often!</p>" +
                        "<p>If you aren't interested in coming to BigRed//Hacks at all anymore, then please" +
                        " <a href='https://www.bigredhacks.com/user/dashboard'>let us know</a> by logging into your dashboard.</p>" +
                        "<p>All the best for the future, and keep on hacking!</p>" +
                        "<p>BigRed//Hacks Team</p>";

const rejectedBody = "<p>Thank you for applying for BigRed//Hacks! With so many hackathons happening this year," +
                        "we're honored that we were on your list.</p>" +
                        "<p>Unfortunately, we aren't able to offer you a spot at BigRed//Hacks "+year+". We had a " +
                        "record number of applications, and a very limited amount of space. But know that we still think you're" +
                        " awesome, and would love for you to apply again for BigRed//Hacks "+(year+1)+"!</p>" +
                        "<p>All the best for the future, and keep on hacking!</p>" +
                        "<p>BigRed//Hacks Team</p>";

const waitlistedToAcceptedBody = "<p>Congratulations, you've survived the wait list and have been accepted to BigRed//Hacks "+year+"! " +
    "Take a deep breath, all of your hard work has finally paid off.  We know the suspense was killing you.</p>" +
    "<p>We're trying to make sure that everyone who wants to come has the opportunity, so please head over to " +
    "<a href=http://www.bigredhacks.com/>our website</a> and let us know within <b>" + rsvpTime.humanize() + "</b> if you're able to make it, " +
    "<p>A more updated schedule will be posted soon.  We hope to see you there!</p>" +
    "<p>BigRed//Hacks Team</p>";

/**
 * Asynchronously sends a transactional email
 * @param body Contains the html body of the email
 * @param config Contains parameters: to.email, to.name, from_email, from_name, and subject
 * @param callback a function of (err, json) to handle callback
 */
function sendEmail (body, config, callback) {
    if (!callback) callback = defaultCallback;
    var email = new sendgrid.Email();

    email.addTo(config.to.email);
    email.setFrom(config.from_email);
    email.setFromName(config.from_name);
    email.setSubject(config.subject);
    email.setHtml(body);
    email.addFilter('templates', 'enable', 1);
    email.addFilter('templates', 'template_id', global_config.sendgrid.sg_general);

    sendgrid.send(email, function(err) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            callback();
        }
    });
}

module.exports.sendDecisionEmail = function (name, notifyStatus, newStatus, config, callback) {
  if (notifyStatus === "Waitlisted" && newStatus === "Accepted") {
      config.subject = acceptedSubject;
      sendEmail("<p>Hey " + name + ",</p>" + waitlistedToAcceptedBody, config, callback);
  } else {
      switch (newStatus) {
          case "Accepted":
              config.subject = acceptedSubject;
              sendEmail("<p>Hey " + name + ",</p>" + acceptedBody, config, callback);
              break;
          case "Waitlisted":
              config.subject = waitlistedSubject;
              sendEmail("<p>Hi " + name + ",</p>" + waitlistedBody, config, callback);
              break;
          case "Rejected":
              config.subject = rejectectSubject;
              sendEmail("<p>Hi " + name + ",</p>" + rejectedBody, config, callback);
              break;
      }
  }
};

module.exports.sendEmail = sendEmail;

var defaultCallback = function (err, json) {
    if (err) {
        console.log(err);
    } else {
        console.log(json);
    }
};
