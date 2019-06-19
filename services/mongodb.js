const MongoClient = require('mongodb').MongoClient;

// Initialize chatroom collection
(function () {
    MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
        let dbs = [
            { dbName: 'chatroomDb', collection: 'chatroom' },
            { dbName: 'usersDb', collection: 'users' },
            { dbName: 'nspDb', collection: 'nsp' }
        ]
        for (let x of dbs) {
            if (err) throw err
            let dbObj = db.db(x.dbName)
            dbObj.createCollection(x.collection, function (err, result) {
                if (err) throw err
            })
        }
    })
})()
/**
 *  Gets collection data
 */
exports.getCollectionData = function (/**@type string*/database,/**@type string*/collection, /**@type {{query:*=}}*/query, /**@type {{query:*=}} */sortBy = { _id: 1 }) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
            let dbObj = db.db(database)
            dbObj.collection(collection).find(query).sort(sortBy).toArray(function (err, result) {
                if (err) reject(err)
                resolve(result)
            })
        })
    })
}

/** 
 *  Gets a single occurence of document
 * 
 *  @returns Promise --> resolve(<result>), reject(<error>)
*/
exports.getOneDocumentData = function (/**@type string*/database,/**@type string */collection,/**@type {{query:*=}} */query) {
    return new Promise(function (resolve) {
        MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
            let dbObj = db.db(database)
            dbObj.collection(collection).findOne(query)
                .then(function (result) {
                    resolve(result)
                })
                .catch(err => reject(err))
        })
    })
}

/**
 *  Finds a single occurence of document in the database to check its existence
 */
exports.hasKeyData = function (/**@type string*/database,/**@type string */collection,/**@type {{query:*=}} */query,/** @type boolean= */getData = false) {
    return new Promise(function (resolve) {
        MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true }, function (err, db) {
            let dbObj = db.db(database)
            dbObj.collection(collection).findOne(query).then(function (result) {
                if (result !== null)
                    resolve({ documentExists: result !== null, ...result })
                else
                    resolve(false)
            })
            db.close()
        })
    })
}
/**
 *  Inserts document into a specified collection
 */
exports.insertDocument = function (/**@type string*/database,/**@type string */collection,/**@type Object.<String,*> */ data) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
            if (err) reject(err)
            let dbObj = db.db(database)
            dbObj.collection(collection).insertOne(data, function (err, result) {
                if (err) reject(err)
                resolve(result)
            })
            db.close()
        })
    })
}

/**
 *  Updates existing document data, creates it if it doesn't exist in the queried document
 *  
 *  @returns Promise --> resolve(<result>), reject(<error>)
 */
exports.insertDocumentData = function (/**@type string*/database,/**@type string */collection,/**@type {{query:*=}} */ query,/**@type {{data:*=}} */ data) {

    return new Promise(function (resolve, reject) {
        MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
            let dbOj = db.db(database)
            dbOj.collection(collection).updateOne(query, { $push: data }, function (err, result) {
                if (err) reject(err)
                resolve(result)
            })
            db.close()
        })
    })
}

exports.updateOneDocField = function (/**@type string*/database,/**@type string */collection,/**@type {{query:*=}} */ query,/**@type {{field:*=}} */ field) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect('mongodb://localhost:27017/', { useNewUrlParser: true }, function (err, db) {
            let dbObj = db.db(database)
            dbObj.collection(collection).updateOne(query, { $set: field }, function (err, result) {
                if (err) reject(err)
                resolve(result)
            })
        })
    })
}


/* FOR DEBUGGING */

/**
 *  For debugging only, REMOVE LATER
 */
exports.getAllDocuments = function (/**@type string */collection) {


    MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true }, function (err, db) {
        let dbObj = db.db('chatroomDb')
        dbObj.collection(collection).find().toArray(function (err, result) {
            if (err) throw err
        })
    })
}

