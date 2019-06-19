const path = require('path')

exports.init = function(req,res){
    res.sendFile(path.resolve(`${__dirname}/../../index.html`))
}