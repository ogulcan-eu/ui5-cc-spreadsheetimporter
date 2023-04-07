import ManagedObject from "sap/ui/base/ManagedObject";
import Fragment from "sap/ui/core/Fragment";
import MessageToast from "sap/m/MessageToast";
import * as XLSX from "xlsx";
import MetadataHandler from "./MetadataHandler";
import Component from "../Component";
import XMLView from "sap/ui/core/mvc/XMLView";
import { ListObject, ErrorMessage, ErrorTypes } from "../types";
import Dialog from "sap/m/Dialog";
import Event from "sap/ui/base/Event";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import OData from "./odata/OData";
import ODataV2 from "./odata/ODataV2";
import ODataV4 from "./odata/ODataV4";
import FileUploader from "sap/ui/unified/FileUploader";
import MessageBox from "sap/m/MessageBox";
import Button from "sap/m/Button";
import Util from "./Util";
import Parser from "./Parser";
import ErrorHandler from "./ErrorHandler";
/**
 * @namespace cc.excelUpload.XXXnamespaceXXX
 */
export default class ExcelUpload {
	public oDataEntityType: any;
	public component: Component;
	public context: any;
	private isODataV4: boolean;
	private isOpenUI5: boolean;
	private view: XMLView;
	private tableObject: any;
	private metadataHandler: MetadataHandler;
	private errorHandler: ErrorHandler;
	public util: Util;
	private model: any;
	private typeLabelList: ListObject;
	private dialog: Dialog;
	private componentI18n: ResourceModel;
	private UI5MinorVersion: number;
	private odataHandler: OData;
	private payload: any;
	private binding: any;
	private payloadArray: any[];
	private errorState: boolean;
	private errorMessage: string;
	private initialSetupPromise: Promise<void>;
	public errorArray: ErrorMessage[];

	constructor(component: Component, componentI18n: ResourceModel) {
		this.dialog = null;
		this.errorState = false;
		this.UI5MinorVersion = sap.ui.version.split(".")[1];
		this.component = component;
		this.componentI18n = componentI18n;
		this.util = new Util(componentI18n.getResourceBundle() as ResourceBundle);
		this.isODataV4 = this._checkIfODataIsV4();
		// check if "sap.ui.generic" is available, if false it is OpenUI5
		this.isOpenUI5 = sap.ui.generic ? false : true;
		this.odataHandler = this.getODataHandler(this.UI5MinorVersion);
		this.initialSetupPromise = this.initialSetup();
	}

	async initialSetup(): Promise<void> {
		if (!this.dialog) {
			this.dialog = (await Fragment.load({
				name: "cc.excelUpload.XXXnamespaceXXX.fragment.ExcelUpload",
				type: "XML",
				controller: this,
			})) as Dialog;
			this.dialog.setModel(this.componentI18n, "i18n");
		}
		this.metadataHandler = new MetadataHandler(this);
		this.errorHandler = new ErrorHandler(this);
		this.odataHandler.metaDatahandler = this.metadataHandler;
		try {
			await this.setContext();
			this.errorState = false;
		} catch (error) {
			this.errorMessage = error.message;
			this.errorState = true;
			console.error(error);
		}
	}

	async setContext() {
		this.context = this.component.getContext();
		if (this.context.base) {
			this.context = this.context.base;
		}

		this.view = this.odataHandler.getView(this.context);
		this.tableObject = this.odataHandler.getTableObject(this.component.getTableId(), this.view);
		this.component.setTableId(this.tableObject.getId());
		this.binding = this.odataHandler.getBinding(this.tableObject);
		if (!this.binding) {
			throw new Error(this.util.geti18nText("bindingError"));
		}
		const odataType = this.odataHandler.getOdataType(this.binding, this.tableObject, this.component.getOdataType());
		this.component.setOdataType(odataType);
		this.typeLabelList = await this.odataHandler.createLabelList(this.component.getColumns(), odataType, this.tableObject);

		this.model = this.tableObject.getModel();
		try {
			// Load the DraftController asynchronously using the loadDraftController function
			const DraftController: sap.ui.generic.app.transaction.DraftController = await this._loadDraftController();
			// Create an instance of the DraftController
			this.odataHandler.draftController = new DraftController(this.model, undefined);
		} catch (error) {}
	}

	getODataHandler(version: number): OData {
		if (this.isODataV4) {
			return new ODataV4(version);
		} else {
			return new ODataV2(version);
		}
	}

	async openExcelUploadDialog() {
		await this.initialSetupPromise;
		if (this.errorState) {
			await this.initialSetup();
		}
		if (!this.errorState) {
			(this.dialog.getContent()[0] as FileUploader).clear();
			this.dialog.open();
		} else {
			MessageBox.error(this.errorMessage);
			console.error("ErrorState: True. Can not open dialog.");
		}
	}

	async onFileUpload(event: Event) {
		try {
			this.errorHandler.setErrorResults([]);
			const file = event.getParameter("files")[0];

			const workbook = (await this._readWorkbook(file)) as XLSX.WorkBook;
			const sheetName = workbook.SheetNames[0];
			let excelSheetsData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
			let columnNames = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })[0];

			if (!excelSheetsData || excelSheetsData.length === 0) {
				throw new Error(this.util.geti18nText("emptySheet"));
			}

			//remove empty spaces before and after every value
			for (const object of excelSheetsData) {
				for (const key in object) {
					object[key] = typeof object[key] === "string" ? object[key].trim() : object[key];
				}
			}

			this.errorHandler.checkMandatoryFields(excelSheetsData, this.component.getMandatoryFields(), this.typeLabelList);
			this.errorHandler.checkColumnNames(columnNames, this.component.getFieldMatchType(), this.typeLabelList);
			this.component.fireCheckBeforeRead({ sheetData: excelSheetsData });

			this.payloadArray = [];
			this.payloadArray = Parser.parseExcelData(excelSheetsData, this.typeLabelList, this.component, this.errorHandler, this.util);

			if (this.errorHandler.areErrorsPresent()) {
				// show error dialog
				this.errorHandler.displayErrors();
				// reset file uploader
				var fileUploader = this.dialog.getContent()[0] as FileUploader;
				fileUploader.setValue();
				return;
			}
		} catch (error) {
			// show other errors
			console.error(error);
			MessageToast.show(error.message);
		}
	}

	onCloseDialog() {
		this.dialog.close();
	}

	/**
	 * Sending extracted data to backend
	 * @param {*} event
	 */
	async onUploadSet(event: Event) {
		// checking if excel file contains data or not
		if (!this.payloadArray.length) {
			MessageToast.show(this.util.geti18nText("selectFileUpload"));
			return;
		}

		var that = this;
		const source = event.getSource() as Button;
		const sourceParent = source.getParent() as Dialog;

		sourceParent.setBusyIndicatorDelay(0);
		sourceParent.setBusy(true);
		await Util.sleep(50);

		// creating a promise as the extension api accepts odata call in form of promise only
		var fnAddMessage = function () {
			return new Promise((fnResolve, fnReject) => {
				that.callOdata(fnResolve, fnReject);
			});
		};

		var mParameters = {
			busy: {
				set: true,
				check: false,
			},
			dataloss: {
				popup: true,
				navigation: false,
			},
			sActionLabel: this.util.geti18nText("uploadingFile"),
		};
		// calling the oData service using extension api
		if (this.isODataV4) {
			await this.context.editFlow.securedExecution(fnAddMessage, mParameters);
		} else {
			if (this.context.extensionAPI) {
				try {
					await this.context.extensionAPI.securedExecution(fnAddMessage, mParameters);
				} catch (error) {
					console.error(error);
				}
			} else {
				await fnAddMessage();
			}
		}

		sourceParent.setBusy(false);
		this.onCloseDialog();
	}

	/**
	 * helper method to call OData
	 * @param {*} fnResolve
	 * @param {*} fnReject
	 */
	async callOdata(fnResolve: any, fnReject: any) {
		// intializing the message manager for displaying the odata response messages
		try {
			// get binding of table to create rows
			const model = this.tableObject.getModel();

			// Slice the array into chunks of 'batchSize' if necessary
			const slicedPayloadArray = this.odataHandler.processPayloadArray(this.component.getBatchSize(), this.payloadArray);

			// Loop over the sliced array
			for (const batch of slicedPayloadArray) {
				// loop over data from excel file
				for (const payload of batch) {
					this.payload = payload;
					// Extension method to manipulate payload
					this.component.fireChangeBeforeCreate({ payload: this.payload });
					this.odataHandler.createAsync(model, this.binding, this.payload);
				}
				// wait for all drafts to be created
				await this.odataHandler.waitForCreation(model);

				// check for and activate all drafts and wait for all draft to be created
				if (this.component.getActivateDraft()) {
					await this.odataHandler.waitForDraft();
				}

				this.odataHandler.resetContexts();
			}
			try {
				this.binding.refresh();
			} catch (error) {
				console.debug(error);
			}
			fnResolve();
		} catch (error) {
			console.log(error);
			fnReject();
		}
	}

	/**
	 * Create Excel Template File with specific columns
	 */
	onTempDownload() {
		// create excel column list
		let fieldMatchType = this.component.getFieldMatchType();
		var excelColumnList = [{}];
		for (let [key, value] of Object.entries(this.typeLabelList)) {
			if (fieldMatchType === "label") {
				excelColumnList[0][value.label] = "";
			}
			if (fieldMatchType === "labelTypeBrackets") {
				excelColumnList[0][`${value.label}[${key}]`] = "";
			}
		}

		// initialising the excel work sheet
		const ws = XLSX.utils.json_to_sheet(excelColumnList);
		// creating the new excel work book
		const wb = XLSX.utils.book_new();
		// set the file value
		XLSX.utils.book_append_sheet(wb, ws, "Tabelle1");
		// download the created excel file
		XLSX.writeFile(wb, this.component.getExcelFileName());

		MessageToast.show(this.util.geti18nText("downloadingTemplate"));
	}

	_checkIfODataIsV4() {
		try {
			if (this.component.getContext().getModel().getODataVersion() === "4.0") {
				return true;
			}
		} catch (error) {
			return false;
		}
	}

	_setPayload(payload) {
		this.payload = payload;
	}

	async buffer_RS(stream: ReadableStream) {
		/* collect data */
		const buffers = [];
		const reader = stream.getReader();
		for (;;) {
			const res = await reader.read();
			if (res.value) buffers.push(res.value);
			if (res.done) break;
		}

		/* concat */
		const out = new Uint8Array(buffers.reduce((acc, v) => acc + v.length, 0));

		let off = 0;
		for (const u8 of buffers) {
			out.set(u8, off);
			off += u8.length;
		}

		return out;
	}

	/**
	 * Read the uploaded workbook from the file.
	 * @param {File} file - The uploaded file.
	 * @returns {Promise} - Promise object representing the workbook.
	 */
	async _readWorkbook(file: Blob) {
		return new Promise(async (resolve, reject) => {
			try {
				const data = await this.buffer_RS(file.stream());
				let workbook = XLSX.read(data);
				resolve(workbook);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Dynamically loads the `sap.ui.generic.app.transaction.DraftController` module.
	 *
	 * @returns {Promise<sap.ui.generic.app.transaction.DraftController>} A Promise that resolves to an instance of the `DraftController` class.
	 * @throws {Error} If the `DraftController` module cannot be loaded.
	 */
	async _loadDraftController() {
		return new Promise(function (resolve, reject) {
			sap.ui.require(
				["sap/ui/generic/app/transaction/DraftController"],
				function (DraftController) {
					resolve(DraftController);
				},
				function (err) {
					reject(err);
				}
			);
		});
	}

	getErrorResults() {
		return this.errorHandler.getErrorResults();
	}

	addToErrorsResults(errorArray: ErrorMessage[]) {
		errorArray.forEach((error) => {
			if (error.group) {
				error.type = ErrorTypes.CustomErrorGroup;
			} else {
				error.type = ErrorTypes.CustomError;
			}
			error.counter = 1;
		});
		this.errorHandler.addToErrorsResults(errorArray);
	}
}