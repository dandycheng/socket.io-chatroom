// Add user to cloud firestore
app.post('/signUp',function(req,res){
    firestore.collection('users').doc(req.query.userId).set({
        username:req.query.username,
        email:req.query.email,
        isAdmin:false
    })
        .then()
})