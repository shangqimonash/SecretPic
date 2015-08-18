/**
 * Created by rai on 15/8/17.
 */
var STATE_START=1;
var STATE_ACQUIRING_AUTHTOKEN=2;
var STATE_AUTHTOKEN_ACQUIRED=3;

var state = STATE_START;

var $SignInButton = $('#signin-Button');

function disableButton(button) {
    button.attr("disabled", "disabled");
}

function enableButton(button) {
    button.removeAttr("disabled");
}

function changeState(newState) {
    state = newState;
    switch (state){
        case STATE_START:
            enableButton($SignInButton);
            break;
        case STATE_ACQUIRING_AUTHTOKEN:
            disableButton($SignInButton);
            break;
        case STATE_AUTHTOKEN_ACQUIRED:
            disableButton($SignInButton);
            break;
    }
}
function xhrWithAuth(method, url, token, callback){
    var access_token = token;
    requestStart();

    function requestStart(){
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization','Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
    }

    function requestComplete(){
        if(this.status == 401){
            chrome.identity.removeCachedAuthToken({token: access_token}, removed);
            changeState(STATE_START);
            $('#not-sign-in').show();
            $('#sign-in').hide();
        } else {
            callback(null, this.status, this.response);
        }
    }

    function removed(){

    }
}
function onUserInfoFetched(error, status, response) {
    if (!error && status == 200) {
        changeState(STATE_AUTHTOKEN_ACQUIRED);
        var user_info = JSON.parse(response);
        $('#not-sign-in').hide();
        $('#sign-in').show();
    } else {
        changeState(STATE_START);
    }
}

$('document').ready(function(){
    chrome.identity.getAuthToken({'interactive': false}, function (token) {
        if (chrome.runtime.lastError) {
            changeState(STATE_START);
            $('#not-sign-in').show();
            $('#sign-in').hide();
        } else {
            xhrWithAuth('GET',
                        'https://www.googleapis.com/plus/v1/people/me',
                        token,
                        onUserInfoFetched);
        }
    });
});

$SignInButton.click(function () {
    changeState(STATE_ACQUIRING_AUTHTOKEN);
    chrome.identity.getAuthToken({'interactive': true}, function (token){
        if (chrome.runtime.lastError) {
            changeState(STATE_START);
        } else {
            changeState(STATE_AUTHTOKEN_ACQUIRED);
        }
    });
});