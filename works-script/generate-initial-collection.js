const TEIFILEURI = "https://centerfordigitalhumanities.github.io/Dunbar-books/The-Complete-Poems-TEI.xml"
let RAWTEI = ""
const URLS = {
    BASE_ID: "http://devstore.rerum.io/v1",
    CREATE: "http://tinydev.rerum.io/app/create",
    UPDATE: "http://tinydev.rerum.io/app/update",
    QUERY: "http://tinydev.rerum.io/app/query",
    OVERWRITE: "http://tinydev.rerum.io/app/overwrite",
    SINCE: "http://devstore.rerum.io/v1/since"
}
async function getPoemsAsJSON(){
    RAWTEI = await fetch(TEIFILEURI)
    .then(res => res.text())
    .then(str => {
        return new window.DOMParser().parseFromString(str, "text/xml")
    })
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
    TEIpoemsForRerum = Array.from(TEIpoemsForRERUM)
    for(const poemObj of TEIpoemsForRERUM){
        let poemEntity = {
            "@context" : {"@vocab":"http://purl.org/vocab/frbr/core#"},
            "testing" : "forDLA",
            "type" : "Work",
            "additionalType" : "http://purl.org/dc/dcmitype/Text",
            "name" : poemObj.name
        }
        // Create the Work (poem)
        console.log("Create poem entity '"+poemObj.name+"' and connect related data")
        const rerumPoem = await fetch(URLS.CREATE, {
            method: "POST",
            mode: "cors",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(poemEntity)
        })
        .then(res => res.json())
        .then(resObj => {return resObj.new_obj_state})
        .catch(err => {console.error("Could not make Poem entity '"+poemObj.name+"'")})
        if(rerumPoem?.["@id"]){
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
                return cAnno.new_obj_state
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
            .then(expressionEntity => {return expressionEntity.new_obj_state})
            .catch(err => {console.error("Could not make Expression entity")})

            if(expEntity?.["@id"]){
                console.log("Syncronously (b) create the expression annotation to connect Expression and Poem entity")
                let expressionAnnotation = {
                    "@context": "http://www.w3.org/ns/anno.jsonld",
                    "testing" : "forDLA",
                    "type" : "Annotation",
                    "motivation" : "linking",
                    "body":{
                        "isRealizationOf" : rerumPoem["@id"],
                    },
                    "target": expEntity["@id"]
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
                    return expressionAnno.new_obj_state
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
                        "isEmbodimentOf" : expEntity["@id"]
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
                    return mAnno.new_obj_state
                }) 
                .catch(err => console.error("Failed to make manifestation annotation"))
            }
            else{
               console.error("Could not make expression entity for poem "+poemObj.name) 
            } 
            /* as soon as we start to relate it to {ecommons} we are creating new expressions.  There are more expressions than just the complete book TEI, like a Google Book.*/
            //For each title match of rerumEntity.name in poems.json
                //Each match needs a new Expression, looks like one above )title will match by accident)
                //Each Expression gets a manifestationAnnotation.  Target is URL property from poems.json
            console.log("Finished creating poem entity '"+poemObj.name+"' and initializing data connections!")    
        }
        else{
            console.error("Could not make poem "+poemObj.name)
        } 
    }     
}
