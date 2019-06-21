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
        modifyClassName(['invisible'], ['visible'], { id: 'error-msg' })
    }
    x.addEventListener('focus', removeErrMsg)
    x.addEventListener('keydown', removeErrMsg)
}

function signIn() {
    firebase.auth().signInWithEmailAndPassword(emailInput.value, passwdInput.value).then(function () {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                firebase.auth().currentUser.getIdToken().then(function (token) {
                    fetch(`/auth?token=${token}`)
                        .then(response => response.json())
                        .then(function (data) {
                            if (data.isAdmin) {
                                window.location = `${window.origin}/${data.url}`
                            } else {
                                errorMsg.classList.add('invisible')
                                window.location = `${window.origin}/dashboard/dashboard.html`
                            }
                        })
                        .catch(error => reject(error))
                })
            }
        })
    })
        .catch(function (error) {
            console.log(Error(error))
            errorMsg.classList.remove('invisible')
            const errorMsgs = {
                'auth/user-not-found': 'This email is not yet registered',
                'auth/invalid-email': 'Invalid email format',
                'auth/wrong-password': 'Incorrect username or password'
            }
            errorMsg.innerText = errorMsgs[error.code]
        })
}