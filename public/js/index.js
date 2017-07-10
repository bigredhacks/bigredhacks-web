var scenes = ['mainDiv', 'aboutDiv', 'faqDiv', 'sponsorsDiv'];
scenes.forEach(function(scene){
    var el = document.getElementById(scene);
    var parallax = new Parallax(el);
});