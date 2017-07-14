/*******************
 *** SEARCH PAGE ***
 ******************/

let searchResults = new Vue({
  el: '#searchresults',
  data: {
    applicantList: window.applicants,
    filterText: ''
  },
  methods: {
    getUserUrl: (applicant) => "/admin/user/" + applicant.pubid,
    applicantsToShow: function(){
        return this.applicantList.filter((app) => {
            let filterText = this.filterText.toLowerCase();
            let firstName = app.name.first.toString().toLowerCase();
            let lastName = app.name.last.toString().toLowerCase();
            let email = app.email.toString().toLowerCase();
            let college = app.school.name.toString().toLowerCase();

            return firstName.includes(filterText) ||
                lastName.includes(filterText) ||
                email.includes(filterText) ||
                college.includes(filterText);
        });
    }
  }
});

//handle decision buttons
$(".decisionbuttons button").click(function () {
    var _this = this;
    var buttongroup = $(this).parent();
    var buttons = $(this).parent().find(".btn");
    var newStatus = $(_this).data("status");
    var pubid = $(_this).parents(".applicant").data("pubid");

    $(buttons).prop("disabled", true).removeClass("active");

    updateStatus("user", pubid, newStatus, function (data) {
        $(_this).parent().siblings(".status-text").text(newStatus);
        $(buttons).prop("disabled", false);
        $(_this).addClass("active");
    });
});

//show and hide email list in search window
var areEmailsShowing = false; //email list is collapsed by default
$("#email-show-button").click(function (e) {
    e.preventDefault();
    if (areEmailsShowing) {
        $("#email-content").hide();
        $("#email-show-button").text("(show)");
        areEmailsShowing = false;
    } else {
        $("#email-content").show();
        $("#email-show-button").text("(hide)");
        areEmailsShowing = true; //changes state to true to indicate that the emails are being shown
    }
});

//handle decision radio buttons for search view
$('.decision-radio input[type=radio][name=status]').on('change', function () {
    var _this = this;
    var newStatus = $(_this).val();
    var radios = $(_this).parents(".decision-radio").find("input[type=radio]");
    var pubid = $(_this).parents(".applicant").data("pubid");

    $(radios).prop("disabled", true);

    updateStatus("user", pubid, newStatus, function (data) {
        $(radios).prop("disabled", false);
    })
});

//switch render location
$('#render').on('change', function () {
    var redirect = _updateUrlParam(window.location.href, "render", $(this).val());
    window.location.assign(redirect);
});
var searchCategories = {
    pubid: {
        name: "pubid",
        placeholder: "Public User ID"
    },
    email: {
        name: "email",
        placeholder: "Email"
    },
    name: {
        name: "name",
        placeholder: "Name"
    }
};

$("#categoryselection").change(function () {
    var catString = $(this).val();
    var category = searchCategories[catString];
    var persist = $(this).find(":selected").data("persist");

    if (typeof category === "undefined") {
        console.log(catString, "Is not a valid category!");
    }
    else {
        var inputElem = '<input class="form-control" type="text" name="' + category.name + '" placeholder="' + category.placeholder + '" value="' + persist + '" />';
        $(".category-input").html(inputElem);
    }
});

//select default
$("#categoryselection option").each(function (ind) {
    if ($(this).data("persist") != "") {
        $("#categoryselection").val($(this).val()).change();
    }
});
