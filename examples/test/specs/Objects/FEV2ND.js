const Base = require("./Base");
const FE = require("./FE");

class FEV2ND {
	constructor() {
		this.BaseClass = new Base();
		this.rootId = "ui.v2.ordersv2fenondraft::sap.suite.ui.generic.template.";
		this.listReportId = this.rootId + "ListReport.view.ListReport::OrdersND--";
		this.objectPageId = this.rootId + "ObjectPage.view.Details::OrdersND--";
		this.listReportGoButton = this.listReportId + "listReportFilter-btnGo";
		this.listReportSpreadsheetuploadButton = this.listReportId + "spreadsheetUploadButtonListReport";
		this.listReportDynamicPageTitle = this.listReportId + "template:::ListReportPage:::DynamicPageTitle";
		this.listReportTable = this.listReportId + "responsiveTable";
		this.objectPageEditButton = this.objectPageId + "edit";
		this.objectPageSpreadsheetuploadButton = this.objectPageId + "spreadsheetUploadButton";
		this.objectPageSaveButton = this.objectPageId + "activate";
		this.objectPageOrderItems = this.objectPageId + "Items::com.sap.vocabularies.UI.v1.LineItem::responsiveTable";
		this.listReportUploadFilename = "test/testFiles/ListReportOrdersNoErros.xlsx";
		// nav to sub object page
		this.navToObjectPageAttribute = "OrderNo";
		this.navToObjectPageValue = "2";
		// nav to sub object page
		this.navToSubObjectPageAttribute = "product_ID";
		this.navToSubObjectPageValue = "254";
		// check file upload list report
		this.checkFileuploadListreportAttribute = "OrderNo";
		this.checkFileuploadListreportValue = "4";

		this.overflowButton = "__toolbar2-overflowButton";
	}
	async getFieldValue(fieldName) {
		const field = await $(
			`//*[@id="ui.v2.ordersv2fenondraft::sap.suite.ui.generic.template.ObjectPage.view.Details::OrderItemsND--com.sap.vocabularies.UI.v1.Identification::${fieldName}::Field-text"]`
		);
		let value = await field.getText();
		return value;
	}

	async getRoutingHash(tableId, objectAttribute, objectValue, rootPathBool) {
		const table = await this.BaseClass.getControlById(tableId);
		const items = await table.exec(() => this.getItems());
		const rootBinding = await table.exec(() => this.getBindingContext());
		let rootPath = "";
		if (rootPathBool) {
			rootPath = await rootBinding.getPath();
		}
		for (let index = 0; index < items.length; index++) {
			const element = items[index];
			const item = await this.BaseClass.getControlById(element.id);
			const binding = await item.exec(() => this.getBindingContext());
			const object = await binding.getObject();
			if (object[objectAttribute] === objectValue) {
				const path = binding.sPath;
				return `#${rootPath}${path}`;
			}
		}
	}

	async getTableItems(tableId) {
		const table = await this.BaseClass.getControlById(tableId);
		const metadata = await table.exec(() => this.getMetadata());
		const type = await metadata.getName();
		let items = undefined;
		if (type === "sap.m.Table") {
			items = await table.exec(() => this.getItems());
		} else {
			items = await table.exec(() => this.getRows());
		}
		return items;
	}

	async getTableObject(tableId, objectAttribute, objectValue) {
		const items = await this.getTableItems(tableId);
		for (let index = 0; index < items.length; index++) {
			const element = items[index];
			const item = await this.BaseClass.getControlById(element.id);
			const binding = await item.exec(() => this.getBindingContext());
			const object = await binding.getObject();
			if (object[objectAttribute] === objectValue) {
				return object;
			}
		}
	}

	async getDateFields(attribute, options) {
		const selector = {
			selector: {
				controlType: "sap.ui.comp.smartform.GroupElement",
				descendant: {
					controlType: "sap.ui.comp.smartfield.SmartLabel",
					properties: {
						text: attribute
					}
				}
			}
		};
		const formElement = await browser.asControl(selector);
		const fields = await formElement.getFields();
		const field = fields[0];
		const binding = await field.getBinding("text");
		const date = await binding.getValue();
		let formattedDate = await date.toLocaleString("en-US", options);
		let valueText = await field.getText();
		return { valueText: valueText, formattedDate: formattedDate };
	}

	getTimeValue(ms) {
		var date = new Date(ms);
		var hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
		var minutes = Math.floor(ms / (1000 * 60)) % 60;
		var seconds = Math.floor(ms / 1000) % 60;
		var ampm = hours >= 12 ? "PM" : "AM";
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? "0" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;
		return hours + ":" + minutes + ":" + seconds + " " + ampm;
	}
}
module.exports = FEV2ND;
