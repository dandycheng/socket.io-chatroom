/**
 *  Modifies an HTML element class names
 */

function modifyClassName(/**@type Array<string>*/add,/**@type Array<string>*/remove,/**@type {{id:string,class:{name:String,n:Number},querySelector:String}}*/ref = {class:{name:null,n:0}}){
    let elem
    try{
        if(ref.id !== undefined)
            elem = document.getElementById(ref.id)
        else if(ref.class && ref.class.name !== null)
            elem = document.getElementsByClassName(ref.class.name)[ref.class.n]
        else
            elem = document.querySelector(ref.querySelector)
    }catch{
        throw new Error('Element not found')
    }finally{
        for(let x of remove)
            elem.classList.remove(x)
        for(let x of add)
            elem.classList.add(x)
    }
}

function modifyJSON(/**@type string */JSONString,/**@type Object<String,any> */properties,/**@type boolean */asString){
    /**
     *  Returned modified JSON
     */
    let JSONData = JSON.parse(JSONString)
    for(let x in properties)
        JSONData[x] = properties[x]
    return (asString) ? JSON.stringify(JSONData) : JSONData
}