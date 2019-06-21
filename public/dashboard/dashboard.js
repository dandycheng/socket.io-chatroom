const header = document.getElementsByTagName('header')[0]
const main = document.getElementsByTagName('main')[0]
const joinRoomBtn = document.getElementById('join-room')
const newRoomBtn = document.getElementById('new-room')
const modal = document.getElementById('modal')
const overlay = document.getElementById('overlay')
const overlayModalWrapper = document.getElementById('overlay-modal-wrapper')
const logOutBtn = document.getElementById('logOutBtn')

const showModal = (placeholderText, btnText) => {
    modal.innerHTML = `
			<form class='h-100 d-flex flex-column justify-content-center'>
				<div id='modal-content' class='form-group d-flex flex-column'>
				<label>${placeholderText}</label>
					<input type='text' max=15 class='form-control w-100 m-3'>
                       <p id='room-action-response' class='text-success invisible'>Room created</p>
					<button class='btn btn-primary' id='submitRoomNameBtn'>${btnText}</button>
				</div>
			</form>
		`,
        roomInput = document.querySelector('#modal-content > input')

    overlayModalWrapper.classList.remove('d-none')
    overlayModalWrapper.classList.add('d-flex')

    document.getElementById('submitRoomNameBtn').onclick = e => {
        e.preventDefault()
        if (roomInput.value.length !== 0) {
            if (btnText.includes('Create')) {
                createRoom()
            } else {
                joinRoom(roomInput.value)
            }
        }
    }
    document.body.onkeyup = e => {
        if (e.keyCode === 27 && !overlay.className.includes('d-none'))
            overlayModalWrapper.classList.add('d-none')
    }
    roomInput.focus()
}

const createRoom = () => {
    let responseMsg = document.getElementById('room-action-response')
    responseMsg.textContent = 'Please wait...'
    responseMsg.className = 'text-secondary'
    initChatroomFetch(roomInput.value, false)
}

const joinRoom = () => {
    let responseMsg = document.getElementById('room-action-response')
    responseMsg.textContent = 'Please wait...'
    responseMsg.className = 'text-secondary'
    initChatroomFetch(roomInput.value, true)
}

document.body.onload = () => {
    main.style.paddingTop = `${header.clientHeight + 30}px`
}


joinRoomBtn.onclick = () => showModal('Enter room ID', 'Join room')

newRoomBtn.onclick = () => showModal('Enter a room name', 'Create room')

overlay.onclick = () => {
    overlayModalWrapper.classList.remove('d-flex')
    overlayModalWrapper.classList.add('d-none')
}

logOutBtn.onclick = () => {
    firebase.auth().signOut().then(() => window.location.replace('../login/login.html'))
}


/** API **/
function initChatroomFetch(/** Value retrieved from input box */roomInput, isJoin) {
    firebase.auth().currentUser.getIdToken().then(token => {
        fetch(`${window.origin}/checkRoomExistence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userToken: token,
                roomName: isJoin ? null : roomInput,
                roomId: isJoin ? roomInput : null,
                isJoin: isJoin
            })
        })
            .then(response => response.json())
            .then(function (roomData) {
                if (roomData.result.includes('/exists'))
                    joinExistingChatroom(roomData.data.roomId)
                else {
                    if (!isJoin) {
                        newChatroom()
                    } else {
                        let responseMsg = document.getElementById('room-action-response')
                        responseMsg.textContent = 'Room ID does not exist'
                        modifyClassName(['text-danger'], ['text-secondary'], { id: 'room-action-response' })
                    }
                }
            })
            .catch(error => console.log(error))
    })
}

function newChatroom() {
    firebase.auth().currentUser.getIdToken().then(function (token) {
        fetch("http://localhost:8080/newChatroom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                roomName: roomInput.value,
                userToken: token
            })
        }).then(response => {
            if (response.status === 200) {
                let data = response.json()
                console.log(data)
                data.then(fetchResult => {
                    console.log(fetchResult)
                    if (fetchResult.result.includes('room-created')) {
                        localStorage.setItem('userId', firebase.auth().currentUser.uid)
                        let responseMsg = document.getElementById('room-action-response')
                        responseMsg.textContent = 'Room created'
                        modifyClassName(['text-success'], ['text-secondary'], { id: 'room-action-response' })
                        window.location = `${window.origin}/chatroom/chatroom.html?roomId=${fetchResult.data.roomId}`
                    }
                    else {
                        return alert("Error has occured")
                    }
                })
            } else {
                console.log('An error has occured', response)
            }
        })
    })
}

function joinExistingChatroom(roomId) {
    console.log(roomId)
    firebase.auth().currentUser.getIdToken().then(token => {
        fetch(`${window.origin}/joinRoom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: roomId,
                userToken: token,
            })
        })
            .then(response => console.log(response))
            .then(function (data) {
                console.log(data)
                localStorage.setItem('userId', firebase.auth().currentUser.uid)
                let responseMsg = document.getElementById('room-action-response')
                responseMsg.textContent = 'Joining...'
                modifyClassName(['text-success'], ['text-secondary'], { id: 'room-action-response' })
                return window.location = `${window.origin}/chatroom/chatroom.html?roomId=${roomId}`
            })
    })
}

/** Utils **/

function modifyJSON(JSONString, properties) {
    let JsonObj = JSON.parse(JSONString)
    for (let x in properties)
        JsonObj[x] = properties[x]
    return JSON.stringify(JsonObj)
}
