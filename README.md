[BigRed//Hacks](http://www.bigredhacks.com)
==================
The greatest hackathon management app of all time.
 
###Dev Environment Setup
1. To prevent accidental pushing to protected branches (master, develop, rc), install the git pre-push hook by running `dev-tools/configure.sh` (cmd if windows) *from within the dev-tools directory*.

        cd dev-tools
        ./configure.sh

### Dev Guidelines
* New features should always go in a new branch. To create a new branch, run `git checkout -b ISSUE#_Brief-Summary`, naming the branch as appropriate.
* Reference an issue number from within a commit to [close it](https://help.github.com/articles/closing-issues-via-commit-messages/) or to associate it for further discussion. 
* To push, run `git push <branch> HEAD`.
* When your code is ready for review, create a pull request. Make sure you change the base if your branch is not based off of develop.
* When you get two sign-offs, and after your tests pass, press the green button in the pull request to merge your commits.

###Setup Instructions
1. Make sure node.js and mongoDB are installed, with the latter running.
1. Fetch all dependencies by running:

        npm install
1. Setup any configuration variables. This can be done in two ways. The presence of a config file overrides the environment variable method.
  * Config file - Duplicate `config.template.json` in the root directory and name it `config.json`. Fill out all fields.
  * Environment variables - Open `config.template.json`. Use this file to input env variables of the same name. Ignore top level categories, and "_comment" fields. Note: you *must* update `config.schema.json` with any additional global variables for them to be recognized. Note that environment variables use a double underscore ( __ ) in order to separate categories from variable names.
1. Run the app! The entry point is at `/bin/www.js`.

### Admin Setup
In config.template.json, `admin.email` denotes the email address of the first admin user. The user created through the registration form with this email will automatically be assigned admin privileges. Therefore, it is recommended that this user be created before putting the app into production mode. Subsequent users can be added through the integrated role management system.

### APIs
The application uses the following APIs:

* AWS S3
* Mailchimp
* SendGrid

### Deployment
The app is configured to work with Heroku and Openshift hosting services. MongoDB is configured to work with MongoLab (`MONGOLAB_URI`) and Compose (`COMPOSE_URI`).
 
### Contact
The authors may be reached at [info@bigredhacks.com](info@bigredhacks.com).
