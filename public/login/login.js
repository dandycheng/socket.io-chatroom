const emailInput = document.getElementById('email-input')
const passwdInput = document.getElementById('passwd-input')
const loginBtn = document.getElementById('login-btn')
const errorMsg = document.getElementById('error-msg')

loginBtn.onclick = e => {
    e.preventDefault()
    signIn()
}

// Emptying input fields
for (let x of document.getElementsByTagName('input')) {
    function removeErrMsg() {
        errorMsg.classList.add('invisible')
        errorMsg.classList.remove('d-block')
    }
    x.addEventListener('focus', removeErrMsg)
    x.addEventListener('keydown', removeErrMsg)
}

function signIn() {
    return new Promise(function (resolve, reject) {
        firebase.auth().signInWithEmailAndPassword(emailInput.value, passwdInput.value)
            .then(() => {
                firebase.auth().onAuthStateChanged(user => {
                    if (user){
                        firebase.auth().currentUser.getIdToken().then(function(token){
                        fetch(`/auth?token=${token}`).then(response => response.json())
                            .then(function(data){
                                console.log(data)
                                if(data.isAdmin)
                                    window.location = `${window.origin}/${data.url}`
                                else{
                                    errorMsg.classList.add('invisible')
                                        window.location = `${window.origin}/dashboard/dashboard.html`
                                }
                            })
                            .catch(err => console.log(err))
                        })
                    }
                })
            })
            .catch(function(err){
                console.log(err)
                errorMsg.classList.remove('invisible')
                const errorMsgs = {
                    'auth/user-not-found':'This email is not yet registered',
                    'auth/invalid-email':'Invalid email format',
                    'auth/wrong-password':'Incorrect username or password'
                }
                errorMsg.innerText = errorMsgs[err.code]
            })
    })
}