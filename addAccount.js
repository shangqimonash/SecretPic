/**
 * Created by rai on 15/8/7.
 */
var googlePlusUserLoader = (function() {

    var STATE_START=1;
    var STATE_ACQUIRING_AUTHTOKEN=2;
    var STATE_AUTHTOKEN_ACQUIRED=3;

    var state = STATE_START;

    var signin_button;

    function interactiveSignIn() {
        changeState(STATE_ACQUIRING_AUTHTOKEN);

        // @corecode_begin getAuthToken
        // @description This is the normal flow for authentication/authorization
        // on Google properties. You need to add the oauth2 client_id and scopes
        // to the app manifest. The interactive param indicates if a new window
        // will be opened when the user is not yet authenticated or not.
        // @see http://developer.chrome.com/apps/app_identity.html
        // @see http://developer.chrome.com/apps/identity.html#method-getAuthToken
        chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
            if (chrome.runtime.lastError) {
                changeState(STATE_START);
            } else {
                changeState(STATE_AUTHTOKEN_ACQUIRED);
                alert(token);
                var x = new XMLHttpRequest();
                x.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token);
                x.onload = function() {
                    alert(x.response);
                };
                x.send();
            }
        });
        // @corecode_end getAuthToken
    }

    function disableButton(button) {
        button.setAttribute('disabled', 'disabled');
    }

    function enableButton(button) {
        button.removeAttribute('disabled');
    }

    function changeState(newState) {
        state = newState;
        switch (state) {
            case STATE_START:
                enableButton(signin_button);
                //disableButton(revoke_button);
                break;
            case STATE_ACQUIRING_AUTHTOKEN:
                disableButton(signin_button);
                //disableButton(revoke_button);
                break;
            case STATE_AUTHTOKEN_ACQUIRED:
                disableButton(signin_button);
                //enableButton(revoke_button);
                break;
        }
    }

    function revokeToken() {
        chrome.identity.getAuthToken({'interactive': false},
            function (current_token) {
                if (!chrome.runtime.lastError) {

                    // @corecode_begin removeAndRevokeAuthToken
                    // @corecode_begin removeCachedAuthToken
                    // Remove the local cached token
                    chrome.identity.removeCachedAuthToken({token: current_token},
                        function () {
                        });
                    // @corecode_end removeCachedAuthToken

                    // Make a request to revoke token in the server
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                        current_token);
                    xhr.send();
                    // @corecode_end removeAndRevokeAuthToken

                    // Update the user interface accordingly
                    changeState(STATE_START);
                }
            });
    }

    return {
        onload: function () {
            signin_button = document.querySelector('#signinButton');
            signin_button.addEventListener('click', interactiveSignIn);

            //revoke_button = document.querySelector('#revoke');
            //revoke_button.addEventListener('click', revokeToken);

            // Trying to get user's info without signing in, it will work if the
            // application was previously authorized by the user.
            //getUserInfo(false);
        }
    };

})();

window.onload = googlePlusUserLoader.onload;