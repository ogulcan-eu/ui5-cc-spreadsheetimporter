const { escape } = require("querystring");
const util = require("./../../dev/util");
let scenario = "";
let version = 0;

for (let index = 0; index < process.argv.length; index++) {
	const arg = process.argv[index];
	if (arg.startsWith("orders")) {
		scenario = arg;
		version = process.argv[index + 1];
	}
}

const testappObject = util.getTestappObject(scenario, version);
const specs = testappObject["testMapping"]["specs"];
const port = testappObject.port;
let baseUrl;
if (scenario !== "ordersv4fecds") {
	baseUrl = `http://localhost:${port}/index.html?sap-language=EN`;
} else {
	baseUrl = "http://localhost:4004/ui.v4.ordersv4fecds/index.html";
}
global.scenario = scenario;

module.exports.config = {
	wdi5: {
		logLevel: "error",
		waitForUI5Timeout: 180000
	},
	specs: specs,
	exclude: [
		// 'path/to/excluded/files'
	],
	maxInstances: 10,
	//
	capabilities: [
		{
			maxInstances: 5,
			//
			browserName: "chrome",
			"goog:chromeOptions": {
				args:
					process.argv.indexOf("--headless") > -1
						? ["--headless=new", "--window-size=1920,1080"]
						: process.argv.indexOf("--debug") > -1
						? ["--window-size=1920,1080", "--auto-open-devtools-for-tabs"]
						: ["--window-size=1920,1080"]
			},
			acceptInsecureCerts: true
		}
	],
	logLevel: "error",
	bail: 0,
	baseUrl: baseUrl,
	waitforTimeout: 60000,
	connectionRetryTimeout: process.argv.indexOf("--debug") > -1 ? 1200000 : 120000,
	connectionRetryCount: 3,
	services: ["chromedriver", "ui5"],
	framework: "mocha",
	reporters: ["spec"],
	mochaOpts: {
		ui: "bdd",
		timeout: process.argv.indexOf("--debug") > -1 ? 600000 : 600000
	}
};
