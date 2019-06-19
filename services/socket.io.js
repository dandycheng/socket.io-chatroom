const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const db = require('../services/mongodb')
const uniqid = require('uniqid')
const firebase = require('./firebase-admin')
const util = require('./../util/util')
const index = require('../index')


exports.initSocket = function(socket){
    socket.on('test',function(data){
        firebase.verifyIdToken(data).then(function(){
            console.log('\nTEST\n')
        })
    })
    util.log(13,'INITIALIZED SOCKET')
    socket.on('sendMessage', function sendMessage(chatMessageConfig) {
        // Updates chatroom database
        let messageData = chatMessageConfig
        firebase.verifyIdToken(chatMessageConfig.userData.userToken)
        .then(function (token) {
            if (token) {
                messageData.payload.displayName = token.name
                db.insertDocumentData('chatroomDb', 'chatroom', {
                    roomId: messageData.mainConfig.roomId
                },
                    { messages: messageData.payload })
                    .then(function (insertResponse) {
                        if (insertResponse.result.n && messageData.payload) {
                            socket.emit('notifyMessageSent')
                            socket.broadcast.emit('receiveNewMessage', messageData)
                        }
                    })
                    .catch(err => console.log(err))
                }
            })
    })
    socket.on('newParticipant', function (participantData) {
        socket.broadcast.emit('newParticipant', participantData)
    })
    socket.on('getUniqueId', function () {
        /**
         *  Used to indicate user online / offline status
         */
        socket.emit('getUniqueId', uniqid())
    })

    socket.on('connection', function (/** @type {{userId:string,roomId:string}} */data) {
        console.log('CONNECTED --> CHATROOM MODULES' + temp)
        // Update nsp users
        db.insertDocumentData('nspDb', 'nsp', { userId: data.userId }, { users: data.userId })
            .catch(err => console.log("LINE 189" + temp, err))
    
        // ! Update online statuses (API)
        const updateUserStatus = new Promise(function (resolve, reject) {
            db.insertDocumentData('usersDb', 'users', { userId: data.userId }, {
                status: 'online'
            }).then(function (response) {
                if (err) reject(err)
                resolve(response.result.ok)
            })
        })
        // ! Get user statuses (API)
        const getUserStatus = new Promise(function (resolve, reject) {
            updateUserStatus.then(function (response) {
                if (response) {
                    db.getOneDocumentData('usersDb', 'users', { userId: userId })
                        .then(userData => resolve({ status: userData.status, identifier: userData.identifier }))
                }
            })
        })
    
        Promise.all([updateUserStatus, getUserStatus]).then(function (values) {
            console.log(values)
            let userStatus = values[0]
            socket.emit('updateUserStatus', userStatus)
        })
    })
    socket.on('disconnect', function () {
        console.log('DISCONNECT')
        //check is this user is the last user, if last user, then remove namespace.
        socket.removeAllListeners()
    })
    socket.on('reconnect', function () {
        console.log('RECONNECT')
    })
    
    /**
     *  TODO:
     *      - Add auto reconnect feature
     *          > Refreshing messages on reconnect
     *          > Online status refresh on reconnect
     *      - Add user status in chatroom (online / offline)
     *      - Mongoose
     *
     */
    
}


