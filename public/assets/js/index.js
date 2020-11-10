$(document).ready(function() {
    $("#usernameForm").on("submit", function(e){
        e.preventDefault()
        console.log("in here")
        var form = document.getElementById('usernameForm')
        if (!form.checkValidity()){
            return false
        }
    
        $.ajax({
            data: { 
                username: form.username.value
            },
            type: "POST",
            url: "/add_new_user",
            
            success: function(response) {
                if(response.success){
                    window.location.href = "/game?game_id=" + response.game_id + "&user_id=" + response.user_id
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    })
    

});