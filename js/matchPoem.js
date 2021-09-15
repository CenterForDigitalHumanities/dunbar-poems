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

const running = fetch(`http://dunbar-poems.rerum.io/media/poems.json`).then(f => f.json())
    .then((poems) => {
        const poemMap = makePoemMap(poems.results)
        getAllWorks()
            .then(works => {
                works.forEach(w => {
                    findMatchedEntries(w.name, poemMap).forEach(poem => generateNewExpressionOfWork(poem, w['@id']))
                })
            })
    })

function makePoemMap(poems) {
    const poemMap = new Map();
    poems.forEach(p => {
        poemMap.set(p.title, (poemMap.get(p.title) ?? []).concat(p.url))
    })
    return poemMap
}

function getAllWorks() {

    const queryObj = {
        "type": "Work",
        "additionalType": "http://purl.org/dc/dcmitype/Text"
    }
    return fetch(config.URLS.QUERY, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(queryObj)
    })
        .then(res => res.json())
        .then(works => works.map(w => ({ '@id': w?.["@id"], "name": w?.["name"] })))
        .catch(err => raiseHell)
}



// return a set of close matches based on titleString from pems.json
function findMatchedEntries(title, fromTitleMap) {
    return fromTitleMap.get(title).map(url => ({ title, url }))
}

// return Promise to generate Expression
function generateNewExpressionOfWork(poem, workId) {
    const expression = {
        "type": "Expression",
        "testing": "forDLA",
        "title": poem.title,
        "@context": "http://iflastandards.info/ns/fr/frbr/frbrer/"
    }
    return createObject(expression)
        .then(res => res.headers.get('Location'))
        .then(eId => {
            realizeExpressionOfWork(eId, workId)
            embodyManifestationOfExpression(poem.url, eId)
        })
}

// return Promise to Annotate isRealizationOf
function realizeExpressionOfWork(expId, workId) {
    const realizedAnno = {
        "@context": "http://www.w3.org/ns/anno.jsonld",
        "testing": "forDLA",
        "type": "Annotation",
        "motivation": "linking",
        "body": {
            "isRealizationOf": workId,
        },
        "target": expId
    }
    return createObject(realizedAnno)

}

// return Promise to Annotate isEmbodimentOf
function embodyManifestationOfExpression(manId, expId) {
    const embodiedAnno = {
        "@context": "http://www.w3.org/ns/anno.jsonld",
        "testing": "forDLA",
        "type": "Annotation",
        "motivation": "linking",
        "body": {
            "isEmbodimentOf": expId
        },
        "target": manId
    }
    return createObject(embodiedAnno)
}

function createObject(body) {
    return fetch(config.URLS.CREATE, {
        method: "POST",
        mode: "cors",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(body)
    })
}
