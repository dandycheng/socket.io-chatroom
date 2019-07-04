// Services
const db = require('../services/mongodb')
const firebase = require('./firebase-admin')
const util = require('./../util/util')


exports.initSocket = function (socket) {
    let nspData

    socket.on('connection', function (connectionData) {
        console.log('CONNECTED')
        console.log(connectionData)
        nspData = {
            userToken: connectionData.userToken,
            roomId: connectionData.roomId
        }
        firebase.verifyIdToken(connectionData.userToken).then(function (userData) {
            let userStatus = {
                userId: userData.user_id,
                displayName: userData.name,
                status: 'online'
            }
            console.log('line 23',userStatus)
            socket.broadcast.emit('userJoin', userStatus)
        })
    })

    socket.on('sendMessage', function sendMessage(chatMessageConfig) {
        console.log('SEND MESSAGE LISTENTER CALLED\nMessage data:', chatMessageConfig)
        // Updates chatroom database
        firebase.verifyIdToken(chatMessageConfig.userData.userToken)
            .then(function (userData) {
                if (userData) {

                    // Faster than using delete
                    chatMessageConfig.userData.userToken = undefined
                    chatMessageConfig.payload.displayName = userData.name
                    db.insertDocumentData('chatroomDb', 'chatroom', { roomId: chatMessageConfig.mainConfig.roomId },
                        { messages: chatMessageConfig.payload })
                        .then(function (insertResponse) {
                            if (insertResponse && chatMessageConfig.payload) {
                                // Used for client side timestamp modification (DOM)
                                socket.emit('notifyMessageSent', chatMessageConfig.payload.messageId)
                                socket.broadcast.emit('receiveNewMessage', chatMessageConfig)
                            }
                        })
                        .catch(error => console.log(error))
                }
            })
    })

    socket.on('leaveRoom', function (token) {
        console.log('LEAVE ROOM LISTENER CALLED')
        firebase.verifyIdToken(token).then(function (userData) {
            util.log(60, 'leaveRoom', userData)
            db.deleteOneArrayElement('chatroomDb', 'chatroom', { participants: userData.user_id }, { participants: userData.user_id })
                .then(function (result) {
                    console.log('EMITTING "leaveRoomAck"')
                    if (result) {
                        let userStatus = {
                            userId: userData.user_id,
                            isOnline: false,
                            isParticipant: false
                        }
                        console.log('EMITTING "updateUserStatus"\nData:\n', userStatus)
                        socket.broadcast.emit('updateUserStatus', userStatus)
                        socket.emit('leaveRoomAck', {
                            status: 1,
                            result: 'chatroom/left-chatroom'
                        })
                    } else {
                        socket.emit('leaveRoomAck', {
                            status: -1,
                            data: { error: 'No need, user is not in the chatroom' }
                        })
                    }
                })
            db.hasKeyData('chatroomDb', 'chatroom', { participants: userData.user_id }, true)
                .then(function (response) {
                    if (response.participants.length === 1) {
                        console.log('REMOVED USER FROM CHATROOM COLLECTION')
                        db.deleteOneDocument('chatroomDb', 'chatroom', { roomId: response.roomId }).catch(error => console.log(error))
                    }
                })
        })
    })
    
    // Socket connection
    socket.on('disconnect', function () {
        console.log(nspData)
        firebase.verifyIdToken(nspData.userToken).then(function (userData) {
            db.updateOneDocField('usersDb', 'users', { userId: userData.user_id }, { status: 'offline' })
            db.hasKeyData('chatroomDb', 'chatroom', { participants: userData.user_id }).then(function (response) {
                if (response) {
                    let userStatus = {
                        userId: userData.user_id,
                        isOnline: false,
                        isParticipant: response
                    }
                    socket.broadcast.emit('updateUserStatus', userStatus)
                }
            })
        })
    })
}


