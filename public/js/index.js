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
            if (refElement.position().top <= scrollPos && refElement.position().top + refElement.height() > scrollPos) {
                $('.nav-item').removeClass("active");
                currElmt.addClass("active");
            }
            else {
                currElmt.removeClass("active");
            }
        });
    });
});