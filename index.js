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

let nsps

// db.getCollectionData('nspDb', 'nsp', {})
//     .then(function (nspList) {
//         nsps = nspList
//         util.log(22, 'NSPS (index.js)', nsps)
//     })


//on server start, connect to DB and get namespace, then io.of() namespace.




app.use(bodyParser.json({ extended: true }))
app.use('/', express.static('public'))


// ! Update user status in DB
// app.post('/signIn')

app.post('/signUp', function (req, res) {
    // Creates status identifier to track user's online status
    let signUpData = req.body
    db.insertDocument('usersDb', 'users', {
        displayName: signUpData.displayName,
        userId: signUpData.userId,
        status: 'offline'
    }).then(function () {
        res.status(200).send()
    })
        .catch(err => console.log(err))
})

// TODO: (Fix) User can't send message upon room creation

app.get('/chatroom', function (req, res) {
    let roomId = req.query.roomId.replace(/"/g, '')
    util.log(68, 'FETCH (/chatroom socket)')
    if (!roomId) {
        return res.status(200).send({
            status: -1,
            result: 'fetch-join-id/not-found'
        })
    }
    if (roomId !== null) {
        let newNameSpace = {}
        io.of(`/chatroom/${roomId}`)
            .once('connect', function (socket) {
                util.log(66, 'NAMESPACES', Object.keys(io.nsps))
                util.log(65, 'NSP CREATED (/chatroom/<joinId>)')
                socketIo.initSocket(socket)
            })
            .on('disconnect', function () {
                util.log(71, 'DISCONNECTED FROM NSP')
            })
        io.of(`/chatroom/${roomId}`)
        newNameSpace[roomId] = { nsp: `/chatroom/${roomId}` }
        db.insertDocument('nspDb', 'nsp', { nsps: newNameSpace })

        return res.status(200).send({
            status: 1,
            result: 'fetch-join-id/successful'
        })
    }
})

app.post('/test', function (req, res) {
    console.log('/TEST')
    console.log(req.body)
})

app.post("/checkRoomExistence", function (req, res) {
    let postData = req.body
    let query = {}
    util.log(95, 'postData (/checkRoomExistence)', postData)
    if (postData.isJoin)
        query.roomId = postData.roomId
    else
        query.roomName = postData.roomName
    firebase.verifyIdToken(postData.userToken)
        .then(function (response) {
            console.log(query)
            db.getOneDocumentData('chatroomDb', 'chatroom', query).then(function (roomData) {
                util.log(103, 'ROOM DATA', roomData)
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
                    if (response.result.n === 1)
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

    util.log(173, 'postData (/getChatroomData)', postData)
    firebase.verifyIdToken(postData.userToken).then(function (token) {
        if (token) {
            // Update user online status on chatroom join
            db.updateOneDocField('usersDb', 'users', { userId: token.user_id }, { status: 'online' })
                .catch(err => console.log(err))
            db.getOneDocumentData('chatroomDb', 'chatroom', {
                roomId: postData.roomId
            })
                .then(function (chatroomData) {
                    util.log(182, 'Find chatroom data in DB', chatroomData)
                    firebase.getUserData(chatroomData.participants)
                        .then(userData => {
                            util.log(178, 'userData', userData)
                            res.status(200).send({ messages: chatroomData.messages, participants: userData })
                        })
                })
                .catch(err => console.log(err))
        }
    })
})

app.get('/exportChatData', function (req, res) {
    let roomId = req.body.roomId
    db.getCollectionData('chatroom', { roomId: roomId })
        .then(function (data) {
            exportChatData = JSON.stringify(data, null, 2)
            res.end()
        })
})

http.listen(8080)