const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    //Extracting the token from the header authorization
    const isAuthorized = req.get('Authorization')
    if(!isAuthorized){
        req.isAuth = false
        return next()
    }
    const token = isAuthorized.split(' ')[1]
    let decodedToken
    //Trying to decode the token with signature
    try {
        decodedToken = jwt.verify(token, 'secreto')
    }
    //If error
    catch (err){
        req.isAuth = false
        return next()
    }
    //If the token does not match with the signature
    if(!decodedToken){
        req.isAuth = false
        return next()
    }
    //Assingnig to middleware the userId 
    req.userId = decodedToken.userId
    req.isAuth = true
    //Next middleware
    next()
}
