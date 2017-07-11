let scenes = ['mainDiv', 'aboutDiv', 'faqDiv', 'sponsorsDiv'];
scenes.forEach(scene => {
    let el = document.getElementById(scene);
    let parallax = new Parallax(el);
});