//  Node modules
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const uniqid = require('uniqid')
const http = require('http').createServer(app)
const io = require('socket.io')(http)

//  Services
const auth = require('./services/auth')
const db = require('./services/mongodb')
const firebase = require('./services/firebase-admin')
const socketIo = require('./services/socket.io')

const util = require('./util/util')

app.use(bodyParser.json({ extended: true }))
app.use('/', express.static('public'))


app.post('/signUp', function (req, res) {
    // Creates status identifier to track user's online status
    let signUpData = req.body
    let newUser = {
        displayName: signUpData.displayName,
        userId: signUpData.userId,
        status: 'offline',
        isAdmin: false
    }
    db.insertDocument('usersDb', 'users', newUser).then(function (response) {
        if (response)
            res.status(200).send()
    })
        .catch(err => console.log(err))
})

app.get('/auth', function (req, res) {
    /** Includes "token" */let token = req.query.token
    util.log(39, 'data (/auth)', token)
    firebase.verifyIdToken(token).then(function (userData) {
        db.getOneDocumentData('usersDb', 'users', { userId: userData.user_id }).then(function (userDataDb) {
            console.log(userDataDb)
            if (userDataDb.isAdmin)
                return res.status(200).send({ isAdmin: userDataDb.isAdmin, url: 'admin-panel/admin-panel.html' })
        })
    })
})

app.get('/chatroom', function (req, res) {
    let roomId = req.query.roomId.replace(/"/g, '')
    if (!roomId) {
        return res.status(200).send({
            status: -1,
            result: 'fetch-join-id/not-found'
        })
    }
    if (roomId !== null) {
        io.of(`/chatroom/${roomId}`)
            .once('connect', function (socket) {
                socketIo.initSocket(socket)
            })
        io.of(`/chatroom/${roomId}`)

        return res.status(200).send({
            status: 1,
            result: 'fetch-join-id/successful'
        })
    }
})

app.post("/checkRoomExistence", function (req, res) {
    let postData = req.body
    let query = {}
    if (postData.isJoin)
        query.roomId = postData.roomId
    else
        query.roomName = postData.roomName
    firebase.verifyIdToken(postData.userToken)
        .then(function (response) {
            console.log(query)
            db.getOneDocumentData('chatroomDb', 'chatroom', query).then(function (roomData) {
                if (!roomData) {
                    res.status(200).send({
                        status: 1,
                        result: 'check-room/does-not-exist'
                    })
                } else {
                    return res.status(200).send({
                        status: -1,
                        result: "room-create/exists",
                        data: { roomId: roomData.roomId }
                    })
                }
            })
        })
})

app.post('/newChatroom', function (req, res) {
    /** @type {{roomName:string,userToken:string}} */let postData = req.body
    firebase.verifyIdToken(postData.userToken)
        .then(function (userData) {
            if (userData) {
                let newRoomId = uniqid()
                db.insertDocument('chatroomDb', 'chatroom', {
                    roomName: postData.roomName,
                    roomId: newRoomId,
                    participants: [userData.user_id],
                    state: 'active',
                    host: userData.user_id,
                    createdAt: Date.now(),
                    messages: []
                }).then(function (response) {
                    if (response)
                        res.status(200).send({
                            result: 'room-create/room-created',
                            data: { roomId: newRoomId }
                        })
                })
            }
        })
})

app.post('/joinRoom', function (req, res) {
    /** @type {{userToken:string,roomId:string}} */let postData = req.body
    firebase.verifyIdToken(postData.userToken).then(function (userData) {
        if (userData) {
            db.getOneDocumentData('chatroomDb', 'chatroom', { roomId: postData.roomId })
                .then(function (roomData) {
                    if (roomData) {
                        if (!roomData.participants.includes(userData.user_id)) {
                            db.insertDocumentData('chatroomDb', 'chatroom', { roomId: postData.roomId }, { participants: userData.user_id })
                        }
                        res.status(200).send({
                            status: 1,
                            result: 'room-join/joined-room'
                        })
                    }
                })
        }
    })
})


app.post('/getChatroomData', function (req, res) {
    /**
     *  Gets chatroom data upon creating or joining, returns messages and participants' display names
     */
    /** Includes "roomId" and "userToken" */let postData = req.body
    util.log(138, 'postData', postData)
    firebase.verifyIdToken(postData.userToken).then(function (token) {
        if (token) {
            db.hasKeyData('chatroomDb', 'chatroom', { participants: token.user_id, roomId: postData.roomId }).then(function (result) {
                util.log(144, 'hasKeyData (index.js) /getChatroomData', result)
                if (result) {
                    // Update user online status on chatroom join
                    db.updateOneDocField('usersDb', 'users', { userId: token.user_id }, { status: 'online' })
                        .catch(err => console.log(err))
                        .then(function () {
                            db.getOneDocumentData('chatroomDb', 'chatroom', {
                                roomId: postData.roomId
                            })
                                .then(function (chatroomData) {
                                    firebase.getUserData(chatroomData.participants).then(userData => {
                                        console.log(chatroomData.participants)
                                        console.log(userData)
                                        res.status(200).send({ messages: chatroomData.messages, participants: userData })
                                    })
                                })
                                .catch(err => console.log(err))
                        })
                } else
                    res.status(403).send()
            })
        }
    })
})

app.get('/auth', function (req, res) {
    userToken = req.query.userToken
    db.hasKeyData('')
})

app.get('/exportChatData', function (req, res) {
    util.log(179, '/exportChatData', req.query)
    let roomId = req.query.roomId
    let userToken = req.query.token
    let isAdmin

    firebase.verifyIdToken(userToken).then(function (userData) {
        db.getOneDocumentData('usersDb', 'users', { userId: userData.user_id })
            .then(function (userData) {
                isAdmin = userData.isAdmin
            })
            .then(function () {
                db.hasKeyData('chatroomDb', 'chatroom', { roomId: roomId, host: userData.user_id })
                    .then(function (response) {
                        if (response || isAdmin) {
                            db.getCollectionData('chatroomDb', 'chatroom', { roomId: roomId })
                                .then(function (data) {
                                    console.log(data)
                                    if (data.length > 0){
                                        res.write(JSON.stringify(data, null, 2))
                                    }else{
                                        res.status(404).send({
                                            status: -1,
                                            result: 'export-chat/room-id-not-found'
                                        })
                                    }
                                    res.end()
                                })
                        }
                    })
            })
    })
})

http.listen(8080)
