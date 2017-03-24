/**
 * pad a number with leading 0's
 * @param num
 * @param size
 * @returns {string}
 */
function pad(num, size) {
    var s = "000" + num; //assume never need more than 3 digits
    return s.substr(s.length - size);
}

(function ($) {

    //jQuery to collapse the navbar on scroll
    /*$(window).scroll(function () {
        if ($(".navbar").offset().top > 50) {
            $(".navbar-fixed-top").addClass("top-nav-collapse");
        } else {
            $(".navbar-fixed-top").removeClass("top-nav-collapse");
        }
    });*/

    //jQuery for page scrolling feature - requires jQuery Easing plugin
    $(function () {
        var padding = 30;
        $('.navbar-nav li a').bind('click', function (event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top - padding
            }, 1000, 'easeInOutExpo');
            $(".navbar-main-collapse").collapse('hide');
            event.preventDefault();
        });
        $('.page-scroll a').bind('click', function (event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top - padding
            }, 1000, 'easeInOutExpo');
            $(".navbar-main-collapse").collapse('hide');
            event.preventDefault();
        });
    });


    //registration modal stuff
    var footer, title;
    var reg = $("#regModal");
    $("#regCornell").on("click", function (e) {
        e.preventDefault();
        footer = reg.find(".modal-footer").html();
        reg.find(".modal-footer .reg-select").addClass("hidden");
        title = reg.find(".modal-title").text();
        reg.find(".modal-title").text("Cornell/Ithaca Registration");
        reg.find(".modal-body").removeClass("hidden");
        $("#cornell-submit").removeClass("hidden");
    });

    reg.on('hidden.bs.modal', function (e) {
        reg.find(".modal-footer .reg-select").removeClass("hidden");
        reg.find(".modal-title").text(title);
        reg.find(".modal-body").addClass("hidden");
        $("#cornell-submit").addClass("hidden");
    });

    //fade out things that have fadeOut class
    $(".fadeOut").delay(2000).fadeOut(2000, "easeInCubic");


    /**
     * validator
     */

    $.validator.addMethod("checkCornellEmail", function (val, elem, params) {
        return /^[^@]+@cornell\.edu$/i.test(val) || val === "";
    }, 'Please enter a cornell.edu email.');


    $('#subscribeEmail').validate({
        onfocusout: function (e, event) {
            this.element(e); //validate field immediately
        },
        onkeyup: false,
        rules: {
            cornellEmail: {
                required: true,
                email: true
            }
        }
    })


})(jQuery);
