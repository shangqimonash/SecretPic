/**
 * Created by rai on 15/8/17.
 */
var STATE_START=1;
var STATE_ACQUIRING_AUTHTOKEN=2;
var STATE_AUTHTOKEN_ACQUIRED=3;

var state = STATE_START;

var $SignInButton = $('#signin-Button');
var $Info = $('#userInfo');
var $FriendList = $('#friend-List');
var $ApplyButton = $('#apply-Button');
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
            callback(null, this.status, this.response, access_token);
        }
    }
}

function onUserInfoFetched(error, status, response, token) {
    if (!error && status == 200) {
        changeState(STATE_AUTHTOKEN_ACQUIRED);
        var user_info = JSON.parse(response);
        populateUserInfo(user_info);
    } else {
        changeState(STATE_START);
        $('#not-sign-in').show();
        $('#sign-in').hide();
    }
}

function onCircleInfoFetched(error, status, response, token) {
    if (!error && status == 200) {
        changeState(STATE_AUTHTOKEN_ACQUIRED);
        var circle_info = JSON.parse(response);
        populateCircleInfo(circle_info, token);
        $('#not-sign-in').hide();
        $('#sign-in').show();
    } else {
        changeState(STATE_START);
        $('#not-sign-in').show();
        $('#sign-in').hide();
    }
}

function populateUserInfo(user_info) {
    fetchImageNames(user_info, 1);
}

function populateCircleInfo(circle_info, token) {
    var numItems = circle_info.totalItems;
    for (var i = 0; i < numItems; i++) {
        if (circle_info.items[i] !== undefined) {
            fetchImageNames(circle_info.items[i], 0);
        }
    }
    if (circle_info.nextPageToken === undefined) {
        return;
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://www.googleapis.com/plus/v1/people/me/people/visible?pageToken=' + circle_info.nextPageToken);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.onload = function () {
            if (this.status === 200) {
                var circle_info = JSON.parse(this.response);
                populateCircleInfo(circle_info);
            }
        };
        xhr.send();
    }
}

function fetchImageNames(user_info, user) {
    if (!user_info || !user_info.image || !user_info.image.url) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', user_info.image.url, true);
    xhr.responseType = 'blob';
    if(user)
        xhr.onload = function () {
            if (this.status != 200) return;
            var imgElem = document.createElement('img');
            var objUrl = window.URL.createObjectURL(this.response);
            imgElem.src = objUrl;
            imgElem.onload = function() {
                window.URL.revokeObjectURL(objUrl);
            };
            $Info.append(imgElem);
            $Info.append("Hello, " + user_info.displayName);
        };
    else
        xhr.onload = function(){
            if (this.status != 200) return;
            var imgElem = document.createElement('img');
            var objUrl = window.URL.createObjectURL(this.response);
            imgElem.src = objUrl;
            imgElem.onload = function() {
                window.URL.revokeObjectURL(objUrl);
            };
            $FriendList.append("<label>");
            if(localStorage.getItem(user_info.id) !== null)
                $FriendList.append("<input type='checkbox' value=" + user_info.id + " checked=true>");
            else
                $FriendList.append("<input type='checkbox' value=" + user_info.id + " checked＝false>");
            $FriendList.append(imgElem);
            $FriendList.append(user_info.displayName);
            $FriendList.append("</label>");
            $FriendList.append("</br>");


        };
    xhr.send();
}

$('document').ready(function(){
    xhrWithAuth('GET',
                'https://www.googleapis.com/plus/v1/people/me',
                false,
                onUserInfoFetched);
    xhrWithAuth('GET',
                'https://www.googleapis.com/plus/v1/people/me/people/visible',
                false,
                onCircleInfoFetched);
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

$ApplyButton.click(function(){
    $('#friend-List input[type="checkbox"]').each(function(){
        var id = $(this).attr("value");
        if($(this).prop("checked")){
            if(!localStorage.getItem(id)){
                localStorage[id] = 1;
            }
        }
        else {
            if(localStorage.getItem(id) > 1);
            else{
                localStorage.removeItem(id);
            }
        }

    });
    alert("New Sharing List applied.");
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