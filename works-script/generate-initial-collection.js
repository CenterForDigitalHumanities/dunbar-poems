

document.getElementById("dopoems").addEventListener('click', () => getPoemsAsJSON())
const TEIFILEURI = "https://centerfordigitalhumanities.github.io/Dunbar-books/The-Complete-Poems-TEI.xml"

let RAWTEI = await fetch(TEIFILEURI)
    .then(res => res.text())
    .then(str => {
        return new window.DOMParser().parseFromString(str, "text/xml")
    })

function getPoemsAsJSON(){
    let xPathSelectorForTextContent = ""
    const POEMS = Array.from(RAWTEI.querySelectorAll("div[type='poem']"))
    const xPathSelectorForPoemDivs = "/div[@type='poem']" //XPath to return all div[type="poem"] objects
    const completePoemsDocumentURI = TEIFILEURI
    let type = "Poem"
    const targetCollection = "DLA Poems Collection"
    let poemsJSONArray = POEMS.map((poem, i) => {
        //xPathSelectorForTextContent = "/div[@type='poem']["+(i+1)+"]/fn:string-join(l[text()],'')"
        //^^ A good selector when all you want is the text.
        xPathSelectorForTextContent = xPathSelectorForPoemDivs + "["+(i+1)+"]" //Xpath to just return the (i=1)th div[type="poem"]
        name = poem.querySelector("head").textContent
        return {
            "name" : name,
            "xpathForPoemContent" : xPathSelectorForTextContent,
            "targetCollection" : targetCollection
        }
    })
    if(confirm("Continuing will generate "+poemsJSONArray.length+" poem entities.  Confirm to continue")){
        generateDLAPoetryEntities(poemsJSONArray)      
    }
}

async function generateDLAPoetryEntities(TEIpoemsForRERUM){
    Array.from(TEIpoemsForRERUM).forEach(poemObj => {
        let poemEntity = {
            "@context" : {"@vocab":"http://purl.org/vocab/frbr/core#"},
            "testing" : "forDLA",
            "type" : "Work",
            "additionalType" : "http://purl.org/dc/dcmitype/Text",
            "name" : poemObj.name
        }
        // Create the Work (poem)
        console.log("Create poem entity '"+poemObj.name+"' and connect related data")
        const work = await fetch(URLS.CREATE, {
            method: "POST",
            mode: "cors",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(poemEntity)
        })
        .then(res => res.json())
        .then(resObj => {return resObj.new_obj_state})
        .then(rerumPoem=>{
            console.log("Successfully made a poem entity"+rerumPoem.name)
            let collectionAnnotation = {
                "@context": "http://www.w3.org/ns/anno.jsonld",
                "testing" : "forDLA",
                "type" : "Annotation",
                "motivation" : "placing",
                "body":{
                   "targetCollection": poemObj.targetCollection
                },
                "target": rerumPoem["@id"]
            }

            console.log("Syncronously (a) make annotation to place poem entity into "+poemObj.targetCollection)
            const collectionAnno = await fetch(URLS.CREATE, {
                method: "POST",
                mode: "cors",
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(collectionAnnotation)
            })
            .then(res => res.json())
            .then(cAnno => {
                console.log(poemObj.name + "placed into " +poemObj.targetCollection+ "collection via annotation")
                return poemObj.name + "placed into " +poemObj.targetCollection+ "collection via annotation"
            })
            .catch(err => {console.error("Could not make collection annotation")})

            let expression = {
                "type" : "Expression",
                "testing" : "forDLA",
                "title" : poemObj.name,
                "@context" : "FRBR",
                "testing" : "forDLA"
            }

            console.log("Syncronously (a) make Expression entity for poem "+poemObj.targetCollection)
            const expEntity = await fetch(URLS.CREATE, {
                method: "POST",
                mode: "cors",
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(expression)
            })
            .then(res => res.json())
            .then(expressionEntity => {
                console.log("Syncronously (b) create the expression annotation to connect Expression and Poem entity")
                let expressionAnnotation = {
                    "@context": "http://www.w3.org/ns/anno.jsonld",
                    "testing" : "forDLA",
                    "type" : "Annotation",
                    "motivation" : "linking",
                    "body":{
                        "isRealizationOf" : rerumPoem["@id"],
                    },
                    "target": expressionEntity["@id"]
                }   
                const expAnno = await fetch(URLS.CREATE, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify(expressionAnnotation)
                })
                .then(res => res.json())    
                .then(expressionAnno => {
                    console.log("Finished making expression annotation")
                    return "Finished making expression annotation"
                }) 
                .catch(err => console.error("Failed to make expression annotation"))

                //We should not be making manifest objects, unless we are creating an entire manifestation which we are not.
                console.log("Syncronously (b) create the expression annotation to connect Expression and The Complete Poems TEI File")
                let manifestationAnnotation = {
                    "@context": "http://www.w3.org/ns/anno.jsonld",
                    "testing" : "forDLA",
                    "type" : "Annotation",
                    "motivation" : "linking",
                    "body":{
                        "isEmbodimentOf" : expressionEntity["@id"]
                    },
                    "target":{
                        "type" : "Manifestation",
                        "source": "https://centerfordigitalhumanities.github.io/Dunbar-books/The-Complete-Poems-TEI.xml",
                        "selector": {
                            "type": "XPathSelector",
                            "value": poemObj.xpathForPoemContent
                        }
                    }
                }       
                const manifestationAnno = await fetch(URLS.CREATE, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify(manifestationAnnotation)
                })
                .then(res => res.json())    
                .then(mAnno => {
                    console.log("Finished making manifestation annotation")
                    return "Finished making manifestation annotation"
                }) 
                .catch(err => console.error("Failed to make manifestation annotation")) 
                return "Expression entity created for poem "+rerumPoem.name
                /* as soon as we start to relate it to {ecommons} we are creating new expressions.  There are more expressions than just the complete book TEI, like a Google Book.*/
                //For each title match of rerumEntity.name in poems.json
                    //Each match needs a new Expression, looks like one above )title will match by accident)
                    //Each Expression gets a manifestationAnnotation.  Target is URL property from poems.json
            })
            .catch(err => {console.error("Could not make Expression entity")})
            console.log("Finished creating poem entity '"+poemObj.name+"' and initializing data connections!")
            return "Finished creating poem entity '"+poemObj.name+"' and initializing data connections!"
        })
        .catch(err => {console.error("Could not make Poem entity '"+poemObj.name+"'")})   
    })
}
