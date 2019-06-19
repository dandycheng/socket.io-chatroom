// Services
const db = require('./mongodb')
const util = require('../util/util')

// Firebase
let admin = require('firebase-admin')
let serviceAccount = require('../chat-room-d1e5c-firebase-adminsdk-3uqzt-fac2e59a80.json')
let firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chat-room-d1e5c.firebaseio.com"
});

/**
 *  Verifies firebase token
 *
 *  @returns Object (Includes "name","exp","user_id","email",etc.)
 */
exports.verifyIdToken = function (token) {
    // TODO: Return object instead of boolean
    return new Promise(function (resolve,reject) {
        firebase.auth().verifyIdToken(token)
            .then(function(data){
                resolve(data)
            })
            .catch(err => reject(err))
    })
}

/**
 *  Retrieves user data from Firebase based on user ID 
 */
exports.getUserData = function(/**@type Array.<String> */userIds){
    return new Promise(function(resolve,reject){
        let users = []
        for(let x in userIds){
            firebase.auth().getUser(userIds[x])
                .then(function(userData){
                    // Get user online status from DB
                    db.getOneDocumentData('usersDb','users',{userId:userIds[x]})
                        .then(function(userDataDb){
                            users.push({userId:userIds[x],displayName:userData.displayName,email:userData.email,status:userDataDb.status})
                            if(parseInt(x) === userIds.length - 1)
                                resolve(users)
                        })
                })
                .catch(err => console.log(err))
        }
    })
}