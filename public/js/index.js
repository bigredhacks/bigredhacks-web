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

    // TODO: Implement Registration here
    $('#signup').click(function () {
        var input_email = $('#reg_email').val();
        $.ajax({
            url: "./subscribe",
            type: "get",
            data: {
                "email": input_email,
                "isCornell": false 
            },
            success: function (result) {
                $("#reg_email").val("");
                if(!result.status){
                    alert(result.message);
                }
                // var typed = new Typed('#scroll', {
                //     strings: [result.message],
                //     typeSpeed: 0
                // });
            }
        });
    });

    $('#signup2').click(function () {
        var input_email = $('#reg_email2').val();
        console.log(input_email)
        $.ajax({
            url: "./subscribe",
            type: "get",
            data: {
                "email": input_email,
                "isCornell": false 
            },
            success: function (result) {
                $("#reg_email2").val("");
                if(!result.status){
                    alert(result.message);
                }
                // var typed = new Typed('#scroll', {
                //     strings: [result.message],
                //     typeSpeed: 0
                // });
            }
        });
    });

    var currentPhrase = 0;
    var phrases = ["Learn, code, share!", "Hello World!", "Get ready to be a part of something big!", "Get ready for the new school year!", 'console.log("Ready!")'];

    $('#keyboard').click(function(){
        var current = phrases[currentPhrase];

        // var typed = new Typed('#scroll', {
        //     strings: [current],
        //     typeSpeed: 0
        // });

        currentPhrase = (currentPhrase < phrases.length - 1) ? currentPhrase + 1 : 0;
    });

    // $('#signup').validate({
    //     onfocusout: function (e, event) {
    //         this.element(e); //validate field immediately
    //     },
    //     onkeyup: false,
    //     rules: {
    //         cornellEmail: {
    //             required: false,
    //             email: true
    //         }
    //     }
    // })

})(jQuery);