const path = require('path')
const express = require('express')
const uniqid = require('uniqid')
const fs = require('fs')
const app = express()

exports.modifyJSON = function (JSONString, properties, asString) {
    let JSONData = JSON.parse(JSONString)
    for (let x in properties)
        JSONData[x] = properties[x]
    return (asString) ? JSON.stringify(JSONData) : JSONData
}

exports.log = function(/**@type number */lineNumber,/** @type desc */desc,/**@type Object*/obj = null){
    let hr = '------------------------------------------------'
    let output = `${hr}\nLINE ${lineNumber} ---> ${desc}\n${hr}`
    if(!obj){
        console.log('\n\n\n')
        console.log(output)
        console.log('\n\n\n')
    }
    else{
        console.log(`'\n\n\n'${output}\n`,obj)
        console.log(`${hr}\n\n\n`)
    }
}