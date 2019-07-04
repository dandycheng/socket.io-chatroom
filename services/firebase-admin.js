// Services
const db = require('./mongodb')
const util = require('../util/util')

// Firebase
let admin = require('firebase-admin')
let serviceAccount = require('../chat-room-d1e5c-firebase-adminsdk-3uqzt-fac2e59a80.json')
let firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chat-room-d1e5c.firebaseio.com"
})

/**
 *  Verifies firebase token
 *
 *  @returns Object (Includes "name","exp","user_id","email",etc.)
 */
exports.verifyIdToken = function (token) {
    return new Promise(function (resolve, reject) {
        firebase.auth().verifyIdToken(token)
            .then(function (data) {
                resolve(data)
            })
            .catch(error => reject(error))
    })
}

/** Retrieves user data from Firebase based on user ID  */
exports.getUserData = function (/**@type Array.<String> */userData) {
    console.log(userData)
    return new Promise(function (resolve, reject) {
        let users = []
        let promises = []
        for(let x of userData){
            let newPromise = new Promise(function(resolve,reject){
                firebase.auth().getUser(x)
                    .then(function(userData){
                        db.getOneDocumentData('usersDb', 'users', { userId: userData.uid }).then(function (userDataDb) {
                            resolve({ userId: userData.uid, displayName: userData.displayName, email: userData.email, status:userDataDb.status})
                        .catch(error => reject(error))
                    })
                    .catch(error => reject(error))
                })
            })
            promises.push(newPromise)
        }
        Promise.all(promises).then(function(values){
            for(let x in values){
                users.push(values[x])
                if(x === values.length - 1)
                    break
            }
            resolve(users)
        }).catch(error => reject(error))
    })
}