const FEV2ND = require("../Objects/FEV2ND");
const Base = require("./../Objects/Base");
const FEV2 = require("./../Objects/FEV2");
const FEV4 = require("./../Objects/FEV4");
const { optionsLong, optionsShort } = require("./../Objects/types");

let FE = undefined;
let BaseClass = undefined;
let skipSave = false;

describe("Upload File Object Page", () => {
	before(async () => {
		BaseClass = new Base();
		const scenario = global.scenario;
		if (scenario.startsWith("ordersv2")) {
			FE = new FEV2();
		}
		if (scenario.startsWith("ordersv4")) {
			FE = new FEV4();
		}
		if (scenario.startsWith("ordersv2fenondraft")) {
			FE = new FEV2ND();
			skipSave = true;
		}
	});
	it("should trigger search on ListReport page", async () => {
		try {
			await BaseClass.pressById(FE.listReportGoButton);
		} catch (error) {
			await BaseClass.pressById(FE.listReportDynamicPageTitle);
			await BaseClass.dummyWait(500);
			await BaseClass.pressById(FE.listReportGoButton);
		}
	});

	it("go to object page", async () => {
		const hash = await FE.getRoutingHash(FE.listReportTable, FE.navToObjectPageAttribute, "201");
		await browser.goTo({ sHash: hash });
		// force wait to stabelize tests
		await BaseClass.dummyWait(1000);
	});

	it("go to edit mode", async () => {
		await BaseClass.pressById(FE.objectPageEditButton);
	});

	it("Open Spreadsheet Upload Dialog", async () => {
		await BaseClass.dummyWait(500);
		await BaseClass.pressById(FE.objectPageSpreadsheetuploadButton);
		const spreadsheetUploadDialog = await browser.asControl({
			selector: {
				controlType: "sap.m.Dialog",
				properties: {
					contentWidth: "40vw"
				},
				searchOpenDialogs: true
			}
		});
		expect(spreadsheetUploadDialog.isOpen()).toBeTruthy();
		spreadsheetUploadDialog.setDecimalSeparator(",");
		try {
			browser.execute(function () {
				const blockLayerPopup = document.getElementById("sap-ui-blocklayer-popup");
				if (blockLayerPopup) {
					blockLayerPopup.remove();
				}
			});
		} catch (error) {
			console.log("sap-ui-blocklayer-popup removed");
		}
	});

	it("Upload file", async () => {
		const uploader = await browser.asControl({
			forceSelect: true,

			selector: {
				interaction: "root",
				controlType: "sap.ui.unified.FileUploader",
				id: "__uploader0"
			}
		});
		const fileName = "test/testFiles/TwoRowsNoErrorsNumberFormatsDecimalComma.xlsx"; // relative to wdio.conf.(j|t)s
		const remoteFilePath = await browser.uploadFile(fileName); // this also works in CI senarios!
		// transition from wdi5 api -> wdio api
		const $uploader = await uploader.getWebElement(); // wdi5
		const $fileInput = await $uploader.$("input[type=file]"); // wdio
		await $fileInput.setValue(remoteFilePath); // wdio
		await browser
			.asControl({
				selector: {
					controlType: "sap.m.Button",
					properties: {
						text: "Upload"
					}
				}
			})
			.press();
	});

	it("execute save", async () => {
		if (!skipSave) {
			await BaseClass.pressById(FE.objectPageSaveButton);
		}
	});

	it("entry created and activated", async () => {
		const pricesExpect = ["1000", "1001"];
		const prices = [];
		const items = await FE.getTableItems(FE.objectPageOrderItems);
		for (let index = 0; index < items.length; index++) {
			const element = items[index];
			const item = await BaseClass.getControlById(element.id);
			const binding = await item.exec(() => this.getBindingContext());
			const object = await binding.getObject();
			prices.push(object.price.toString());
		}

		// Sort both arrays
		const sortedPricesExpect = pricesExpect.sort();
		const sortedPrices = prices.sort();

		// Compare the sorted arrays
		expect(sortedPricesExpect).toEqual(sortedPrices);
	});
});
