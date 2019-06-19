// Fetch room data (JSON)
app.get('/rooms/:roomHostUserId',function(req,res){
    let roomId = req.params.roomHostUserId
    let ref = db.ref('rooms')
    ref.on('value',function(sn){
            let snapshot = sn.val()
            for(let x of Object.keys(snapshot)){
                if(snapshot[x].joinId === roomId){
                    res.write(JSON.stringify(snapshot[x],null,2))
                    res.end()
                }
            }
            // Only reachable when chatroom data is not found
            res.status(404).send()
        })
})