// Get all divs with parallax needs
// let scenes = ['mainDiv', 'aboutDiv', 'faqDiv', 'sponsorsDiv'];

// // Start parallax
// scenes.forEach(scene => {
//     let el = document.getElementById(scene);
//     let parallax = new Parallax(el);
// });

$(document).ready(function () {
    $(window).scroll(function () {
        var scrollPos = $(document).scrollTop();
        $('.nav-item').each(function () {
            var currElmt = $(this);
            var currLink = $(this).find("a");
            var refElement = $(currLink.attr("href"));
            if (refElement.position().top <= scrollPos + 100 && refElement.position().top + refElement.height() > scrollPos) {
                $('.nav-item').removeClass("active");
                currElmt.addClass("active");
            }
            else {
                currElmt.removeClass("active");
            }
        });
    });
    var msgContainer = $(".msgContainer");
    var submitForm = $("#submitForm");
    submitForm.click(function () {
        msgContainer.removeClass("active err success");
        msgContainer.hide();

        var email = $("input#email").val();
        var fName = $("input#firstName").val();
        var lName = $("input#lastName").val();

        if ((!(email.length > 0)) || (!(fName.length > 0) || (!(lName.length > 0)))) {
            msgContainer.addClass("active err");
            msgContainer.show();
            msgContainer.text("Please fill out all fields and try again!");
        }
        else {
            $.ajax({
                method: "POST",
                url: "/emailListAdd",
                data: {
                    email: email,
                    fName: fName,
                    lName: lName
                },
                success: function (data) {
                    console.log(data);
                    msgContainer.addClass("active success");
                    msgContainer.show();
                    msgContainer.text(data.message);
                },
                error: function (data) {
                    console.log(data);
                    msgContainer.addClass("active err");
                    msgContainer.show();
                    msgContainer.text(data.responseJSON.message);
                }
            });
        }
    });
});