// try {
//     importScripts(
//         "helpers/moment.min.js",
//     )
// } catch (e) {
//     console.log(e)
// }

import fetch from 'node-fetch';
import FormData from "form-data";

import { chrome } from './cbookapi.mjs';


//All below code is pulled from the extension
//that means im not responsible for formatting :3
/* jshint ignore:start */


//LIBS
//its best to collapse both of these
//theyre in this file because everything accesses eachother and i dont want to deal with it
//WHY???? THEYRE CLASSES???? WHY NOT JUST USE THEM IN CONSTRUCTOR?????

// background/util.js
class Util {
    currentWebsite = ""
    encodedWebSite = ""
    encodedTitle = ""

    loadingSite = ""

    lastSpeedTestDate = 0
    downloadSpeed = 0
    uploadSpeed = 0

    mouseoverInterval = 0

    screenshot = ""
    cachedScreenshot = ""

    screenshotTime = Date.now()
    screenshotSite = ""

    constructor() {
    }


    b64toBlob(b64Data) {
        let contentType = 'image/jpeg'
        let sliceSize = 512

        let byteCharacters = atob(b64Data)
        let byteArrays = []

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            let slice = byteCharacters.slice(offset, offset + sliceSize)

            let byteNumbers = new Array(slice.length)
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i)
            }

            let byteArray = new Uint8Array(byteNumbers)

            byteArrays.push(byteArray)
        }

        if (byteArrays.length > 0) {
            return new Blob(byteArrays, {type: contentType})
        } else {
            return null
        }
    }




    updateDownloadSpeed(extensionUpdate) {
        if (this.downloadSpeed > 0.0 && this.uploadSpeed > 0.0) {
            // only send this information if it's available
            extensionUpdate.downloadSpeed = this.downloadSpeed
            extensionUpdate.uploadSpeed = this.uploadSpeed

            this.downloadSpeed = 0.0
            this.uploadSpeed = 0.0
        }
    }

    performSpeedTest() {
        let that = this
        // only let a speed test perform once every 5 minutes. We will check more often than that, but we want to make sure that
        // speedtests aren't going to get stuck in an infinite loop. This is only an issue if the speed test takes longer than 5 minutes
        if ((Date.now() - lastSpeedTestDate) / 1000 > 300) {
            console.log("Starting speed test")

            // this makes sure that we can only REQUEST a speed test once every 5 minutes
            this.lastSpeedTestDate = Date.now()

            // // this triggers the update script to start updating the server (so the UI can indicate a test is running)
            // downloadSpeed = 0.001
            // uploadSpeed = 0.001

            let serverName = "speedtest.net-ref.com"
            console.log("Starting speed test to: " + serverName)

            // this test run async. The speed data values will be updated when they are available
            ndt7.test(
                {
                    userAcceptedDataPolicy: true,
                    server: serverName,
                },
                {
                    serverChosen: function(server) {
                        // console.log('Testing to:', {
                        //     machine: server.machine,
                        //     locations: server.location,
                        // })
                    },
                    downloadComplete: function(data) {
                        //             // (bytes/second) * (bits/byte) / (megabits/bit) = Mbps
                        //             const serverBw = data.LastServerMeasurement.BBRInfo.BW * 8 / 1000000
                        //             const clientGoodput = data.LastClientMeasurement.MeanClientMbps
                        //             console.log(
                        //                 `Download test is complete:
                        // Instantaneous server bottleneck bandwidth estimate: ${serverBw} Mbps
                        // Mean client goodput: ${clientGoodput} Mbps`)

                        that.downloadSpeed = data.LastClientMeasurement.MeanClientMbps

                        console.log("Download: " + downloadSpeed)
                        // update the date again, since this might have taken a while.
                        // This makes sure we can't run another speedtest from XXX of time since this test finished
                        that.lastSpeedTestDate = Date.now()
                    },
                    uploadComplete: function(data) {
                        //             // TODO: used actual upload duration for rate calculation.
                        //             // bytes * (bits/byte() * (megabits/bit) * (1/seconds) = Mbps
                        //             const serverBw = data.LastServerMeasurement.TCPInfo.BytesReceived * 8 / 1000000 / 10
                        //             const clientGoodput = data.LastClientMeasurement.MeanClientMbps
                        //
                        //             console.log(
                        //                 `Upload test is complete:
                        // Mean server throughput: ${serverBw} Mbps
                        // Mean client goodput: ${clientGoodput} Mbps`)

                        that.uploadSpeed = data.LastClientMeasurement.MeanClientMbps

                        console.log("Upload: " + uploadSpeed)

                        // update the date again, since this might have taken a while.
                        // This makes sure we can't run another speedtest from XXX of time since this test finished
                        that.lastSpeedTestDate = Date.now()
                    },
                },
            )
        }
    }

    getCurrentSiteShared(tabs) {
        if (tabs.length <= 0) {
            return false
        }

        let url = tabs[0].url
        if (url.length === 0) {
            return false
        }

        let title = tabs[0].title

        if (tabs[0].status === "loading") {
            if (this.loadingSite !== url) {
                console.log("Site " + url + " is loading")

                this.loadingSite = url
                return false
            }
        }
        else {
            this.loadingSite = ""
        }

        if (this.loadingSite !== url) {
            this.loadingSite = ""
        }
        else {
            console.log("Site " + url + " took too long to load")
        }

        if (util.isBrowserSpecificUrl(url) || util.isNetRefSite(url)) {
            this.currentWebsite = ""
            this.encodedWebSite = ""
            this.encodedTitle = ""

            this.screenshotSite = ""
            return false
        }

        this.currentWebsite = url
        this.encodedWebSite = btoa(url)
        this.encodedTitle = btoa(title)

        return true
    }

    isNetRefSite(fullUrl) {
        let noHttps = fullUrl.replace('http://', '').replace('https://', '')
        let baseUrl = noHttps.split(/[/?#:]/)[0]

        // Don't block our websites
        return baseUrl.includes("net-ref.com")
    }

    isBrowserSpecificUrl(fullUrl) {
        if (!fullUrl) {
            return false
        }

        if (fullUrl.length === 0) {
            return false
        }

        // Don't block chrome tabs
        if (fullUrl.startsWith("chrome://")) {
            return true
        }

        // Dont block edge tabs
        if (fullUrl.startsWith("edge://")) {
            return true
        }

        // Dont block chrome extension options
        if (fullUrl.startsWith("chrome-extension://")) {
            return true
        }

        // Don't block firefox tabs
        if (fullUrl.startsWith("about:")) {
            return true
        }

        return false
    }

    includes(fullUrl, sites, subSites, caseSensitive = true) {
        sites = sites.slice() // defensive copy
        subSites = subSites.slice() // defensive copy

        if (!caseSensitive) {
            let i
            fullUrl = fullUrl.toLowerCase()

            for (i = 0; i<sites.length; i++) {
                sites[i] = sites[i].toLowerCase()
            }
            for (i = 0; i<subSites.length; i++) {
                subSites[i] = subSites[i].toLowerCase()
            }
        }

        let cleanedUrl = fullUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")

        let siteSplit = cleanedUrl.split('?')

        let site = siteSplit[0]
        let query = siteSplit[1]

        // Remove the trailing /
        if (site.charAt(site.length - 1) === '/') {
            site = site.substring(0, site.length - 1)
        }

        if (site.length === 0) {
            return false
        }

        let isGoogleSite = site.includes("google.com")
        let isYoutubeSite = site.includes("youtube.com")

        let dotCount = site.split(".").length - 1
        let hasPath = site.split("/").length > 1

        let isSld = dotCount <= 1 && !hasPath

        if (isGoogleSite) {
            // noinspection DuplicatedCode
            if (isSld) {
                // This is just google.com
                for (let i = 0; i < sites.length; i++) {
                    if (site === sites[i]) {
                        console.debug(site + " equals " + sites[i])
                        return true
                    }
                }
            } else {
                for (let i = 0; i < sites.length; i++) {
                    if (site.startsWith(sites[i])) {
                        console.debug(site + " starts with " + sites[i])
                        return true
                    }
                }

                for (let i = 0; i < subSites.length; i++) {
                    if (site.startsWith(subSites[i])) {
                        console.debug(site + " starts with " + subSites[i])
                        return true
                    }
                }
            }
        } else if (isYoutubeSite) {
            // noinspection DuplicatedCode
            if (isSld) {
                // This is just youtube.com
                for (let i = 0; i < sites.length; i++) {
                    if (site === sites[i]) {
                        console.debug(site + " equals " + sites[i])
                        return true
                    }
                }
            } else {
                for (let i = 0; i < sites.length; i++) {
                    if (cleanedUrl.startsWith(sites[i])) {
                        console.debug(site + " starts with " + sites[i])
                        return true
                    }
                }

                for (let i = 0; i < subSites.length; i++) {
                    if (cleanedUrl.startsWith(subSites[i])) {
                        console.debug(cleanedUrl + " starts with " + subSites[i])
                        return true
                    }
                }
            }
        } else if (isSld) {
            for (let i = 0; i < sites.length; i++) {
                if (site === sites[i]) {
                    console.debug(site + " equals " + sites[i])
                    return true;
                }
            }

            for (let i = 0; i < subSites.length; i++) {
                if (site.includes(subSites[i])) {
                    console.debug(site + " includes " + subSites[i])
                    return true
                }
            }
        } else {
            for (let i = 0; i < sites.length; i++) {
                if (site.includes(sites[i])) {
                    console.debug(site + " includes " + sites[i])
                    return true
                }
            }

            for (let i = 0; i < subSites.length; i++) {
                if (site.includes(subSites[i])) {
                    console.debug(site + " includes " + subSites[i])
                    return true
                }
            }
        }

        return false
    }

    /**
     * @name ndt7
     * @namespace ndt7
     */
    ndt7 = (function() {
        // cb creates a default-empty callback function, allowing library users to
        // only need to specify callback functions for the events they care about.
        //
        // This function is not exported.
        const cb = function(name, callbacks, defaultFn) {
            // If no default function is provided, use the empty function.
            if (typeof defaultFn === 'undefined') {
                defaultFn = function() {}
            }
            if (typeof(callbacks) !== 'undefined' && name in callbacks) {
                return callbacks[name]
            } else {
                return defaultFn
            }
        }

        const defaultErrCallback = function(err) {
            throw new Error(err)
        }

        /**
         * discoverServerURLs contacts a web service (likely the Measurement Lab
         * locate service, but not necessarily) and gets URLs with access tokens in
         * them for the client. It can be short-circuted if config.server exists,
         * which is useful for clients served from the webserver of an NDT server.
         *
         * @param {Object} config - An associative array of configuration options.
         * @param {Object} userCallbacks - An associative array of user callbacks.
         *
         * It uses the callback functions `error`, `serverDiscovery`, and
         * `serverChosen`.
         *
         * @name ndt7.discoverServerURLS
         * @public
         */
        async function discoverServerURLs(config, userCallbacks) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                serverDiscovery: cb('serverDiscovery', userCallbacks),
                serverChosen: cb('serverChosen', userCallbacks),
            }

            // If a server was specified, use it.
            if (config && ('server' in config)) {
                return {
                    'ws:///ndt/v7/download': 'ws://' + config.server + '/ndt/v7/download',
                    'ws:///ndt/v7/upload': 'ws://' + config.server + '/ndt/v7/upload',
                    'wss:///ndt/v7/download': 'wss://' + config.server + '/ndt/v7/download',
                    'wss:///ndt/v7/upload': 'wss://' + config.server + '/ndt/v7/upload',
                }
            }

            // If no server was specified then use a loadbalancer. If no loadbalancer
            // is specified, use the locate service from Measurement Lab.
            const lbURL = (config && ('loadbalancer' in config)) ? config.loadbalancer : new URL('https://locate.measurementlab.net/v2/nearest/ndt/ndt7')
            callbacks.serverDiscovery({loadbalancer: lbURL})
            const response = await fetch(lbURL)
            const js = await response.json()
            if (! ('results' in js) ) {
                callbacks.error(`Could not understand response from ${lbURL}: ${js}`)
                return {}
            }

            // TODO: do not discard unused results. If the first server is unavailable
            // the client should quickly try the next server.
            const choice = js.results[Math.floor(Math.random() * js.results.length)]
            callbacks.serverChosen(choice)
            return choice.urls
        }

        /*
         * runNDT7Worker is a helper function that runs a webworker. It uses the
         * callback functions `error`, `start`, `measurement`, and `complete`. It
         * returns a c-style return code. 0 is success, non-zero is some kind of
         * failure.
         *
         * @private
         */
        const runNDT7Worker = async function(
            config, callbacks, urlPromise, filename, testType) {
            if (config.userAcceptedDataPolicy !== true &&
                config.mlabDataPolicyInapplicable !== true) {
                callbacks.error('The M-Lab data policy is applicable and the user ' +
                    'has not explicitly accepted that data policy.')
                return 1
            }

            let clientMeasurement
            let serverMeasurement

            // __dirname only exists for node.js, but is required in that environment
            // to ensure that the files for the Worker are found in the right place.
            if (typeof __dirname !== 'undefined') {
                filename = __dirname + '/' + filename
            }

            // This makes the worker. The worker won't actually start until it
            // receives a message.
            const worker = new Worker(filename)

            // When the workerPromise gets resolved it will terminate the worker.
            // Workers are resolved with c-style return codes. 0 for success,
            // non-zero for failure.
            const workerPromise = new Promise((resolve) => {
                worker.resolve = function(returnCode) {
                    worker.terminate()
                    resolve(returnCode)
                }
            })

            // If the worker takes 20 seconds, kill it and return an error code.
            setTimeout(() => worker.resolve(2), 20000)

            // This is how the worker communicates back to the main thread of
            // execution.  The MsgTpe of `ev` determines which callback the message
            // gets forwarded to.
            worker.onmessage = function(ev) {
                if (!ev.data || ev.data.MsgType === 'error') {
                    worker.resolve(3)
                    const msg = (!ev.data) ? `${testType} error` : ev.data.Error
                    callbacks.error(msg)
                } else if (ev.data.MsgType === 'start') {
                    callbacks.start(ev.data)
                } else if (ev.data.MsgType == 'measurement') {
                    if (ev.data.Source == 'server') {
                        serverMeasurement = JSON.parse(ev.data.ServerMessage)
                        callbacks.measurement({
                            Source: ev.data.Source,
                            Data: serverMeasurement,
                        })
                    } else {
                        clientMeasurement = ev.data.ClientData
                        callbacks.measurement({
                            Source: ev.data.Source,
                            Data: ev.data.ClientData,
                        })
                    }
                } else if (ev.data.MsgType == 'complete') {
                    worker.resolve(0)
                    callbacks.complete({
                        LastClientMeasurement: clientMeasurement,
                        LastServerMeasurement: serverMeasurement,
                    })
                }
            }

            // We can't start the worker until we know the right server, so we wait
            // here to find that out.
            const urls = await urlPromise

            // Start the worker.
            worker.postMessage(urls)

            // Await the resolution of the workerPromise.
            return await workerPromise

            // Liveness guarantee - once the promise is resolved, .terminate() has
            // been called and the webworker will be terminated or in the process of
            // being terminated.
        }

        /**
         * downloadTest runs just the NDT7 download test.
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         * @param {Object} urlPromise - A promise that will resolve to urls.
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.downloadTest
         * @public
         */
        async function downloadTest(config, userCallbacks, urlPromise) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                start: cb('downloadStart', userCallbacks),
                measurement: cb('downloadMeasurement', userCallbacks),
                complete: cb('downloadComplete', userCallbacks),
            }
            return await runNDT7Worker(
                config, callbacks, urlPromise, 'background/mlab/ndt7-download-worker.js', 'download')
        }

        /**
         * uploadTest runs just the NDT7 download test.
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         * @param {Object} urlPromise - A promise that will resolve to urls.
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.uploadTest
         * @public
         */
        async function uploadTest(config, userCallbacks, urlPromise) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                start: cb('uploadStart', userCallbacks),
                measurement: cb('uploadMeasurement', userCallbacks),
                complete: cb('uploadComplete', userCallbacks),
            }
            const rv = await runNDT7Worker(
                config, callbacks, urlPromise, 'background/mlab/ndt7-upload-worker.js', 'upload')
            return rv << 4
        }

        /**
         * test discovers a server to run against and then runs a download test
         * followed by an upload test.
         *
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.test
         * @public
         */
        async function test(config, userCallbacks) {
            // Starts the asynchronous process of server discovery, allowing other
            // stuff to proceed in the background.
            const urlPromise = discoverServerURLs(config, userCallbacks)
            const downloadSuccess = await downloadTest(config, userCallbacks, urlPromise)
            const uploadSuccess = await uploadTest(config, userCallbacks, urlPromise)
            return downloadSuccess + uploadSuccess
        }

        return {
            discoverServerURLs: discoverServerURLs,
            downloadTest: downloadTest,
            uploadTest: uploadTest,
            test: test,
        }
    })()
}

// background/config.js
class Config {
    // this is in minutes.
    defaultInactivityTimeout = 15
    inactivityTimeout = 15
    studentActive = true

    directoryId = ""


    timeEnum = Object.freeze({"DISTRICT":0, "ALWAYS":1, "NEVER":2, "CUSTOM":3})
    stateEnum = Object.freeze({"ALLOW":0, "WHITELIST":1, "BLACKLIST":2, "BLOCK":3})
    state = this.stateEnum.ALLOW


    blockedSites = new Set()
    siteBytesMap = new Map()



    needsConfig = true

    districtName = "Default"
    studentDbId = "-1"

    tabLimit = -1
    queryDelay = 5

    screenshotDelay = 60
    screenshotQuality = 75

    districtOperatingDays = [0, 1, 2, 3, 4, 5, 6]

    districtMonitoringHours = this.timeEnum.ALWAYS
    districtMonitoringStartTime = "00:00:00"
    districtMonitoringEndTime = "23:59:59"

    districtControlHours = this.timeEnum.ALWAYS
    districtControlStartTime = "00:00:00"
    districtControlEndTime = "23:59:59"

    districtScreenshotHours = this.timeEnum.NEVER
    districtScreenshotStartTime = "00:00:00"
    districtScreenshotEndTime = "23:59:59"
    districtScreenshotBlackRules = []

    districtInternetHours = this.timeEnum.ALWAYS
    districtInternetStartTime = "00:00:00"
    districtInternetEndTime = "23:59:59"

    schoolMonitoringHours = this.timeEnum.DISTRICT
    schoolMonitoringStartTime = "00:00:00"
    schoolMonitoringEndTime = "23:59:59"

    schoolControlHours = this.timeEnum.DISTRICT
    schoolControlStartTime = "00:00:00"
    schoolControlEndTime = "23:59:59"

    schoolScreenshotHours = this.timeEnum.DISTRICT
    schoolScreenshotStartTime = "00:00:00"
    schoolScreenshotEndTime = "23:59:59"

    schoolInternetHours = this.timeEnum.DISTRICT
    schoolInternetStartTime = "00:00:00"
    schoolInternetEndTime = "23:59:59"


    timeoutDistrictSites = []
    timeoutDistrictSubSites = []

    timeoutStudentSites = []
    timeoutStudentSubSites = []

    permDistrictWhiteSites = []
    permDistrictWhiteSubSites = []
    permDistrictBlackSites = []
    permDistrictBlackSubSites = []

    permStudentWhiteSites = []
    permStudentWhiteSubSites = []
    permStudentBlackSites = []
    permStudentBlackSubSites = []

    teacherWhiteSites = []
    teacherWhiteSubSites = []
    teacherBlackSites = []
    teacherBlackSubSites = []

    constructor(util) {
        this.util = util
    }


    parseConfig(configuration) {
        console.log(configuration)

        let hasRuleUpdate = configuration.hasRuleUpdate

        this.studentDbId = configuration.dbId

        this.districtName = configuration.districtName

        if (configuration.hasOwnProperty('tL')) {
            if (configuration.tL > 0 && this.tabLimit !== configuration.tL) {
                limitTabs(configuration.tL)
            }
            this.tabLimit = configuration.tL
        }

        this.queryDelay = configuration.qD
        this.screenshotDelay = configuration.sD
        this.screenshotQuality = configuration.sQ

        // in minutes, and we have to convert
        this.inactivityTimeout = configuration.iT
        if (this.inactivityTimeout === 0) {
            this.inactivityTimeout = this.defaultInactivityTimeout
        }

        if (configuration.hasOwnProperty('dOD')) {
            this.districtOperatingDays = configuration.dOD
        }

        this.districtMonitoringHours = this.getTimeOption(configuration.dMH)
        this.districtMonitoringStartTime = configuration.dMST
        this.districtMonitoringEndTime = configuration.dMET

        this.districtControlHours = this.getTimeOption(configuration.dCH)
        this.districtControlStartTime = configuration.dCST
        this.districtControlEndTime = configuration.dCET

        this.districtScreenshotHours = this.getTimeOption(configuration.dSH)
        this.districtScreenshotStartTime = configuration.dSST
        this.districtScreenshotEndTime = configuration.dSET
        this.districtScreenshotBlackRules = configuration.sSBR

        this.districtInternetHours = this.getTimeOption(configuration.dIH)
        this.districtInternetStartTime = configuration.dIST
        this.districtInternetEndTime = configuration.dIET

        this.schoolMonitoringHours = this.getTimeOption(configuration.sMH)
        this.schoolMonitoringStartTime = configuration.sMST
        this.schoolMonitoringEndTime = configuration.sMET

        this.schoolControlHours = this.getTimeOption(configuration.sCH)
        this.schoolControlStartTime = configuration.sCST
        this.schoolControlEndTime = configuration.sCET

        this.schoolScreenshotHours = this.getTimeOption(configuration.sSH)
        this.schoolScreenshotStartTime = configuration.sSST
        this.schoolScreenshotEndTime = configuration.sSET

        this.schoolInternetHours = this.getTimeOption(configuration.sIH)
        this.schoolInternetStartTime = configuration.sIST
        this.schoolInternetEndTime = configuration.sIET

        if (hasRuleUpdate) {
            console.log("Has Rule Update")

            this.splitRules(configuration.tDR, this.timeoutDistrictSites, this.timeoutDistrictSubSites)

            this.splitRules(configuration.tSR, this.timeoutStudentSites, this.timeoutStudentSubSites)

            this.splitRules(configuration.pDWR, this.permDistrictWhiteSites, this.permDistrictWhiteSubSites)
            this.splitRules(configuration.pDBR, this.permDistrictBlackSites, this.permDistrictBlackSubSites)

            this.splitRules(configuration.pSWR, this.permStudentWhiteSites, this.permStudentWhiteSubSites)
            this.splitRules(configuration.pSBR, this.permStudentBlackSites, this.permStudentBlackSubSites)

            switch (configuration.ruleState) {
                case "ALLOW":
                    if (this.state === this.stateEnum.BLOCK) {
                        // when we move to the ALLOW state, we want to force screenshots to start up again.
                        util.cachedScreenshot = ""
                    }
                    this.state = this.stateEnum.ALLOW
                    break
                case "WHITELIST":
                    this.state = this.stateEnum.WHITELIST
                    break
                case "BLACKLIST":
                    this.state = this.stateEnum.BLACKLIST
                    break
                case "BLOCK":
                    this.state = this.stateEnum.BLOCK
                    break
            }

            this.splitRules(configuration.tWR, this.teacherWhiteSites, this.teacherWhiteSubSites)
            this.splitRules(configuration.tBR, this.teacherBlackSites, this.teacherBlackSubSites)
        }

        openTab(configuration.oS)
        closeTab(configuration.cS)

        let messageSender = configuration.mS
        let messageText = configuration.mT
        if (messageSender !== "" && messageText !== "") {
            pushNotification(messageSender, messageText)
        }

        if (configuration.sST === true) {
            this.util.performSpeedTest()
        }

        this.needsConfig = false
    }

    getTimeOption(timeOptionString) {
        switch (timeOptionString) {
            case "DISTRICT":
                return this.timeEnum.DISTRICT
            case "ALWAYS":
                return this.timeEnum.ALWAYS
            case "NEVER":
                return this.timeEnum.NEVER
            case "CUSTOM":
                return this.timeEnum.CUSTOM
        }
    }


    splitRules(rules, sites, subSites) {
        sites.length = 0
        subSites.length = 0

        for (let i = 0; i < rules.length; i++) {
            let site = rules[i]

            let dotCount = site.split(".").length - 1
            let hasPath = site.split("/").length > 1

            if (dotCount <= 1 && !hasPath) {
                sites.push(site)
            } else {
                subSites.push(site)
            }
        }
    }


    updateServer(studentEmail, extensionVersion, email, machineName, connectedToApp) {
        let formData = new FormData()
        let extensionUpdate = {}


        let allowedToMonitor = this.shouldMonitor()
        let allowScreenshot = this.shouldScreenshot()

        if (this.inactivityTimeout === 15) {
            this.studentIsActive = true
        }


        extensionUpdate.needsConfig = this.needsConfig

        extensionUpdate.encodedWebSite = allowedToMonitor && this.studentIsActive ? this.util.encodedWebSite : ""
        extensionUpdate.encodedTitle = allowedToMonitor && this.studentIsActive ? this.util.encodedTitle : ""
        extensionUpdate.blockedSites = allowedToMonitor ? Array.from(this.blockedSites) : []

        console.log("Student is active: " + this.studentIsActive)


        extensionUpdate.siteBytesMap = allowedToMonitor ? Object.fromEntries(this.siteBytesMap) : Object.fromEntries(new Map())

        extensionUpdate.screenshotFileName = ""

        extensionUpdate.directoryId = this.directoryId

        this.util.updateDownloadSpeed(extensionUpdate)


        let myself = this

        if (!connectedToApp && allowedToMonitor && allowScreenshot && this.util.screenshot !== undefined && this.util.screenshot.length !== 0) {
            let fileName = this.districtName + "/" + this.studentDbId + "/" + moment().format("YYYYMMDD[/]H[/]m[_]s") + ".jpg"

            extensionUpdate.screenshotFileName = fileName
            formData.append("name", fileName)

            // Convert the screenshot to a blob to upload
            let blob = this.util.b64toBlob(this.util.screenshot.split(",")[1],)
            if (blob) {
                // only attempt upload if we have a screenshot
                formData.append("screenshot", blob)

                // screenshot request
                fetch(filesHost, {
                    method: "POST",
                    body: formData,
                })
                .then(function(response) {
                    if (!response.ok) {
                        // if there was a problem with uploading the screenshot, we don't send it along as part of the student activity
                        console.log("Error uploading screenshot, code: " + response.status)
                        extensionUpdate.screenshotFileName = ""
                    } else {
                        console.log("Upload screenshot success.")
                    }

                    // send student activity AFTER we upload the screenshot
                    let updateString = JSON.stringify(extensionUpdate)
                    myself.sendStudentActivity(studentEmail, machineName, updateString)
                    console.log(updateString)
                })
                .catch(function(err) {
                    console.log("Failed to upload screenshot: ", err)
                })
            }

        } else {
            let updateString = JSON.stringify(extensionUpdate)
            myself.sendStudentActivity(studentEmail, machineName, updateString)
            console.log(updateString)
        }


        this.util.screenshot = ""
        this.blockedSites = new Set()
        this.siteBytesMap = new Map()

        // Reset our screenshot cache so we can retake quickly
        if (!allowScreenshot || !this.studentIsActive || extensionUpdate.encodedWebSite.length === 0) {
            this.util.cachedScreenshot = ""
            this.util.screenshotSite = ""
        }
    }

    shouldMonitor() {
        let dayOfWeek = new Date().getDay()

        if (this.districtOperatingDays.includes(dayOfWeek)) {
            return this.inTimeRange(this.districtMonitoringHours, this.districtMonitoringStartTime, this.districtMonitoringEndTime,
                this.schoolMonitoringHours, this.schoolMonitoringStartTime, this.schoolMonitoringEndTime)
        } else {
            return false
        }
    }

    shouldScreenshot() {
        let dayOfWeek = new Date().getDay()

        if (this.districtOperatingDays.includes(dayOfWeek)) {
            return this.inTimeRange(this.districtScreenshotHours, this.districtScreenshotStartTime, this.districtScreenshotEndTime,
                this.schoolScreenshotHours, this.schoolScreenshotStartTime, this.schoolScreenshotEndTime)
        } else {
            return false
        }
    }

    shouldControl() {
        return this.inTimeRange(this.districtControlHours, this.districtControlStartTime, this.districtControlEndTime,
            this.schoolControlHours, this.schoolControlStartTime, this.schoolControlEndTime)
    }

    shouldAllowInternet() {
        return this.inTimeRange(this.districtInternetHours, this.districtInternetStartTime, this.districtInternetEndTime,
            this.schoolInternetHours, this.schoolInternetStartTime, this.schoolInternetEndTime)
    }

    isBetween(startTime, endTime) {
        let today = new Date()

        let startDate = new Date(today.getMonth() + 1 + "/" + today.getDate() + "/" + today.getFullYear() + " " + startTime)
        let endDate = new Date(today.getMonth() + 1 + "/" + today.getDate() + "/" + today.getFullYear() + " " + endTime)

        if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1)
        }

        return startDate <= today && today <= endDate
    }

    inTimeRange(districtTimeOption, districtStartTime, districtEndTime,
                schoolTimeOption, schoolStartTime, schoolEndTime) {

        let inTimeRange = false
        if (schoolTimeOption === this.timeEnum.DISTRICT) {
            if (districtTimeOption === this.timeEnum.ALWAYS) {
                inTimeRange = true
            } else if (districtTimeOption === this.timeEnum.NEVER) {
                inTimeRange = false
            } else {
                inTimeRange = this.isBetween(districtStartTime, districtEndTime)
            }
        } else {
            if (schoolTimeOption === this.timeEnum.ALWAYS) {
                inTimeRange = true
            } else if (schoolTimeOption === this.timeEnum.NEVER) {
                inTimeRange = false
            } else {
                inTimeRange = this.isBetween(schoolStartTime, schoolEndTime)
            }
        }

        return inTimeRange
    }

    // context here is from a window callback via the netrefPlugin.js
    storeSiteByteMap(details) {
        if (details.fromCache === true) {
            return
        }

        let initiator = details.initiator
        if (initiator === undefined || util.isBrowserSpecificUrl(initiator)) {
            return
        }

        let url = initiator.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")

        for (let i = 0; i < details.responseHeaders.length; i++) {
            let header = details.responseHeaders[i]
            if (header.name === "content-length") {
                let bytes = parseInt(header.value)

                if (bytes === 0) {
                    return
                }

                let currentBytes = 0
                if (config.siteBytesMap.has(url)) {
                    currentBytes = config.siteBytesMap.get(url)
                }

                currentBytes += bytes

                config.siteBytesMap.set(url, currentBytes)
            }
        }
    }

    sendStudentActivity(studentEmail, machineName, bodyData) {
        // update request
        fetch(extensionHost + "?type=chrome&email=" + studentEmail + "&machine=" + machineName + "&version=" + extensionVersion, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: bodyData,
        })
            .then(function(response) {
                if (response.status === 200) {
                    response.text().then(function(responseText) {
                        try {
                            let configuration = JSON.parse(responseText)
                            config.parseConfig(configuration)
                        } catch (e) {
                            console.log(e)

                            reset()
                        }
                    })
                } else if (response.status === 205) {
                    console.log("Outside School Network")
                    //TODO: bypass school ip check

                    reset()
                } else {
                    console.log("Request: " + extensionHost + "?type=chrome" + " : Email:" + studentEmail + "  ::  Status: " + response.status)

                    reset()
                }
            })
            .catch(function(err) {
                console.log("ERROR")
                reset()
            })
    }

    blockSite(siteInLowerCase) {
        let dayOfWeek = new Date().getDay()

        if (!this.districtOperatingDays.includes(dayOfWeek)) {
            console.log("Not allowed to control access. Allowing")
            return false
        }

        if (!this.shouldAllowInternet()) {
            console.log("Internet not allowed. Blocking")
            return true
        }

        // If a site is in the district timout sites or the student timeout sites, don't redirect.
        if (this.timeoutDistrictSites.length !== 0 || this.timeoutDistrictSubSites.length !== 0) {
            if (util.includes(siteInLowerCase, this.timeoutDistrictSites, this.timeoutDistrictSubSites)) {
                return false
            }
            else if (this.timeoutStudentSites.length !== 0 || this.timeoutStudentSubSites.length !== 0) {
                return !util.includes(siteInLowerCase, this.timeoutStudentSites, this.timeoutStudentSubSites)
            } else {
                return true
            }
        }

        // if a site is in the student timeout sites, don't redirect.
        if (this.timeoutStudentSites.length !== 0 || this.timeoutStudentSubSites.length !== 0) {
            return !util.includes(siteInLowerCase, this.timeoutStudentSites, this.timeoutStudentSubSites)
        }

        if (util.includes(siteInLowerCase, this.permDistrictWhiteSites, this.permDistrictWhiteSubSites)) {
            return false
        }

        if (util.includes(siteInLowerCase, this.permDistrictBlackSites, this.permDistrictBlackSubSites)) {
            return true
        }

        if (util.includes(siteInLowerCase, this.permStudentWhiteSites, this.permStudentWhiteSubSites)) {
            return false
        }

        if (util.includes(siteInLowerCase, this.permStudentBlackSites, this.permStudentBlackSubSites)) {
            return true
        }

        if (!this.shouldControl()) {
            console.debug("Not allowed to control. Allowing")
            return false
        }

        switch (this.state) {
            case this.stateEnum.ALLOW:
                return false
            case this.stateEnum.WHITELIST:
                return !util.includes(siteInLowerCase, this.teacherWhiteSites, this.teacherWhiteSubSites)
            case this.stateEnum.BLACKLIST:
                return util.includes(siteInLowerCase, this.teacherBlackSites, this.teacherBlackSubSites)
            case this.stateEnum.BLOCK:
                return true
        }
    }

    reset() {
        this.state = this.stateEnum.ALLOW

        this.needsConfig = true

        this.timeoutStudentSites = []
        this.timeoutStudentSubSites = []

        this.permDistrictWhiteSites = []
        this.permDistrictWhiteSubSites = []
        this.permDistrictBlackSites = []
        this.permDistrictBlackSubSites = []

        this.permStudentWhiteSites = []
        this.permStudentWhiteSubSites = []
        this.permStudentBlackSites = []
        this.permStudentBlackSubSites = []

        this.teacherWhiteSites = []
        this.teacherWhiteSubSites = []
        this.teacherBlackSites = []
        this.teacherBlackSubSites = []

        this.districtInternetHours = this.timeEnum.ALWAYS
        this.districtInternetStartTime = "00:00:00"
        this.districtInternetEndTime = "23:59:59"

        this.schoolInternetHours = this.timeEnum.DISTRICT
        this.schoolInternetStartTime = "00:00:00"
        this.schoolInternetEndTime = "23:59:59"
    }
}

//END LIBS

// background/netrefPlugin.js

// NOTE: This extension is also alongside the native agents.
let extensionVersion = chrome.runtime.getManifest().version

let isQA = chrome.runtime.getManifest().name.endsWith(" QA")

let configHost = "https://webserver.net-ref.com/extension/config?email="
if (isQA) {
    configHost = "https://webservertwo.net-ref.com/extension/config?email="
}

let extensionHost = "https://webserver.net-ref.com/extension/cloud/update"
let filesHost = "https://files.net-ref.com/screenshot/upload"
let denyHost = "https://webserver.net-ref.com/block?redirected_url="

let configIsDefault = true
let configUrlsStartedUpdate = false


let connectedToApp = false

let openTabs = 0

let util = new Util()
console.log(util)
let config = new Config(util)




chrome.webRequest.onCompleted.addListener(config.storeSiteByteMap,
    {
        urls: [
            "<all_urls>",
        ]
    },
    ["responseHeaders"]
)

chrome.runtime.onMessage.addListener(
    function (request) {
        config.studentIsInactive = false
        clearInterval(util.mouseoverInterval)

        let timeOut = config.inactivityTimeout * 60 * 1000

        util.mouseoverInterval = setInterval(() => {
            config.studentIsInactive = true
        }, timeOut)

        return true
    })

chrome.tabs.onCreated.addListener(function (tab) {
    openTabs++

    if (config.tabLimit > 0 && openTabs > config.tabLimit) {
        chrome.tabs.remove(tab.id, function() {  })
    }
})

chrome.tabs.onRemoved.addListener(function (tab) {
    openTabs--
})

function redirectBlockedSites() {
    chrome.windows.getAll({populate: true}, function (windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                let url = tab.url
                let siteInLowerCase = url.toLowerCase()
                if (util.isBrowserSpecificUrl(siteInLowerCase)) {
                    // never block browser specific urls.
                } else {
                    if (config.blockSite(siteInLowerCase)) {
                        // we should block this url

                        // if we are a netref website, don't block it.
                        if (!util.isNetRefSite(siteInLowerCase)) {
                            if (url === util.currentWebsite) {
                                console.log("Blocked website is current website. Clearing cached data.")

                                util.currentWebsite = ""
                                util.encodedWebSite = ""
                                util.encodedTitle = ""

                                util.screenshot = ""
                                util.screenshotSite = ""
                            }

                            config.blockedSites.add(new URL(url).host)

                            let redirectUrl = denyHost + btoa(url)
                            chrome.tabs.update(tab.id, {url:redirectUrl})
                        }
                    } else {
                        // we should not be blocking this website.
                        if (url.startsWith(denyHost)) {
                            let origUrl = atob(tab.url.substring(denyHost.length))

                            // only if we're actually allowed to show it based on our rules
                            if (!config.blockSite(origUrl)) {
                                console.log("Formerly blocked page, we should allow: " + origUrl)
                                chrome.tabs.update(tab.id, {url:origUrl})
                            }
                        }
                    }
                }
            })
        })
    })

    setTimeout(redirectBlockedSites,  500)
}


function pushNotification(senderName, messageText) {
    let opt = {
        type: "basic",
        title: "Message from your teacher (" + senderName + ")",
        message: messageText,
        iconUrl: "img/icon.png"
    }

    chrome.notifications.create(opt)
}

function openTab(sites) {
    if (sites.length === 0) {
        return
    }

    for (let i = 0; i < sites.length; i++) {
        let site = sites[i]

        chrome.tabs.query({}, function (tabs) {
            let tabId = -1

            for (let i = 0; i < tabs.length; i++) {
                let url = tabs[i].url.toLowerCase()

                if (url.includes(site)) {
                    tabId = tabs[i].id
                    break
                }
            }

            if (tabId === -1) {
                chrome.tabs.create({url: "https://" + site.toString()})
            } else {
                chrome.tabs.update(tabId, {"active": true})
            }
        })
    }
}

function closeTab(sites) {
    if (sites.length === 0) {
        return
    }

    chrome.tabs.query({ url: sites}, function (tabs) {
        let tabIds = tabs.map(function (tab) {
            return tab.id
        })
        chrome.tabs.remove(tabIds)
    })
}

function parseUpdatesConfiguration(response) {
    if (response.status === 200) {
        try {
            response.text().then(function(responseText) {
                let configuration = JSON.parse(responseText)
                console.log(configuration)

                extensionHost = configuration.extensionHost
                filesHost = configuration.filesHost
                denyHost = configuration.denyHost
            })
        } catch (e) {
            reset()
        }
    }
}

function getUpdateUrl() {
    fetch("http://loasdsdascalhost:5555/config", {
            mode: "no-cors"
        })
        .then(function(response) {
            parseUpdatesConfiguration(response)
            connectedToApp = true
        })
        .catch(function(err) {
            // unless the user has enabled "Account Sync", this will be empty. We change the default to 'ANY' to support cases where the
            // account is not in the "sync" state.
            chrome.identity.getProfileUserInfo({accountStatus: 'ANY'}, function(info) {
                let studentEmail = encodeURIComponent(info.email)

                if (studentEmail.length === 0) {
                    return
                }

                // the email header IS NOT set here because we specifically DO NOT want to do that
                fetch(configHost + studentEmail)
                    .then(function(response) {
                        parseUpdatesConfiguration(response)
                        connectedToApp = false
                    })
                    .catch(function(err) {
                        reset()
                    })
            })
        })

    // check to see if we are different!
    configIsDefault = configIsDefault &&
                            (extensionHost === "https://webserver.net-ref.com/extension/cloud/update" &&
                             filesHost === "https://files.net-ref.com/screenshot/upload" &&
                             denyHost === "https://webserver.net-ref.com/block?redirected_url="
                            )

    if (configIsDefault) {
        // update every 1x every 5 seconds until a fix. Then update every 5 minutes. This mirrors the web/windows repeat rate (MACOS is different)
        setTimeout(getUpdateUrl, 5 * 1000)
    } else {
        // update every 1x every 5 minutes. This mirrors the web/windows repeat rate (MACOS is different)
        setTimeout(getUpdateUrl, 5 * 60 * 1000)

        if (!configUrlsStartedUpdate) {
            configUrlsStartedUpdate = true
            updateServer()
        }
    }
}


function reset() {
    console.log("Resetting")
    config.reset()
}

function updateServer() {
    // unless the user has enabled "Account Sync", this will be empty. We change the default to 'ANY' to support cases where the
    // account is not in the "sync" state.
    chrome.identity.getProfileUserInfo({accountStatus: 'ANY'}, function(info) {
        let email = info.email
        let studentEmail = encodeURIComponent(email)

        config.updateServer(studentEmail, extensionVersion, email, connectedToApp)
    })


    if (connectedToApp) {
        // faster updates to local app
        setTimeout(updateServer, 1000)
    } else {
        setTimeout(updateServer, config.queryDelay * 1000)
    }
}

function getCurrentSite() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true}, function (tabs) {
        if (util.getCurrentSiteShared(tabs)) {
            let url = tabs[0].url
            if (util.includes(url.toLowerCase(), config.districtScreenshotBlackRules, [], false)) {
                console.log("Not taking screenshot of " + url + ", as it is in the blocked screenshots list configured for the district.")
                return
            }

            let timeElapsed = (Date.now() - util.screenshotTime) / 1000
            let canTakeScreenshot = false

            if (util.screenshotSite !== url) {
                canTakeScreenshot = true
                console.log("website URL changed, taking screenshot")
            } else if (timeElapsed > config.screenshotDelay) {
                canTakeScreenshot = true
                console.log("timeout has expired, taking Screenshot")
            } else {
                console.log("Only " + timeElapsed + " seconds have passed. Not Taking Screenshot")
            }

            if (canTakeScreenshot) {
                chrome.tabs.captureVisibleTab(null, {format: "jpeg", quality: config.screenshotQuality}, function (img) {
                    if (img === undefined) {
                        console.log("Invalid screenshot, unable to continue.")
                    } else if (util.cachedScreenshot !== img) {
                        console.log("Screenshot is not the same. Saving Screenshot")
                        util.screenshot = img
                        util.cachedScreenshot = img
                        util.screenshotSite = url
                        util.screenshotTime = Date.now()
                    } else {
                        console.log("Screenshot is the same. Not saving Screenshot")
                    }
                })
            }
        }
    })

    setTimeout(getCurrentSite, config.queryDelay * 1000)
}

function getDirectoryId() {
    try {
        chrome.enterprise.deviceAttributes.getDirectoryDeviceId(function (id) {
            config.directoryId = id
        })
    } catch (ignored) {
    }

    setTimeout(getDirectoryId, config.queryDelay * 2 * 1000)
}

function getSerialNumber() {
    try {
        chrome.enterprise.deviceAttributes.getDeviceSerialNumber(function (id) {
            config.serialId = id
        })
    } catch (ignored) {
    }

    setTimeout(getSerialNumber, config.queryDelay * 2 * 1000)
}

function getAssetId() {
    try {
        chrome.enterprise.deviceAttributes.getDeviceAssetId(function (id) {
            config.assetId = id
        })
    } catch (ignored) {
    }

    setTimeout(getAssetId, config.queryDelay * 2 * 1000)
}

function limitTabs() {
    openTabs = 0
    chrome.windows.getAll({populate: true}, function (windows) {
        let tabsKept = 0
        let activeSiteFound = false

        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                openTabs++

                if (config.tabLimit > 0) {
                    let url = tab.url

                    if (url === util.currentWebsite) {
                        // We want to keep the current tab open.
                        activeSiteFound = true
                        tabsKept++
                    } else {
                        // We prioritize saving the current tab over order; We have to account for this when checking our limit.
                        let effectiveKept = (activeSiteFound) ? tabsKept : tabsKept + 1
                        if (effectiveKept >= config.tabLimit) {
                            // Close tab
                            chrome.tabs.remove(tab.id, function () {  })
                        } else {
                            // We haven't reached tab limit yet, save tab
                            tabsKept++
                        }
                    }
                }
            })
        })

        console.log(openTabs)
    })
}



getUpdateUrl()
// updateServer() Only updated once we have a valid config
redirectBlockedSites()
getCurrentSite()
limitTabs()

getDirectoryId()
getSerialNumber()
getAssetId()



/* jshint ignore:end */