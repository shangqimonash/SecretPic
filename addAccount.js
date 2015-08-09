/**
 * Created by rai on 15/8/7.
 */
var $account = $('#accountInput');
var $password = $('passwordInput');

function init() {
    gapi.client.setApiKey('9aT7xIN5rPHy3devxdvW0DXG');
    gapi.client.load('urlshortener', 'v1').then(makeRequest);
}

function makeRequest() {
    var request = gapi.client.url.get({
        'shortUrl': 'http://goo.gl/fbsS'
    });
    request.then(function(response) {
        appendResults(response.result.longUrl);
    });
}

function appendResults(text) {
    var results = document.getElementById('accountInput');
    results.appendChild(document.createElement('P'));
    results.appendChild(document.createTextNode(text));
}


$(document).ready(function () {
    $('#buttonSubmit').click(function () {
        // Validate the input box
        if($account.val() === "" || $password.val() === "");
        // Validate the account online

        // Generate the Symmetric key
        // Test:sjcl.sha256() SHA-256
        var key = sjcl.hash.sha256.hash("Hello");
        var aes = sjcl.cipher.aes(key);
        console.log(aes.encrypt("AAA"));
    });
});