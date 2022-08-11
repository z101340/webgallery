/*jshint esversion: 6*/
(function(){
    "use strict";

    api.onError(function(err){
        console.error("[error]", err);
    });
    
    api.onError(function(err){
        var error_box = document.querySelector('#error_box');
        error_box.innerHTML = err;
        error_box.style.visibility = "visible";
    });

    var curr = 0;
    var max = 0;
    var curpic = "";
    api.onImageUpdate(function(image){
        var img = image[curr];
        max = image.length;
        curpic = img._id;
        document.querySelector('#images').innerHTML = '';
        var elmt = document.createElement('div');
        elmt.className = "image";
        elmt.id = img._id;
        var src = "/api/image/" + img._id + "/";
        elmt.innerHTML=`
            <img class="image" src=${src} alt="${img.title}">
            <div class="title">title: ${img.title}</div>
            <div class="author">author: ${img.author}</div>
            <div class="date">date: ${img.date}</div>
        `;
        document.querySelector("#images").prepend(elmt);
 
    });

    api.onCommentUpdate(function(comments){
        console.log(curpic);
        document.querySelector('#comments').innerHTML = '';
        comments.forEach(function(comment){
            if(comment.imgId == curpic){
                var elmt = document.createElement('div');
                elmt.className = "comment";
                elmt.id = comment._id;
                elmt.innerHTML=`
                    <div class="com_author">Author: ${comment.author}</div>
                    <div class="com_content">Comment: ${comment.content}</div>
                    <div class="com_date">Date: ${comment.date}</div>
                    <button id="delcom">delete</button>
                `;
                elmt.querySelector("#delcom").addEventListener('click', function(){
                    api.deleteComment(comment._id);
                });
                document.querySelector("#comments").prepend(elmt);
            }
        });
    });

    // api.onUserUpdate(function(username){
    //     console.log(username);
    //     document.querySelector("#signin_button").style.visibility = (username)? 'hidden' : 'visible';
    //     document.querySelector("#signout_button").style.visibility = (username)? 'visible' : 'hidden';
    //     document.querySelector('#create_comment_form').style.visibility = (username)? 'visible' : 'hidden';
    //     document.querySelector("#create_image_form").style.visibility = (username)? 'hidden' : 'visible';
    // });

    window.addEventListener('load', function(){
        document.querySelector('#create_image_form').addEventListener('submit', function(e){        
            e.preventDefault();
            var name = document.querySelector("#image_name").value;
            var file = document.querySelector("#picture").files[0];
            document.getElementById('create_image_form').reset();
            api.addImage(name, file);
        });

        document.querySelector('#create_comment_form').addEventListener('submit', function(e){
            e.preventDefault();
            var content = document.querySelector("#comment_content").value;
            var imgId = document.querySelector(".image").id;
            document.getElementById('create_comment_form').reset();
            api.addComment(imgId, content);
        });

        document.querySelector("#delete").addEventListener('click', function(){
            var imgId = document.querySelector(".image").id;
            api.deleteImage(imgId);
        });

        document.querySelector('#prev').addEventListener('click', function(){
            if(curr == 0){
                alert("first picture")
            }
            else{
                curr -= 1;
            }
        });

        document.querySelector('#next').addEventListener('click', function(){
            if(curr == (max - 1)){
                alert("last picture")
            }
            else{
                curr += 1;
            }
        });
    });

}());