exports.chatData = function(req,res){
    if (err) throw err
    dbo.collection('messages').find().toArray(function (err, result) {
        res.write(JSON.stringify(result, ['message', 'timestamp'], 2))
        res.end()
    })
}