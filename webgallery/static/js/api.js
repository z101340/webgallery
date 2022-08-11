/*jshint esversion: 6*/
var api = (function(){
    var module = {};
    
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) _id 
            - (String) title
            - (String) author
            - (Date) date
    
        comment objects must have the following attributes
            - (String) _id
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 

    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, xhr.responseText);
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    module.signup = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
       });
    }
    
    module.signin = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
       });
    }
    
    module.signout = function(){
        send("POST", "/signout/",{} , function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(getUsername());
       });
    }

    // add an image to the gallery
    module.addImage = function(title, file){
        var formData = new FormData();
        formData.append("title", title);
        formData.append("picture", file);
        fetch("/api/image/", {
            method: "POST",
            body: formData
          }).then(response => console.log('Success:', response)).catch(error => console.error('Error:', error));
        notifyImageListeners();
        notifyCommentListeners();
    }
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        send("DELETE", "/api/image/" + imageId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyImageListeners();
       });
    }
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        send("POST", "/api/comments/", {imageId: imageId, content: content}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyCommentListeners();
        });
    }
    
    // delete a comment to an image
    module.deleteComment = function(commentId){
        send("DELETE", "/api/comments/" + commentId + "/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyCommentListeners();
       });
    }

    let imageListeners = [];

    function notifyImageListeners(){
        fetch("/api/image/",{
            method : "GET"
        }).then(response => response.json())
            .then(function(json) {
                imageListeners.forEach(function(listener){
                    listener(json);
            }).catch(error => console.error('Error:', error)); 
        });
    }

    // register an image listener
    // to be notified when an image is added or deleted from the gallery
    module.onImageUpdate = function(listener){
        imageListeners.push(listener);
        notifyImageListeners();
    }

    let userListeners = [];

    let getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }
    
    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    };
    
    module.onUserUpdate = function(listener){
        userListeners.push(listener);
        listener(getUsername());
    }

    let commentListeners = [];

    function notifyCommentListeners(){
        fetch("/api/comments/",{
            method : "GET"
        }).then(response => response.json())
            .then(function(json) {
                console.log(json);
                commentListeners.forEach(function(listener){
                    listener(json);
            }).catch(error => console.error('Error:', error)); 
        });
    }

    // register an comment listener
    // to be notified when a comment is added or deleted to an image
    module.onCommentUpdate = function(listener){
        commentListeners.push(listener);
        notifyCommentListeners();
    }

    let errorListeners = [];
    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }

    module.onError = function(listener){
        errorListeners.push(listener);
    };


    (function refresh(){
        setTimeout(function(e){
            notifyCommentListeners();
            notifyImageListeners();
            refresh();
        }, 1000);
    }());

    return module;
})();