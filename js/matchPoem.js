/*
match name to title in poems.json
create an Expression for poem in poems.json
  title
  type=Expression
  context=FRBR
annotate Expression-->isRealizationOf-->Work
annotate poem.url with isEmbodimentOf Expression
*/

const URLS = {
    BASE_ID: "http://devstore.rerum.io/v1",
    CREATE: "http://tinydev.rerum.io/app/create",
    UPDATE: "http://tinydev.rerum.io/app/update",
    QUERY: "http://tinydev.rerum.io/app/query",
    OVERWRITE: "http://tinydev.rerum.io/app/overwrite",
    SINCE: "http://devstore.rerum.io/v1/since"
}

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
    const poemMapToReturn = new Map();
    poems.forEach(p=>{
        poemMapToReturn.set(p.title, p.url)
    })
    return poemMapToReturn
}

function getAllWorks(){
    
    const queryObj = {
        "type":"Work",
        "additionalType":"http://purl.org/dc/dcmitype/Text"
    }
    return fetch(URLS.QUERY,{
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
function findMatchedEntries(title,f romTitleMap){
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
    return await fetch(URLS.CREATE, {
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