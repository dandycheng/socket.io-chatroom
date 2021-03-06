const header = document.getElementsByTagName('header')[0]
const main = document.getElementsByTagName('main')[0]
const chatComponents = document.getElementById('chat-components')
const chatArea = document.getElementById('chat-area')
const chatInteractiveArea = document.getElementById('chat-interactive-area')
const chatTextbox = document.getElementById('chat-textbox')
const endChat = document.getElementById('end-chat')
const exportChat = document.getElementById('export-chat')
const sendBtn = document.getElementById('send-btn')
const logOutBtn = document.getElementById('log-out-btn')
const users = document.getElementById('users')
const usersList = document.getElementById('users-list')
const userListToggle = document.getElementById('users-list-toggle')
const responseMsg = document.getElementById('response-msg')
const overlay = document.getElementById('overlay')

let userId = localStorage.userId
let url = new URL(window.location)
let roomId = url.searchParams.get('roomId')

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        initChatroom()
        getChatroomData()
    }
})

function initChatroom() {
    chatArea.innerHTML = ''
    modifyClassName(['visible'], ['invisible'], { id: 'overlay' })
    establishConnection()
        .then(function (nspCreated) {
            console.log(nspCreated)
            socket = io(`/chatroom/${roomId}`)

            // Chatroom updates
            socket.emit('isParticipant', { roomId: roomId, userId: userId })
            socket.on('userJoin', function (data) {
                if (!document.getElementById(data.userId))
                    appendUsersList(data.displayName, data.userId, data.status)
                else
                    modifyClassName(['bg-success'], ['bg-secondary'], { id: data.userId })
            })
            socket.on('receiveNewMessage', function (data) {
                console.log(data)
                let isRespondent = data.payload.author !== userId
                if (isRespondent)
                    generateChatBubble(data.payload.displayName, data.payload.content, isRespondent, true, data.payload.timestamp)
            })
            socket.on('notifyMessageSent', function (messageId) {
                console.log('sent')
                modifyClassName(['badge-info'], ['badge-light'], { id: messageId })
            })
            socket.on('leaveRoomAck', function (response) {
                console.log('LEFT ROOM', response)
                if (response.status > 0) {
                    responseMsg.innerText = 'Leaving chatroom'
                    modifyClassName(['visible'], ['invisible'], { id: 'overlay' })
                    window.location = `${window.origin}/dashboard/dashboard.html`
                }
            })
            // Socket connection
            socket.on('updateUserStatus', function (userStatusData) {
                if (document.getElementById(userStatusData.userId)) {
                    console.log(userStatusData)
                    if (userStatusData.isParticipant) {
                        if (userStatusData.isOnline) {
                            modifyClassName(['bg-success'], ['bg-secondary'], { id: userStatusData.userId })
                        } else {
                            modifyClassName(['bg-secondary'], ['bg-success'], { id: userStatusData.userId })
                        }
                    } else {
                        if (userStatusData.isParticipant !== undefined)
                            removeUserFromList(userStatusData.userId)
                    }
                }
            })
            socket.on('disconnect', function () {
                responseMsg.innerText = 'DISCONNECTED\nPlease check your connection'
                modifyClassName(['visible'], ['invisible'], { id: 'overlay' })
                modifyClassName(['bg-secondary'], ['bg-success'], { id: userId })
            })
            socket.on('reconnect', function () {
                modifyClassName(['bg-success'], ['bg-secondary'], { id: userId })
                chatArea.innerHTML = ''
                responseMsg.innerText = 'RECONNECTED\nReinitializing chatroom'
                modifyClassName(['visible'], ['invisible'], { id: 'overlay' })

                // Reinitialize chatroom
                socket.removeAllListeners()
                initChatroom()
                getChatroomData()
            })
        })
}

/**
 * Establishes namespace
 * 
 * @returns Promise --> resolve(<boolean>), reject(<error>)
 */
function establishConnection() {
    return new Promise(function (resolve, reject) {
        fetch(`${window.origin}/chatroom?roomId=${roomId}`)
            .then(response => response.json())
            .then(function (data) {
                if (data.result.includes('successful')) {
                    resolve(true)
                }
            })
            .catch(error => reject(error))
    })
}

/** Includes messages and display names */
function getChatroomData() {
    firebase.auth().currentUser.getIdToken()
        .then(function (token) {
            fetch(`${window.origin}/getChatroomData`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userToken: token,
                    roomId: roomId
                })
            })
                .then(response => response.json())
                .then(function (chatroomData) {
                    console.log(chatroomData)
                    if(chatroomData.result && chatroomData.result.includes('not-a-participant')){
                        responseMsg.innerText = "NO ACCESS\nYou are not a participant of this chatroom."
                        modifyClassName(['visible'], ['invisible'], { id: 'overlay' })
                    }else{
                        if (chatroomData.messages.length > 0) {
                            for (let x of chatroomData.messages) {
                                let isRespondent = x.author !== userId
                                generateChatBubble(x.displayName, x.content, isRespondent, true, x.timestamp)
                            }
                        }
                        for (let x of chatroomData.participants)
                            appendUsersList(x.displayName, x.userId, x.status)
                        modifyClassName(['invisible'], ['visible'], { id: 'overlay' })
    
                        firebase.auth().currentUser.getIdToken().then(function (token) {
                            socket.emit('connection', { userToken: token, roomId: roomId })
                        })
                    }
                })
                .catch(error => console.log(error))
        })
        .catch(error => console.log(error))
}


// Event listeners (DOM)
document.body.onload = () => adjustMainContent()
document.body.onresize = () => adjustMainContent()

// #region      Event Listeners (Elements)

endChat.onclick = function () {
    firebase.auth().currentUser.getIdToken().then(function (token) {
        socket.emit('leaveRoom', token)
    })
}

exportChat.onclick = () => {
    firebase.auth().currentUser.getIdToken().then(function (token) {
        modifyClassName(['visible'], ['invisible'], { id: 'overlay' })
        responseMsg.innerText = 'Exporting chat...'
        fetch(`${window.origin}/exportChatData?roomId=${roomId}&token=${token}`)
            .then(function (response) {
                if (response.status === 200) {
                    window.open(`${window.origin}/exportChatData?roomId=${roomId}&token=${token}`)
                    responseMsg.innerText = 'Chat exported'
                    modifyClassName(['invisible'], ['visible'], { id: 'overlay' })
                } else {
                    responseMsg.innerText = "You don't have enough privileges to export chat data"
                    setTimeout(() => {
                        modifyClassName(['invisible'], ['visible'], { id: 'overlay' })
                    }, 2000)
                }
            })
    })
}

chatTextbox.onkeydown = e => {
    if (!e.shiftKey) {
        (chatTextbox.innerText.length > 500 && e.keyCode !== 8) && (e.preventDefault()) // Limit message length

        // Prevents placement of space and "\n" when there are no non-whitespace content
        // keyCode 13 -> Enter, keyCode 32 -> Space
        if ((e.keyCode === 13 || e.keyCode === 32) && chatTextbox.innerText.length !== 0) {
            if (!e.shiftKey && e.keyCode === 13) {
                e.preventDefault() // Prevent showing "\n" placement before sending
                sendBtn.click()
            }
        }

        // Remove text formatting (i.e URL pasted will be formatted to an anchor)
        const removeTextFormatting = setTimeout(() => { chatTextbox.textContent = chatTextbox.textContent })
        setTimeout(() => { clearInterval(removeTextFormatting) }, 10)
        chatTextbox.focus()
    }
}

sendBtn.onclick = () => {
    let userDisplayName = firebase.auth().currentUser.displayName
    let messageContent = chatTextbox.innerText.trim()
    generateChatBubble(userDisplayName, messageContent, false, false)
}

logOutBtn.onclick = () => {
    firebase.auth().signOut()
        .then(() => window.location.replace(`${window.origin}/login/login.html`))
}

// #endregion

// #region      Functions

function adjustMainContent() {
    // Adjust main contents' components' sizing / position
    users.style.width = (document.body.clientWidth <= 780) ? '100%' : '25%'
    users.style.transform = `translateX(${users.clientWidth - 15}px)`
    main.style.height = `${document.body.clientHeight - header.clientHeight}px`
    chatComponents.style.width = `${document.body.clientWidth - users.clientWidth}px`

    chatTextbox.focus()
}


/**
 *  Appends new chat bubble to chat area.
 */
function generateChatBubble(/**@type string */displayName,/**@type string */ content,/**@type boolean */ isRespondent,/**@type boolean */ isFetch, timestamp = null) {

    const date = new Date()
    if (timestamp)
        date.setTime(timestamp)

    let chatBubbleposition = (isRespondent) ? 'chat-bubble-left' : 'chat-bubble-right'
    let userIconOrder = (isRespondent) ? 'order-1' : 'order-3'

    let chatBubbleMsg =
        // #region chat bubble HTML
        `
        <div class='d-flex flex-column mt-4'>
            <p class='text-white ${(isRespondent) ? "text-left" : "text-right"} pr-3'>${displayName}</p>
            <div class='d-flex ${(isRespondent) ? "justify-content-start" : "justify-content-end"}'>
                <div class='chat-bubble-wrapper d-flex flex-column ${chatBubbleposition} order-2'>
                   <div class='chat-bubble' style='background-color:#3292ff'>
                        <p class='p-3 px-4 m-0' style='color:#fff'></p>
                    </div>
                    <span class='${(isRespondent) ? "timestamp-left" : "timestamp-right"} mt-2 position-relative badge badge-pill ${(isFetch) ? "badge-info" : "badge-light"}'>${date.toLocaleString()}</span>
                </div>
                <div class='user-icon rounded-circle bg-light ${userIconOrder}'></div>
            </div>
        </div>
        `
    // #endregion
    chatArea.innerHTML += chatBubbleMsg
    let messageComponents = {
        chatBubbleText: document.querySelector('#chat-area > div:last-child .chat-bubble p'),
        timestamp: document.querySelector('#chat-area > div:last-child span')
    }

    // Prevents HTML tags to be inserted into chat bubble, which changes the DOM 
    // (i.e. typing "<a href='#'>Hello</a>" into the chat will create an anchor in the chat bubble)
    messageComponents.chatBubbleText.innerText = content
    chatTextbox.innerText = ''
    chatArea.scrollBy(0, chatArea.clientHeight + chatArea.scrollHeight) // Scroll to latest message
    if (!isFetch) {
        let newMessageId = Math.round(Math.random() * Math.pow(10, 10)).toString()
        messageComponents.timestamp.id = newMessageId
        sendMessageToDb(userId, content, Date.now(), newMessageId)
    }
}

/**
 *  Inserts message data into database
 */
function sendMessageToDb(/**@type string */author,/**@type string */ messageContent,/**@type int */ timestamp,/**@type string */ messageId) {

    let userToken
    firebase.auth().currentUser.getIdToken().then(token => userToken = token)
        .then(function () {
            socket.emit('sendMessage', {
                payload: {
                    messageId: messageId,
                    content: messageContent,
                    author: author,
                    timestamp: timestamp,
                },
                userData: {
                    userToken: userToken,
                },
                mainConfig: {
                    roomId: roomId
                }
            })
        })
}

/**
 *  Appends a user's display name to the user online list
 */
function appendUsersList(/**@type string */username,/**@type string */ id,/**@type string */ status) {
    if (document.getElementById(id) === null) {
        usersList.innerHTML +=
            `
            <li class='user d-flex flex-row p-2'>
                <div id='${id}' class='status-indicator m-2 ${status === 'online' ? "bg-success" : "bg-secondary"}'></div>
                ${username}
            </li>
        `
    }
}
/**
 *  Removes a user from the user online list when a user leaves the chatroom
 */
function removeUserFromList(/**@type string */id) {
    let user = document.getElementById(id).parentElement
    user.parentElement.removeChild(user)
}

userListToggle.onclick = function () {
    if (users.style.transform === "") {
        users.style.transform = `translate(${users.clientWidth - 15}px)`
        userListToggle.style.transform = 'rotate(0)'
    }
    else {
        users.style.transform = ''
        userListToggle.style.transform = 'rotate(180deg)'
    }
}