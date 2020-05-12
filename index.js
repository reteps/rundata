class RunData {
    /**
     * Makes some RunData
     * @constructor
     */
    constructor() {
        this.client = axios.create({baseURL:"https://athletic.net"})
    }
    /**
     * @function Searches athletic.net 
     * @param {string} rawQuery the text
     * @param {Object} options options include type and level.
     */
    search(rawQuery,options=null) {
        const typeLookup = {athlete:"t:a",meet:"t:m","team":"t:t"}
        const levelLookup = {highSchool:"l:4",middleSchool:"l:2",college:"l:8",club:"l:16"}

        const query = encodeURIComponent(rawQuery)
        const space = (options && options.type && options.level) ? " " : ""
        const type = options && options.type ? typeLookup[options.type] : ""
        const level = options && options.level ? levelLookup[options.level]: ""
        const filter = type + space + level
        console.log(`/api/v1/AutoComplete/search?q=${query}&fq=${filter}`)
        return this.client.get(`/api/v1/AutoComplete/search?q=${query}&fq=${filter}`).then(res => res.data.response)
    }
    get(url) {
        let parser = new DOMParser()
        return this.client.get("https://fierce-brushlands-39944.herokuapp.com/https://athletic.net" + url).then(res => parser.parseFromString(res.data, 'text/html'))
    }
    getResultsGrid(schoolID, year, gender) {
        const url = `/CrossCountry/Results/Season.aspx?SchoolID=${schoolID}&S=${year}`
        return this.get(url).then(html => {
            return $(html)
        }).then(jqueryDoc => {
            let lookupTable = {}
            jqueryDoc.find(`table.pull-right-sm`).first().find('td').toArray().forEach(td => {
                    lookupTable[td.childNodes[0].textContent] = td.childNodes[1].textContent
            })
            console.log(lookupTable)
            let table = jqueryDoc.find(`div#${gender}_Table`)
            let dates = table.find('tbody').first().find('th').toArray().filter(date => date.className.indexOf("td") > -1).map(date => date.textContent + ` ${year}`)
            let rawathletes = table.find('tbody.athletes').first().find("tr").toArray().map(athlete => $(athlete).find("td").toArray().map(node => {

                if (node.getElementsByClassName("subscript").length >= 1) {
                    // this is a time node, check for 5k
                    console.log(node.childNodes[1].textContent)
                    if (lookupTable[node.childNodes[1].textContent] !== "5,000 Meters") { return null }
                        
                }
             return node.textContent
            }))
            let timeSorted = {}
            for (let raw of rawathletes) {
                let obj = {'grade': raw[0],'name': raw[1]}
                let times = raw.slice(2)
                let lastTimeIdx = times.indexOf(times.slice().reverse().filter(d => d !== " ")[0]) // the index of the last time
                for (let i = 1; i < times.length; i++) {
                    if (i > lastTimeIdx) { continue }
                    if (raw[i - 1 + 2] == " ") { continue }
                    if (raw[i + 2] == " ") { raw[i + 2] = raw[i - 1 + 2] } // overwrite a null time to a previous one
                }
                raw.slice(2).forEach((t,i) => { // All of the athletes times
                    if (t === null) { return }
                    let res = Object.assign({date: dates[i], time: t==" "?null:t, actualTime: (i==0) ? true : (raw.slice(2)[i-1]==t) ? false : true, endNode: i == lastTimeIdx}, obj)
                    if (!(dates[i] in timeSorted)) {
                        timeSorted[dates[i]] = []
                    }
                    timeSorted[dates[i]].push(res)
                })
            }
            for (let t in timeSorted) {
                if (timeSorted[t].length > rawathletes.length) {
                    // It's a combo, trim
                    timeSorted[t] = timeSorted[t].filter(t => t.actualTime == true)
                }

                timeSorted[t].sort(function(a,b) {
                    if (a.time===null) { return 1 }
                    if (b.time===null) { return -1 }
                    return moment(a.time, "mm:ss.S").isBefore(moment(b.time, "mm:ss.S")) ? -1 : 1;
                })
                // Now add the rankings
                for (var i = 0; i < timeSorted[t].length;i++) {
                        timeSorted[t][i].rank = i+1
                    }
                }
            return timeSorted
        })
    }
}