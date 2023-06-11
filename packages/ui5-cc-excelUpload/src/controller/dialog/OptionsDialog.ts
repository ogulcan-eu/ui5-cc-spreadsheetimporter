import Log from "sap/base/Log";
import Dialog from "sap/m/Dialog";
import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import ExcelUpload from "../ExcelUpload";

export default class OptionsDialog {
    excelUploadController: ExcelUpload;
    optionsDialog: Dialog;

	constructor(excelUploadController: any) {
		this.excelUploadController = excelUploadController;
	}

    async openOptionsDialog() {
		this.excelUploadController.excelUploadDialogHandler.getDialog().setBusy(true)
		const optionsModel = new JSONModel({
			strict: this.excelUploadController.component.getStrict(),
			fieldMatchType: this.excelUploadController.component.getFieldMatchType(),
			decimalSeparator: this.excelUploadController.component.getDecimalSeparator(),
		});
		Log.debug("openOptionsDialog",undefined,"ExcelUpload: Options",() => this.excelUploadController.component.logger.returnObject({
			strict: this.excelUploadController.component.getStrict(),
			fieldMatchType: this.excelUploadController.component.getFieldMatchType(),
			decimalSeparator: this.excelUploadController.component.getDecimalSeparator()
		}))
		if (!this.optionsDialog) {
			this.optionsDialog = (await Fragment.load({
				name: "cc.excelUpload.XXXnamespaceXXX.fragment.OptionsDialog",
				type: "XML",
				controller: this,
			})) as Dialog;
            this.optionsDialog.setModel(this.excelUploadController.componentI18n, "i18n");
		}
		this.optionsDialog.setModel(optionsModel, "options");
		this.optionsDialog.open();
		this.excelUploadController.excelUploadDialogHandler.getDialog().setBusy(false)
	}


    onSave() {
        this.excelUploadController.component.setFieldMatchType((this.optionsDialog.getModel("options") as JSONModel).getProperty("/fieldMatchType"));
        this.excelUploadController.component.setStrict((this.optionsDialog.getModel("options") as JSONModel).getProperty("/strict"));
        this.excelUploadController.component.setDecimalSeparator((this.optionsDialog.getModel("options") as JSONModel).getProperty("/decimalSeparator"));
        this.optionsDialog.close();
    }

    onCancel() {
        this.optionsDialog.close();
    }
}