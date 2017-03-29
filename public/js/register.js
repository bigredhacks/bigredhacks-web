$('document').ready(function () {

    var max_resume_mb = 10;

    $.CollegeTypeahead.enable();

    //File picker
    $(function () {
        $("input[type='file']").filepicker();
    });

    var lastMajor = "";
    var lastCollege = {id: "", name: ""};
    $("#yearDropdown").on("change", function(e) {
        const otherCollegeId = "x999999";
        var selMajor = $("#major.typeahead");
        var majorVal = selMajor.val();
        if (majorVal != "Undecided") {
            lastMajor = majorVal;
        }

        if ($("#collegeid").val() != otherCollegeId) {
            lastCollege.id = $("#collegeid").val();
            lastCollege.name = $("#college").val();
        }

       if ($(this).val() === "High School") {
           $.CollegeTypeahead.disable();
           //proper way to set value that works with typeahead
           selMajor.typeahead("val","Undecided");
           $("#collegeid").val(otherCollegeId);
           $("#college").val("");

       }
        else {
           $("#collegeid").val(lastCollege.id);
           $("#college").val(lastCollege.name);
           $.CollegeTypeahead.enable();
           selMajor.typeahead("val",lastMajor);
       }

        //force revalidation only if selected major is not blank
        if (selMajor.val() != "") {
            selMajor.valid();
        }
    });

    /*
     * Validator
     */
    //check that two fields ae not simultaneously empty
    $.validator.addMethod("notEmpty", function (val, elem, params) {
        var f1 = $('#' + params[0]).val(),
            f2 = $('#' + params[1]).val();
        return f1 !== "" && f2 !== "";
    }, 'Enter a valid school. Enter "Unlisted - [your school name]" if your school is not listed.');

    $.validator.addMethod("validMajor", function (val, elem) {
        var val = $('#major').val();
        if (val.toLowerCase().indexOf("cs") >= 0) {
            $('#major').val("Computer Science (CS)");
            val = "Computer Science (CS)";
        }
        return (engine3.get([val]).length != 0 || val.indexOf('Unlisted - ') == 0);
    }, 'Enter a valid major. Enter "Unlisted - [your major name]" if your major is not listed or "Undecided" if you do not have one.');

    //high school given
    //valid linkedin url or optional
    $.validator.addMethod("linkedinURL", function (val, elem, params) {
        return /^(www\.)?linkedin\.com\/\S+$/ig.test(val) || val === "";
    });

    notCornellText = 'We aren\'t accepting applications from Cornell University students right now.';

    //fails for cornell email
    $.validator.addMethod("emailNotCornell", function (val, elem, params) {
        return !/^[^@]+@cornell\.edu$/i.test(val);
    }, notCornellText);

    //fails for cornell school
    $.validator.addMethod("schoolNotCornell", function (val, elem, params) {
        var restrict = ["Cornell Tech - NY", "Cornell University - NY"];
        return (restrict.indexOf(val) == -1);
    }, notCornellText);

    $.validator.addMethod('filesize', function (value, element, param) {
        return this.optional(element) || (element.files[0].size <= param)
    }, 'File size must be less than ' + max_resume_mb + ' mb'); // TODO: Parametrize this

    $('#registrationForm').validate({
        ignore: 'input:not([name])', //ignore unnamed input tags
        onfocusout: function (e, event) {
            this.element(e); //validate field immediately
        },
        onkeyup: false,
        rules: {
            email: {
                required: true,
                email: true,
                emailNotCornell: $("#email").hasClass("not-cornell"),
                remote: "/api/validEmail"
            },
            password: {
                minlength: 6,
                maxlength: 25
            },
            confirmpassword: {
                required: true,
                minlength: 6,
                maxlength: 25,
                equalTo: "#password"
            },
            firstname: {
                required: true,
                minlength: 2
            },
            lastname: {
                required: true,
                minlength: 2
            },
            phonenumber: {
                required: true,
                phoneUS: true
            },
            college: {
                notEmpty: ['college', 'collegeid'],
                schoolNotCornell: true
            },
            major: {
                required: true,
                validMajor: []
            },
            resume: {
                required: true,
                extension: "pdf",
                accept: 'application/pdf',
                filesize: 1024 * 1024 * max_resume_mb // Note must match backend
            },
            q1: {
                required: true,
                maxlength: 5000
            },
            q2: {
                required: true,
                maxlength: 5000
            },
            linkedin: {
                linkedinURL: true
            },
            anythingelse: {
                required: false,
                maxlength: 1000
            },
            hardware: {
                required: false,
                maxlength: 1000
            },
            liability: {
                required: true
            }
        },
        messages: {
            email: {
                remote: "A user with that email already exists."
            },
            password: {
                required: "Please provide a password",
                minlength: "Your password must be at least 6 characters long"
            },
            confirm_password: {
                required: "Please confirm your password",
                minlength: "Your password must be at least 6 characters long",
                equalTo: "Please enter the same password as above"
            },
            highschool: {
                required: "Please enter a high school"
            },
            firstname: "Please enter your first name",
            lastname: "Please enter your last name",
            phonenumber: "Please provide a valid phone number",
            major: 'Enter a valid major. Enter "Unlisted - [your major name]" if your major is not listed, or "Undecided" if you do not have one.',
            linkedin: "Please provide a valid LinkedIn url",
            hardware: "Please hit enter to add a hardware"
        }
    });

    // Check if using IE
    // http://stackoverflow.com/questions/19999388/check-if-user-is-using-ie-with-jquery
    (function () {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))  // If Internet Explorer, return version number
        {
            alert("We have detected you are using Internet Explorer. While you can still register using Internet Explorer, it is " +
                "not officially supported. We recommend using Chrome or Firefox if you encounter any issues.");
        }
    })();

    // Disable hitting enter to submit
    $('#registrationForm ').on('keyup keypress', function (e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            e.preventDefault();
            return false;
        }
    });
});

// Make buttons success-colored after clicked on
$('#liability-cornell').click(function(){
    /*
    $(this)
        .removeClass('btn-danger')
        .addClass('btn-success');
        */
});
/*
$('#code-of-conduct-cornell').click(function(){
    $(this)
        .removeClass('btn-danger')
        .addClass('btn-success');
});
    */