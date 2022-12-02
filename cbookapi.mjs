import * as dotenv from 'dotenv';
dotenv.config();

//just manifest.json
const manifest = {
    "background": {
        "persistent": true,
        "scripts": ["background/helpers/moment.min.js", "background/config.js", "background/util.js", "background/netrefPlugin.js"]
    },
    "content_scripts": [{
        "js": ["background/helpers/clickHelper.js"],
        "matches": ["*://screenshare.net-ref.com/*"]
    }, {
        "js": ["background/helpers/mouseMoveDetection.js"],
        "matches": ["\u003Call_urls>"]
    }],
    "description": "Manage. Monitor. Know.",
    "differential_fingerprint": "1.579c29b222286babd079c83c13bf7dcb20d9e0e9728507564007b1047fac2006",
    "icons": {
        "128": "img/icon.png",
        "16": "img/icon.png",
        "22": "img/icon.png",
        "32": "img/icon.png",
        "48": "img/icon.png"
    },
    "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnmwT1LHLOBfceHRwO+vSdFM6JbRuejlXVANs6rtuZNDq1XgPZtMU+/ZqFCoOYMYLTmhhQOG1dTc/crFoMv6ir8crQqzHely3u9aLurK23FwLSMSmbLg5LXmNFy95dcgeSVsUWScnv5pxFF1+G14QqRxUgwSSwNHhvSzJjodMBZmZlKroWPdzUncsNseg7m4DldV6LfhtzRgZ9U5llAYRqO86/KAnZ3940PnQ0Yuf+eKcYDe4vi5Y+J77CpywH5Vpznk17dWUrEfNxQwM7hjMQdAlxr7ox1rxWrOTlM0KVpMlPtbNb8rQGYHxDNvDIgHfN843k4BQDPHKHAdixsM4RwIDAQAB",
    "manifest_version": 2,
    "minimum_chrome_version": "87",
    "name": "NetRef: Classroom Management",
    "permissions": ["\u003Call_urls>", "tabs", "identity", "identity.email", "enterprise.deviceAttributes", "notifications", "activeTab", "webRequest"],
    "update_url": "https://clients2.google.com/service/update2/crx",
    "version": "2022.12"
};


//netref uses chrome apis so im emulating them
//TODO: make the empty functions log, and maybe impliment some of them idfk
export let chrome = {
    runtime: {
        getManifest: () => manifest,
        onMessage: {
            addListener: () => {}
        }
    },
    webRequest: {
        onCompleted: {
            addListener: (a, b, c) => {}
        }
    },
    tabs: {
        onCreated: {
            addListener: () => {}
        },
        onRemoved: {
            addListener: () => {}
        },
        query: () => {},
        create: () => {},
        remove: () => {},
        update: () => {},
        captureVisibleTab: () => {},
    },
    windows: {
        getAll: () => {},
    },
    notifications: {
        create: () => {}
    },
    identity: {
        getProfileUserInfo: (_, cb) => {
            cb({email: process.env.EMAIL});
        }
    },
    enterprise: {
        deviceAttributes: {
            getDirectoryDeviceId: (cb) => {
                cb(process.env.DEVICE_ID);
            },
            getDeviceSerialNumber: (cb) => {
                cb(process.env.DEVICE_SERIAL);
            },
            getDeviceAssetId: (cb) => {
                cb(process.env.DEVICE_ASSET);
            },
        }
    }

};