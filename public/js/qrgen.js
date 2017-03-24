var typeNumber = 4;
var errorCorrectionLevel = 'L';
var qr = qrcode(typeNumber, errorCorrectionLevel);
var qrHolder = document.getElementById('qr-holder');
var pubid = qrHolder.getAttribute('data-pubid');
qr.addData(pubid);
qr.make();
qrHolder.innerHTML = qr.createImgTag(10,16);