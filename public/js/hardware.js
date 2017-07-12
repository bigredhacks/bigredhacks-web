//send email when click checkout hardware button
$("#checkout-hardware-btn").on('click', function (){
    let name = $('#name').val();
    let email = $('#email').val();
    if (name == '' || email == '') {
        return false;
    }
});