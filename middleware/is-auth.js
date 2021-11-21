const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    //Extracting the token from the header authorization
    const isAuthorized = req.get('Authorization')
    if(!isAuthorized){
        const error = new Error('Not authenticated!')
        error.statusCode = 401
        throw error
    }
    const token = isAuthorized.split(' ')[1]
    let decodedToken
    //Trying to decode the token with signature
    try {
        decodedToken = jwt.verify(token, 'ultrasecretconcontoken')
    }
    //If error
    catch (err){
        err.statusCode = 500
        throw err
    }
    //If the token does not match with the signature
    if(!decodedToken){
        const error = new Error('Not authenticated!')
        error.statusCode = 401
        throw error
    }
    //Assingnig to middleware the userId 
    req.userId = decodedToken.userId
    //Next middleware
    next()
}