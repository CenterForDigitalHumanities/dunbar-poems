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
    PRIMITIVES: ["name","@type"],

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
        VIEW_RENDERED : "deer-view-rendered",
        FORM_RENDERED : "deer-form-rendered",
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
        poemsList: function (obj, options = {}) {
            let tmpl = `<h2>Poems</h2>`
            if (options.list) {
                tmpl += `<ul>`
                obj[options.list].forEach((val, index) => {
                    tmpl += `<li><a href="${options.link}${val['@id']}"><deer-view deer-id="${val["@id"]}" deer-template="label"></deer-view></a></li>`
                })
                tmpl += `</ul>`
            }
            return tmpl
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
                        return {"annoId":UTILS.getValue(anno["@id"]), "expId":UTILS.getValue(anno.target)}
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
                <a class="tag is-small" href="poem-expression.html#">full view</a>
                <a class="tag is-small" style="color:darkgrey" href="expression.html#">edit details</a>
                <a class="tag is-small" style="color:red" onclick="removeExpressionFromWork('${UTILS.getLabel(obj)}', '${UTILS.getValue(obj["@id"])}', this)">disconnect from poem</a>
            </div>
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
                    .then(ids => ids.map(id => id.selector ? `${id?.source}#${id.selector.value}` : id))
                const mURL = manId => `<a href="${manId}" target="_blank">${manId}</a>`
                elem.querySelector(".manifestation-url").innerHTML = manifestationIds.map(manId => mURL(manId)).join('')
                UTILS.broadcast(undefined, config.EVENTS.NEW_VIEW, elem, {set:[]})
            }
            return { html, then }
        }
    },
    version: "alpha"
}

export default config