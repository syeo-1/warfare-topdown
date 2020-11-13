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
                    window.location.href = "/lobby?game_id=" + response.game_id + "&user_id=" + response.user_id
                }
                else{
                    $(".flash-message").html(`<div class="alert alert-danger" role="alert">`
                    + response.error +
                  `</div>`).fadeIn().delay(3000).fadeOut()
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    })
});

