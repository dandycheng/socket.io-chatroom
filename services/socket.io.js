const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const db = require('../services/mongodb')
const uniqid = require('uniqid')
const firebase = require('./firebase-admin')
const util = require('./../util/util')
const index = require('../index')


exports.initSocket = function (socket) {
    let nspData = {}
    socket.on('test', function () {
        console.log('\nTEST\n')
    })

    socket.on('connection', function (connectionData) {
        nspData.userToken = connectionData.userToken
        nspData.roomId = connectionData.roomId
        firebase.verifyIdToken(connectionData.userToken).then(function (userData) {
            socket.broadcast.emit('userJoin', { userId: userData.user_id, displayName: userData.name, status: 'online' })
        })
    })


    util.log(13, 'INITIALIZED SOCKET')
    socket.on('sendMessage', function sendMessage(chatMessageConfig) {
        // Updates chatroom database
        let messageData = chatMessageConfig
        firebase.verifyIdToken(chatMessageConfig.userData.userToken)
            .then(function (userData) {
                if (userData) {
                    messageData.payload.displayName = userData.name
                    db.insertDocumentData('chatroomDb', 'chatroom', {
                        roomId: messageData.mainConfig.roomId
                    },
                        { messages: messageData.payload })
                        .then(function (insertResponse) {
                            if (insertResponse && messageData.payload) {
                                socket.emit('notifyMessageSent', messageData.payload.messageId)
                                socket.broadcast.emit('receiveNewMessage', messageData)
                            }
                        })
                        .catch(err => console.log(err))
                }
            })
    })

    socket.on('leaveRoom', function (token) {
        // TODO: Update users list on leave
        firebase.verifyIdToken(token).then(function (userData) {
            util.log(60, 'leaveRoom', userData)
            db.deleteOneArrayElement('chatroomDb', 'chatroom', { participants: userData.user_id }, { participants: userData.user_id })
                .then(function (result) {
                    if (result) {
                        console.log('UPDATE USER STATUS')
                        socket.broadcast.emit('updateUserStatus', {
                            userId: userData.user_id,
                            isOnline: false,
                            isParticipant: false
                        })
                        socket.emit('leaveRoomAck', {
                            status: 1,
                            result: 'chatroom/left-chatroom'
                        })
                    } else {
                        socket.emit('leaveRoomAck', {
                            status: -1,
                            data: { err: 'No need, user is not in the chatroom' }
                        })
                    }
                })
            db.hasKeyData('chatroomDb', 'chatroom', { participants: userData.user_id }, true)
                .then(function (response) {
                    if (response.participants.length === 1) {
                        db.deleteOneDocument('chatroomDb', 'chatroom', { roomId: response.roomId }).catch(err => console.log(err))
                    }
                })
        })
    })
    // Socket connection
    socket.on('disconnect', function () {
        console.log('USER DISCONNECTED')
        firebase.verifyIdToken(nspData.userToken).then(function (userData) {
            db.updateOneDocField('usersDb', 'users', { userId: userData.user_id }, { status: 'offline' })
            db.hasKeyData('chatroomDb', 'chatroom', { participants: userData.user_id }).then(function (response) {
                console.log(response)
                if (response)
                    socket.broadcast.emit('updateUserStatus', { userId: userData.user_id, isOnline: false, isParticipant: response })
            })
            socket.removeAllListeners()
        })
    })
}


