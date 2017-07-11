let typeNumber = 4;
let errorCorrectionLevel = 'L';
let qr = qrcode(typeNumber, errorCorrectionLevel);

let qrHolder = document.getElementById('qr-holder');

// Check that the element exists
if(qrHolder != null){
    let pubid = qrHolder.getAttribute('data-pubid');
    qr.addData(pubid);
    qr.make();
    qrHolder.innerHTML = qr.createImgTag(10,16);
}
