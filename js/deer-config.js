import { default as UTILS } from './deer-utils.js'

const config = {
    ID: "deer-id", // attribute, URI for resource to render
    TYPE: "deer-type", // attribute, JSON-LD @type
    TEMPLATE: "deer-template", // attribute, enum for custom template
    KEY: "deer-key", // attribute, key to use for annotation
    LABEL: "title", // attribute, alternate label for properties
    CONTEXT: "deer-context", // attribute, JSON-LD @context, scoped
    ATTRIBUTION: "deer-creator", // attribute, Web Annotation `creator`, scoped
    MOTIVATION: "deer-motivation", // attribute, Web Annotation `motivation`, scoped
    LIST: "deer-list", // attribute, property with resource array
    COLLECTION: "deer-collection", // attribute, name of aggregating collection
    LISTENING: "deer-listening", // attribute, name of container to watch for clicks
    LINK: "deer-link", // attribute, location of href#[deer-id] for <a>s
    VIEW: "deer-view, .deer-view", // selector, identifies render containers
    FORM: "form[deer-type]", // selector, identifies data entry containers
    ITEMTYPE: "deer-item-type", //attribute, specialty forms ('entity' by default)
    SOURCE: "deer-source", // attribute, URI for asserting annotation
    EVIDENCE: "nv-evidence", // attribute, URI for supporting evidence
    INPUTTYPE: "deer-input-type", //attribute, defines whether this is an array list, array set, or object 
    ARRAYDELIMETER: "deer-array-delimeter", //attribute, denotes delimeter to use for array.join()

    INPUTS: ["input", "textarea", "dataset", "select"], // array of selectors, identifies inputs with .value
    CONTAINERS: ["ItemList", "ItemListElement", "List", "Set", "list", "set", "@list", "@set"], // array of supported list and set types the app will dig into for array values
    PRIMITIVES: ["name", "@type"],

    URLS: {
        BASE_ID: "http://devstore.rerum.io/v1",
        CREATE: "http://tinydev.rerum.io/app/create",
        UPDATE: "http://tinydev.rerum.io/app/update",
        OVERWRITE: "http://tinydev.rerum.io/app/overwrite",
        QUERY: "http://tinydev.rerum.io/app/query",
        SINCE: "http://devstore.rerum.io/v1/since"
    },

    EVENTS: {
        CREATED: "deer-created",
        UPDATED: "deer-updated",
        LOADED: "deer-loaded",
        NEW_VIEW: "deer-view",
        NEW_FORM: "deer-form",
        VIEW_RENDERED: "deer-view-rendered",
        FORM_RENDERED: "deer-form-rendered",
        CLICKED: "deer-clicked"
    },

    SUPPRESS: ["__rerum", "@context"], //properties to ignore
    DELIMETERDEFAULT: ",", //Default delimeter for .split()ing and .join()ing 
    ROBUSTFEEDBACK: true, //Show warnings along with errors in the web console.  Set to false to only see errors.  

    /**
     * Add any custom templates here through import or copy paste.
     * Templates added here will overwrite the defaults in deer-render.js.
     * 
     * Each property must be lower-cased and return a template literal
     * or an HTML String.
     */
    TEMPLATES: {
        cat: (obj) => `<h5>${obj.name}</h5><img src="http://placekitten.com/300/150" style="width:100%;">`,
        poemsList: (obj, options = {}) => {
            let html = `<h2>${options.label ?? UTILS.getLabel(obj,'Poems')}</h2>`
            if (options.list) {
                html += `<ul>`
                obj[options.list].forEach((val, index) => {
                    const name = UTILS.getLabel(val, (val.type ?? val['@type'] ?? (index+1)))
                    html += (val["@id"] && options.link) ? `<li deer-id="${val["@id"]}"><a href="${options.link}${val["@id"]}"><span deer-id="${val["@id"]}">${name}</span></a></li>` : `<li deer-id="${val["@id"]}"><span deer-id="${val["@id"]}">${name}</span></li>`
                })
                html += `</ul>`
            }
            const then = async (elem) => {
                const listing = elem.getAttribute("deer-listing")
                const pendingLists = !listing || fetch(listing).then(res => res.json())
                    .then(list => {
                        list[elem.getAttribute("deer-list") ?? "itemListElement"]?.forEach(item => {
                            const record = elem.querySelector(`span[deer-id='${item?.['@id'] ?? item?.id ?? item}'`)
                            if (typeof record === 'object' && record.nodeType !== undefined) {
                                record.innerHTML = item.label
                                record.closest('li').classList.add("cached")
                            }
                        })
                    })
                await pendingLists
                const newView = new Set()
                elem.querySelectorAll("li:not(.cached) span").forEach((item,index) => {
                    item.classList.add("deer-view")
                    item.setAttribute("deer-template","label")
                    newView.add(item)
                })
                UTILS.broadcast(undefined, "deer-view", document, { set: newView })
            }
            return { html, then }
        },
        poemDetail: (obj, options = {}) => {
            const html = `<h2>${UTILS.getLabel(obj)}</h2> 
            <div id="textSample" class="card">
                [ Text Sample ]
                <stanza>
                    <line></line>
                    <line></line>
                    <line></line>
                    <line></line>
                </stanza>
                <stanza>
                    <line></line>
                    <line></line>
                    <line></line>
                    <line></line>
                </stanza>
            </div>
            <h4>Around the Globe</h4>
            <p>These are various published versions of this poem.</p>`
            const then = async (elem, obj, options) => {
                const workId = obj['@id']
                const historyWildcard = { "$exists": true, "$size": 0 }
                const exprQuery = {
                    $or: [{
                        "body.isRealizationOf": workId
                    }, {
                        "body.isRealizationOf.value": workId
                    }],
                    "__rerum.history.next": historyWildcard
                }
                const expressionIds = await fetch(config.URLS.QUERY, {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify(exprQuery)
                })
                    .then(response => response.json())
                    .then(annos => annos.map(anno => UTILS.getValue(anno.target)))
                const expressionCard = expId => `<deer-view class="card col" deer-template="expression" deer-link="poem-expression.html#" deer-id="${expId}">${expId}</deer-view>`
                const cards = document.createElement('div')
                cards.classList.add("row")
                cards.innerHTML = expressionIds.map(expId => expressionCard(expId)).join('')
                elem.append(cards)
                UTILS.broadcast(undefined, config.EVENTS.NEW_VIEW, elem, { set: cards.children })
            }
            return { html, then }
        },
        expressionDetail: (obj, options = {}) => {
            const html = `<header><h4>${UTILS.getLabel(obj)}</h4></header>
            <p>Originally published: ${UTILS.getValue(obj.publicationDate) ?? "[ unknown ]"}</p>
            <a href="poem.html#${UTILS.getValue(obj.isRealizationOf)}">All versions of this poem</a>
            <div>${obj.text ?? "[ no text attached ]"}</div>
            <div>${obj.recording ?? "[ recording unavailable ]"}</div>
            <p>View resource: <span class="manifestation-url"></span></p>
            `
            const then = async (elem, obj, options) => {
                const expId = obj['@id']
                const historyWildcard = { "$exists": true, "$size": 0 }
                const manQuery = {
                    $or: [{
                        "body.isEmbodimentOf": expId
                    }, {
                        "body.isEmbodimentOf.value": expId
                    }],
                    "__rerum.history.next": historyWildcard
                }
                const manifestationIds = await fetch(config.URLS.QUERY, {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify(manQuery)
                })
                    .then(response => response.json())
                    .then(annos => annos.map(anno => UTILS.getValue(anno.target)))
                    .then(async targets => {
                        // hacky punch in some text for now
                        for (const t of targets) {
                            if (typeof t === "object") {
                                try {
                                    const sampleSource = await SaxonJS.getResource({
                                        location: t.source,
                                        type: 'xml'
                                    })
                                    const poemText = SaxonJS.XPath.evaluate("/" + t.selector?.value, sampleSource, { xpathDefaultNamespace: 'http://www.tei-c.org/ns/1.0' })
                                    textSample.innerHTML = poemText.innerHTML
                                    break
                                } catch (err) {
                                    textSample.innerHTML = `Select a version below to view the poem text.`
                                }
                            }
                        }
                        return targets
                    })
                    .then(ids => ids.map(id => id.selector ? `${id?.source}#${id.selector.value}` : id))
                const mURL = manId => `<a href="${manId}" target="_blank">${manId}</a>`
                elem.querySelector(".manifestation-url").innerHTML = manifestationIds.map(manId => mURL(manId)).join('')
            }
            return { html, then }
        },
        expression: (obj, options = {}) => {
            const html = `<header><h4>${UTILS.getLabel(obj)}</h4></header>
            <p>Originally published: ${UTILS.getValue(obj.publicationDate) ?? "unknown"}</p>
            <div class="manifestation-url"></div>
            <small>${options.link ? "<a href='" + options.link + obj['@id'] + "'" + "</a>(view details)" : ""}</small>`
            const then = async (elem, obj, options) => {
                const expId = obj['@id']
                const historyWildcard = { "$exists": true, "$size": 0 }
                const manQuery = {
                    $or: [{
                        "body.isEmbodimentOf": expId
                    }, {
                        "body.isEmbodimentOf.value": expId
                    }],
                    "__rerum.history.next": historyWildcard
                }
                const manifestationIds = await fetch(config.URLS.QUERY, {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify(manQuery)
                })
                    .then(response => response.json())
                    .then(annos => annos.map(anno => UTILS.getValue(anno.target)))
                    .then(async targets => {
                        // hacky punch in some text for now
                        for (const t of targets) {
                            if (typeof t === "object") {
                                try {
                                    const sampleSource = await SaxonJS.getResource({
                                        location: t.source,
                                        type: 'xml'
                                    })
                                    const poemText = SaxonJS.XPath.evaluate("/" + t.selector?.value, sampleSource, { xpathDefaultNamespace: 'http://www.tei-c.org/ns/1.0' })
                                    textSample.innerHTML = poemText.innerHTML
                                    break
                                } catch (err) {
                                    textSample.innerHTML = `Select a version below to view the poem text.`
                                }
                            }
                        }
                        return targets
                    })
                    .then(ids => ids.map(id => id.selector ? `${id?.source}#${id.selector.value}` : id))
                const mURL = manId => `<a href="${manId}" target="_blank">${manId}</a>`
                elem.querySelector(".manifestation-url").innerHTML = manifestationIds.map(manId => mURL(manId)).join('')
            }
            return { html, then }
        },
        linky: function (obj, options = {}) {
            try {
                let link = options.key
                return link ? `<a href="${UTILS.getValue(link)}" title="Open in a new window" target="_blank">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg==">
                    </a>` : ``
            } catch (err) {
                return null
            }
        },
        poemExpressionConnections: (obj, options = {}) => {
            const html = `
            <p>Review the connected published versions of this poem, listed below.  The same poem can appear in many forms of publication.</p>`

            const then = async (elem, obj, options) => {
                const workId = obj['@id']
                const historyWildcard = { "$exists": true, "$size": 0 }
                const exprQuery = {
                    $or: [{
                        "body.isRealizationOf": workId
                    }, {
                        "body.isRealizationOf.value": workId
                    }],
                    "__rerum.history.next": historyWildcard
                }
                const expressionConnections = await fetch(config.URLS.QUERY, {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify(exprQuery)
                })
                    .then(response => response.json())
                    .then(annos => {
                        return annos.map(anno => {
                            return { "annoId": UTILS.getValue(anno["@id"]), "expId": UTILS.getValue(anno.target) }
                        })
                    })
                const expressionCard = c => `<deer-view class="card col" deer-template="simpleExpression" deer-link="poem-expression.html#" anno-id="${c.annoId}" deer-id="${c.expId}">${c.expId}</deer-view>`
                const cards = document.createElement('div')
                cards.classList.add("row")
                cards.innerHTML = expressionConnections.map(conn => expressionCard(conn)).join('')
                elem.append(cards)
                UTILS.broadcast(undefined, config.EVENTS.NEW_VIEW, elem, { set: cards.children })
            }
            return { html, then }
        },
        simpleExpression: (obj, options = {}) => {
            const html = `<header><h4>${UTILS.getLabel(obj)}</h4></header>
            <h6>View links below for connected content</h6>
            <div class="row manifestation-url"></div>
            <h6> Control this Expression </h6>
            <div class="row">
                <a class="tag is-small" style="color:darkgrey" href="poem-expression.html#${UTILS.getValue(obj["@id"])}">full view</a>
                <a class="tag is-small" href="expression.html#${UTILS.getValue(obj["@id"])}">edit details</a>
            </div>
            `
            // ^^ If we want to offer a delete button, here's an OK one
            //<a class="tag is-small" style="color:red" onclick="removeExpressionFromWork('${UTILS.getLabel(obj)}', '${UTILS.getValue(obj["@id"])}', this)">disconnect from poem</a>

            const then = async (elem, obj, options) => {
                const expId = obj['@id']
                const historyWildcard = { "$exists": true, "$size": 0 }
                const manQuery = {
                    $or: [{
                        "body.isEmbodimentOf": expId
                    }, {
                        "body.isEmbodimentOf.value": expId
                    }],
                    "__rerum.history.next": historyWildcard
                }
                const manifestationIds = await fetch(config.URLS.QUERY, {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify(manQuery)
                })
                    .then(response => response.json())
                    .then(annos => annos.map(anno => UTILS.getValue(anno.target)))
                    .then(ids => ids.map(id => id.selector ? `${id?.source}#${id.selector.value}` : id))
                const mURL = manId => `<a href="${manId}" target="_blank">${manId}</a>`
                elem.querySelector(".manifestation-url").innerHTML = manifestationIds.map(manId => mURL(manId)).join('')
                UTILS.broadcast(undefined, config.EVENTS.NEW_VIEW, elem, { set: [] })
            }
            return { html, then }
        },
        managedlist: (obj, options = {}) => {
            try {
                let tmpl = `<input type="hidden" deer-collection="${options.collection}">`
                if (options.list) {
                    tmpl += `<ul>`
                    obj[options.list].forEach((val, index) => {
                        const removeBtn = `<a href="${val['@id']}" class="removeCollectionItem" title="Delete This Entry">&#x274C</a>`
                        const visibilityBtn = `<a class="togglePublic" href="${val['@id']}" title="Toggle public visibility"> 👁 </a>`
                        tmpl += `<li>
                        ${visibilityBtn}
                        <a href="${options.link}${val['@id']}">
                            <deer-view deer-id="${val["@id"]}" deer-template="label">${index + 1}</deer-view>
                        </a>
                        ${removeBtn}
                        </li>`
                    })
                    tmpl += `</ul>`
                }
                else {
                    console.log("There are no items in this list to draw.")
                    console.log(obj)
                }
                return {
                    html: tmpl,
                    then: elem => {
        
                        fetch(elem.getAttribute("deer-listing")).then(r => r.json())
                            .then(list => {
                                elem.listCache = new Set()
                                list.itemListElement?.forEach(item => elem.listCache.add(item['@id']))
                                for (const a of document.querySelectorAll('.togglePublic')) {
                                    const include = elem.listCache.has(a.getAttribute("href")) ? "add" : "remove"
                                    a.classList[include]("is-included")
                                }
                            })
                            .then(() => {
                                document.querySelectorAll(".removeCollectionItem").forEach(el => el.addEventListener('click', (ev) => {
                                    ev.preventDefault()
                                    ev.stopPropagation()
                                    const itemID = el.getAttribute("href")
                                    const fromCollection = document.querySelector('input[deer-collection]').getAttribute("deer-collection")
                                    deleteThis(itemID, fromCollection)
                                }))
                                document.querySelectorAll('.togglePublic').forEach(a => a.addEventListener('click', ev => {
                                    ev.preventDefault()
                                    ev.stopPropagation()
                                    const uri = a.getAttribute("href")
                                    const included = elem.listCache.has(uri)
                                    a.classList[included ? "remove" : "add"]("is-included")
                                    elem.listCache[included ? "delete" : "add"](uri)
                                    saveList.style.visibility = "visible"
                                }))
                                saveList.addEventListener('click', overwriteList)
                            })
        
        
                        function overwriteList() {
                            let mss = []
                            elem.listCache.forEach(uri => {
                                mss.push({
                                    label: document.querySelector(`deer-view[deer-id='${uri}']`).textContent.trim(),
                                    '@id': uri
                                })
                            })
        
                            const list = {
                                '@id': elem.getAttribute("deer-listing"),
                                '@context': 'https://schema.org/',
                                '@type': "ItemList",
                                name: elem.getAttribute("deer-collection") ?? "Dunbar Poems",
                                numberOfItems: elem.listCache.size,
                                itemListElement: mss
                            }
        
                            fetch("http://tinydev.rerum.io/app/overwrite", {
                                method: "PUT",
                                mode: 'cors',
                                body: JSON.stringify(list)
                            }).then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                                .catch(err => alert(`Failed to save: ${err}`))
                        }
        
                        function deleteThis(id, collection) {
                            if (confirm("Really remove this record?\n(Cannot be undone)")) {
                                const historyWildcard = { "$exists": true, "$eq": [] }
                                const queryObj = {
                                    $or: [{
                                        "targetCollection": collection
                                    }, {
                                        "body.targetCollection": collection
                                    }],
                                    target: id,
                                    "__rerum.history.next": historyWildcard
                                }
                                fetch("http://tinydev.rerum.io/app/query", {
                                    method: "POST",
                                    body: JSON.stringify(queryObj)
                                })
                                    .then(r => r.ok ? r.json() : Promise.reject(new Error(r?.text)))
                                    .then(annos => {
                                        let all = annos.map(anno => {
                                            return fetch("http://tinydev.rerum.io/app/delete", {
                                                method: "DELETE",
                                                body: anno["@id"]
                                            })
                                                .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                                                .catch(err => { throw err })
                                        })
                                        Promise.all(all).then(success => {
                                            document.querySelector(`[deer-id="${id}"]`).closest("li").remove()
                                        })
                                    })
                                    .catch(err => console.error(`Failed to delete: ${err}`))
                            }
                        }
        
                    }
                }
            } catch (err) {
                console.log("Could not build list template.")
                console.error(err)
                return null
            }
        }
    },
    version: "alpha"
}

export default config
