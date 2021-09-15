/*
match name to title in poems.json
create an Expression for poem in poems.json
  title
  type=Expression
  context=FRBR
annotate Expression-->isRealizationOf-->Work
annotate poem.url with isEmbodimentOf Expression
*/

import { default as config } from './deer-config.js'

const running = fetch(jsonfile).then(f=>f.json())
.then((poems)=>{
    const poemMap = makePoemMap(poems.results)
    getAllWorks()
        .then(works=>{
            works.forEach(w=>{
                findMatchedEntries(w.name, poemMap).forEach(poem=>generateNewExpressionOfWork(poem,w['@id']))
            })
        })
    })

function makePoemMap(poems){
    const poemMap = new Map();
    poems.forEach(p=>{
        poemMap.set(p.title, (poemMap.get(p.title) ?? []).concat(p.url))
    })
    return poemMap
}

function getAllWorks(){
    
    const queryObj = {
        "type":"Work",
        "additionalType":"http://purl.org/dc/dcmitype/Text"
    }
    return fetch(config.URLS.QUERY,{
        method:'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(queryObj)
    })
    .then(res=>res.json())
    .then(works=> {works.map(w=>({'@id':w?.["@id"],"name":w?.["name"]}))})
    .catch(err=>raiseHell)
}


/*
return a set of close matches based on titleString from pems.json
*/
function findMatchedEntries(title,fromTitleMap){
    return fromTitleMap.get(title)    
}

// return Promise to generate Expression
function generateNewExpressionOfWork(poem,workId){
    const expression = {
        "type" : "Expression",
        "testing" : "forDLA",
        "title" : poem.name,
        "@context" : "FRBR"
    }
    return await fetch(config.URLS.CREATE, {
        method: "POST",
        mode: "cors",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(expression)
    })
    .then(res => res.json())
    .then(expressionEntity =>{
        const eId = expressionEntity?.["@id"]
        const manId = poem?.["@id"]
        realizeExpressionOfWork(eId, workId)
        embodyManifestationOfExpression(manId, eId)
    })
}

// return Promise to Annotate isRealizationOf
function realizeExpressionOfWork(expId,workId){

}

// return Promise to Annotate isEmbodimentOf
function embodyManifestationOfExpression(manId,expId){

}
