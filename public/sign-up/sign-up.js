const signUpWrapper = document.getElementById('sign-up-wrapper')
const validation = document.getElementsByClassName('validation')
const responseMsg = document.getElementById('response-msg')
const signUpBtn = document.getElementById('sign-up-btn')
const usernameInput = document.getElementById('username')
const emailInput = document.getElementById('email')
const passwdInput = document.getElementById('passwd')
const confirmPasswdInput = document.getElementById('confirm-passwd')

document.body.onload = () => signUpWrapper.style.transform = 'translate(0)'


// Emptying input fields
for (let x of document.getElementsByTagName('input')) {
	function removeErrMsg() {
		modifyClassName(['invisible'], ['visible'], { id: 'response-msg' })
	}
	x.addEventListener('focus', removeErrMsg)
	x.addEventListener('keydown', removeErrMsg)
}

signUpBtn.onclick = e => {
	e.preventDefault()
	modifyClassName(['visible'], ['invisible'], { id: 'response-msg' })
	responseMsg.textContent = 'Validating...'
	let validated = false, lengthValidation = 1
	for (let x of validation) {
		lengthValidation *= x.value.length
		if (lengthValidation !== 0) {
			if (passwdInput.value.length < 6 || passwdInput.value !== confirmPasswdInput.value) {
				responseMsg.textContent = (passwdInput.value.length < 6) ? 'Password must be at least 6 characters long' : 'Password does not match'
				validated = false
			} else
				validated = true
		}else{
			responseMsg.textContent = 'Fields cannot be empty'
		}
	}
	if (validated) {
		e.preventDefault()
		firebase.auth().createUserWithEmailAndPassword(emailInput.value, passwdInput.value)
			.then(function () {
				firebase.auth().currentUser.updateProfile({ displayName: usernameInput.value })
				modifyClassName(['text-success'], ['text-danger'], { id: 'response-msg' })
				responseMsg.textContent = 'Successfully registered!'
				fetch('http://localhost:8080/signUp', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						displayName: usernameInput.value,
						userId: firebase.auth().currentUser.uid
					})
				})
					.then(function (response) {
						if (response.status === 200) {
							firebase.auth().signOut().then(function () {
								window.location = `${window.origin}/login/login.html`
							})
						}
					})
			})
			.catch(function (error) {
				let errorMessages = {
					'auth/email-already-in-use': 'This account is already registered',
					'auth/invalid-email': 'Invalid email format'
				}
				responseMsg.textContent = errorMessages[error.code]
			})
	}
}