// Get all divs with parallax needs
let scenes = ['mainDiv', 'aboutDiv', 'faqDiv', 'sponsorsDiv'];

// Start parallax
scenes.forEach(scene => {
    let el = document.getElementById(scene);
    let parallax = new Parallax(el);
});