const axios = require('axios');
const cheerio = require('cheerio')

module.exports = class RunData {
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
    search(rawQuery,options={}) {
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
    /**
     * 
     * @param {string} id the athlete ID number
     * @param {*} sport the sport, written as TrackAndField or CrossCountry
     */
    records(id, sport) {
        return this.client.get(`/${sport}/Athlete.aspx?AID=${id}`).then(res => {
            console.log(res.data.length)
            const $ = cheerio.load(res.data)
            const records = $("#seasonRecords").find(".histEvent")
            let times = []
            records.each((i, elem) => {
                const title = $(elem).find("h5").text();
                const prTime = $(elem).find(".pr-text").last().parent().prev()
                times[i] = {event:title,time:prTime.text()}
            })
            return times
        })
    }
}