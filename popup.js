/**
 * Created by rai on 15/8/17.
 */
var STATE_START=1;
var STATE_ACQUIRING_AUTHTOKEN=2;
var STATE_AUTHTOKEN_ACQUIRED=3;

var state = STATE_START;

var $SignInButton;

function changeState(newState) {
    state = newState;
}

$('document').ready(function(){
    chrome.identity.getAuthToken({'interactive': false}, function (token) {
        if (chrome.runtime.lastError) {
            changeState(STATE_START);
            $('#not-sign-in').show();
            $('#sign-in').hide();
        } else {
            $('#not-sign-in').hide();
            $('#sign-in').show();
            alert(token);
            var x = new XMLHttpRequest();
            x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
            x.onload = function () {
                alert(x.response);
            };
            x.send();
        }
    });
});

$('#signin-Button').click(function () {
    $SignInButton = $(this);
    chrome.identity.getAuthToken({'interactive': true}, function (token){
        if (chrome.runtime.lastError) {
            changeState(STATE_START);
            $(this).attr("disabled", "disabled");
        } else {
            changeState(STATE_ACQUIRING_AUTHTOKEN);
        }
    });
});