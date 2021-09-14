/*
match name to title in poems.json
create an Expression for poem in poems.json
  title
  type=Expression
  context=FRBR
annotate Expression-->isRealizationOf-->Work
annotate poem.url with isEmbodimentOf Expression
*/

const running = fetch(jsonfile).then(f=>f.json())
.then((poems)=>{
    const poemMap = makePoemMap(poems.results)
    getAllWorks()
        .then(works=>{
            works.forEach(w=>{
                findMatchedEntries(w.name,poemMap).forEach(poem=>generateNewExpressionOfWork(poem,w['@id']))
            })
        })
    })

function makePoemMap(poems){
    poems.map(p=>{p.title,p.url})
}

function getAllWorks(){
    
    const queryObj = {
        "type":"Work",
        "additionalType"://dcText
    }
    return fetch(`query`,{
        method:'POST',
        body: JSON.stringify(queryObj),
        headers...
    })
    .then(res=>res.json())
    .then(works=>works.map(w=>({'@id',"name"})))
    .catch(err=>raiseHell)
}


/*
return a set of close matches based on titleString from pems.json
*/
function findMatchedEntries(title,fromArr){
let matches = []
return matches    
}

// return Promise to generate Expression
function generateNewExpressionOfWork(poem,workId){
    return fetch(Expression).then(eId=>{
        realizeExpressionOfWork()
        embodyManifestationOfExpression()
    })
}

// return Promise to Annotate isRealizationOf
function realizeExpressionOfWork(expId,workId){

}

// return Promise to Annotate isEmbodimentOf
function embodyManifestationOfExpression(manId,expId){

}