const express = require('express')
const firebase = require('firebase')
const util = require('../util/util')


exports.login = function (req, res) {
    /**
     *  Checks user privilege via firestore (isAdmin)
     *  @return {string} Relative path to dashboard after login
     */
    let userId = req.query.userId
}