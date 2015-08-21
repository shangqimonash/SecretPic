/**
 * Created by rai on 15/8/17.
 */
var STATE_START=1;
var STATE_ACQUIRING_AUTHTOKEN=2;
var STATE_AUTHTOKEN_ACQUIRED=3;

var state = STATE_START;

var $SignInButton = $('#signin-Button');
var $Info = $('#userInfo');
var $SignOutButton = $('#signout-Button');

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
            disableButton($SignOutButton);
            break;
        case STATE_ACQUIRING_AUTHTOKEN:
            disableButton($SignInButton);
            disableButton($SignOutButton);
            break;
        case STATE_AUTHTOKEN_ACQUIRED:
            disableButton($SignInButton);
            enableButton($SignOutButton);
            break;
    }
}

function xhrWithAuth(method, url, interactive, callback){
    var access_token;
    var retry = true;

    getToken();
    // Try to load the Auth Token in the local
    function getToken() {
        chrome.identity.getAuthToken({'interactive': interactive}, function (token) {
            if (!chrome.runtime.lastError) {
                // Check the token is available or not
                access_token = token;
                requestStart();
            } else {
                callback(chrome.runtime.lastError);
            }
        });
    }

    function requestStart(){
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization','Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
    }

    function requestComplete(){
        if(this.status == 401 && retry){
            retry = false;
            // If the local token expired, delete it and request a new one
            chrome.identity.removeCachedAuthToken({token: access_token}, getToken);
            // If the extension can get a new token then back to not sign in
            changeState(STATE_START);
            $('#not-sign-in').show();
            $('#sign-in').hide();
        } else {
            callback(null, this.status, this.response);
        }
    }
}

function onUserInfoFetched(error, status, response) {
    if (!error && status == 200) {
        changeState(STATE_AUTHTOKEN_ACQUIRED);
        var user_info = JSON.parse(response);
        populateUserInfo(user_info);
        $('#not-sign-in').hide();
        $('#sign-in').show();
    } else {
        changeState(STATE_START);
        $('#not-sign-in').show();
        $('#sign-in').hide();
    }
}

function populateUserInfo(user_info) {
    $Info.append( "Hello " + user_info.displayName);
    fetchImageBytes(user_info);
    fetchCircleInfo();
}

function fetchImageBytes(user_info) {
    if (!user_info || !user_info.image || !user_info.image.url) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', user_info.image.url, true);
    xhr.responseType = 'blob';
    xhr.onload = onImageFetched;
    xhr.send();
}

function onImageFetched(e) {
    if (this.status != 200) return;
    var imgElem = document.createElement('img');
    var objUrl = window.URL.createObjectURL(this.response);
    imgElem.src = objUrl;
    imgElem.onload = function() {
        window.URL.revokeObjectURL(objUrl);
    };
    $Info.append(imgElem);
}

function fetchCircleInfo() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.googleapis.com/plus/v1/people/me');
}

$('document').ready(function(){
    xhrWithAuth('GET',
                'https://www.googleapis.com/plus/v1/people/me',
                false,
                onUserInfoFetched);
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

$SignOutButton.click(function () {
    $Info.empty();
    chrome.identity.getAuthToken({'interactive': false}, function(token){
        if (!chrome.runtime.lastError) {
            // Removed the token in the local
            chrome.identity.removeCachedAuthToken({token: token}, function(){});

            // Ask to revoke the token online
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                token);
            xhr.send();

            xhr.onload = function(){
                changeState(STATE_START);
                $('#not-sign-in').show();
                $('#sign-in').hide();
            };
        }
    });
});