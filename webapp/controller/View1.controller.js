/* global XLSX true */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/chevron/fm/ZFMEIA/utils/xlsx",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/BusyIndicator"
], function (Controller, xlsx, Filter, FilterOperator, JSONModel, exportLibrary, Spreadsheet, BusyIndicator) {
	"use strict";

	return Controller.extend("com.chevron.fm.ZFMEIA.controller.View1", {
		onSearchData: function (oEvent) {
			var sQuery = oEvent.getParameter("Query");
			if (!sQuery) {
				return;
			}
			var aColumns = ["salesOrg", "distrChannel", "division", "shipTo", "supplPlant", "condCurr", "validFrom", "validTo", "Distance",
				"amount", "Distanceunit", "EiaRegionDesc", "WeeklyPrice"
			];
			var aFilters = [];
			aColumns.forEach(function(oCol){
				aFilters.push(new Filter(oCol,FilterOperator.Contains,sQuery));
			}.bind(this));
			var oFilter = new Filter({filters:aFilters,and:false});
			this.getView().byId("resultTable").getBinding("rows").filter(oFilter);
		},
		onInit: function () {
			var oModel = new JSONModel({
				"results": []
			});
			this.getView().setModel(oModel, "oDataModel");
			this.getView().getModel("excelData").setData({
				"NAV_HEADER_TO_PRINT": {
					"results": []
				},
				"fromDate": "",
				"toDate": "",
				"division": "",
				"region": ""
			});

			// this._downloadData();
		},
		onPressSave: function () {
			var aSelectedItems = this.getView().byId("weeklyTable").getSelectedContexts();
			if (!aSelectedItems) {
				return;
			}
			if (aSelectedItems && aSelectedItems.length === 0) {
				sap.m.MessageBox.error("Please select atleast one record to proceed");
				return;
			}
			var bFound = aSelectedItems.find(function (oItm) {
				var oItem = oItm.getObject();
				return oItem.Reviewstatus === "Yet to Review";
			}.bind(this));
			if (!bFound) {
				sap.m.MessageBox.information("All the selected items are already Reviewed");
				return;
			};
			var aResults = [];
			var aProperties = ["EiaRegio", "WeekPrice", "Surcharge"];
			aSelectedItems.forEach(function (oItm) {
				var oItem = oItm.getObject();
				var oResult = {};
				aProperties.forEach(function (oProperty) {
					oResult[oProperty] = oItem[oProperty];
				}.bind(this));
				if (oItem.Reviewstatus === "Yet to Review") {
					oResult.Updateflag = "X";
					// var sDate = oItem.WeekStartDate;
					// sDate.split[1]
					oResult.FromDate = oItem.WeekStartDate;
					oResult.ToDate = oItem.WeekEndDate;
					aResults.push(oResult);
				}
			}.bind(this));
			var oPayLoad = {

				"WeeklyPriceUpload": {
					"results": aResults
				},
				"WeeklyPriceUploadMsgs": {
					"results": [

					]
				}
			};
			var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			sFromDate = new Date(sFromDate);
			sFromDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyyMMdd"
			}).format(sFromDate);
			oPayLoad.WeekStartDate = sFromDate;
			var sToDate = this.getView().getModel("excelData").getProperty("/toDate");
			sToDate = new Date(sToDate);
			sToDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyyMMdd"
			}).format(sToDate);
			oPayLoad.WeekEndDate = sToDate;
			// this.getView().setBusy(true);
			sap.ui.core.BusyIndicator.show();
			this.getOwnerComponent().getModel().create("/weeklyPricesEIAHdrSet", oPayLoad, {
				success: function (oData, oResponse) {
					// this.getView().setBusy(false);

					this.onPressContinue();
					sap.ui.core.BusyIndicator.hide();
					// this.getView().byId("weeklyTable").clearSelection();
					this.getView().byId("weeklyTable").removeSelections();
					var oResponseData = oData.WeeklyPriceUploadMsgs.results[0];

					if (oResponseData.FunctionalErrorIdentifier === "S") {
						sap.m.MessageBox.success("Records have been successfully uploaded");
						return;
					} else if (oResponseData.FunctionalErrorIdentifier === "W") {
						sap.m.MessageBox.information("Not all items were successfully uploaded to ZFSC table");
						return;
					} else {
						sap.m.MessageBox.information("Failed to upload the data");
					};
					// sap.m.MessageBox.success("Records have been successfully uploaded");

					this.getView().byId("weeklyTable").getBinding("items").refresh(true);
				}.bind(this),
				error: function (oError) {
					this.getView().setBusy(false);
					sap.ui.core.BusyIndicator.hide();
					sap.m.MessageBox.error("Failed to load the service. Please contact your administrator");
				}.bind(this)
			});
		},

		handleTabChange: function () {
			var s = this.getView().byId("idIconTabBarInlineMode").getSelectedKey();
			if (s === "weekly") {
				// this._showWeeklyData();
				this.getView().byId("continue").setVisible(true);
				this.getView().byId("show").setVisible(false);
				this.getView().byId("uploadButton").setVisible(true);
				this.getView().byId("condTypeBox").setVisible(false);

			} else if (s === "upload") {
				this.getView().byId("show").setVisible(true);
				this.getView().byId("continue").setVisible(false);
				this.getView().byId("uploadButton").setVisible(false);
				this.getView().byId("weeklyTable").removeSelections();
				this.getView().byId("condTypeBox").setVisible(true);
				// this._downloadData();

			};
			//	this.getView().byId("datRange").setValue("");
			//	this.getView().byId("datRange1").setValue("");
			//	this.getView().getModel("oDataModel").setProperty("/results", []);
			// this._downloadData();
		},

		// commented on 01/11/2022 -start
		// handleUpload: function () {
		// 	var oSelectedFile = this.getView().byId("fileUploader").FUEl.files[0];
		// 	if (oSelectedFile) {
		// 		var fileReader = new FileReader();
		// 		fileReader.onload = function (event) {
		// 			var data = event.target.result;
		// 			var jsonOpts = {
		// 				header: 1,
		// 				defval: '',
		// 				blankrows: true,
		// 				raw: false,
		// 				dateNF: 'd"/"m"/"yyyy' // <--- need dateNF in sheet_to_json options (note the escape chars)
		// 			};
		// 			var workbook = XLSX.read(data, {
		// 				type: "binary"
		// 			});
		// 			//	workbook.SheetNames.forEach(function(sheet){
		// 			var rowObject = XLSX.utils.sheet_to_row_object_array(
		// 				workbook.Sheets["Sheet1"], jsonOpts);
		// 			// remove 2 items
		// 			rowObject.shift();
		// 			rowObject.shift();
		// 			rowObject.shift();
		// 			rowObject.shift();
		// 			rowObject.shift();
		// 			this._processRowData(rowObject);
		// 			//this.getView().getModel("excelData").setProperty("/NAV_HEADER_TO_PRINT/results",rowObject);
		// 			this._uploadData();
		// 			//	}.bind(this));
		// 		}.bind(this);
		// 		fileReader.readAsBinaryString(oSelectedFile);
		// 	}
		// },

		// _processRowData: function (rowObject) {

		// 	var aData = [];

		// 	// rowObject.forEach(function (oRow) {
		// 	// 	var oTemplate = this._getPostJSONTemplate();
		// 	// 	var sFromDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 	// 		pattern: "yyyyMMdd"
		// 	// 	}).format(new Date(oRow[0]));
		// 	// 	var oToDate = new Date(new Date(rowObject[1][0]).getTime() + 5 * 24 * 60 * 60 * 1000);
		// 	// 	var SToDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 	// 		pattern: "yyyyMMdd"
		// 	// 	}).format(oToDate);

		// 	// 	oTemplate.weekPrice = oRow[1];
		// 	// 	oTemplate.validFrom = sFromDate;
		// 	// 	oTemplate.validTo = SToDate;
		// 	// 	aData.push(oTemplate);
		// 	// }.bind(this));
		// 	rowObject.forEach(function (oRow) {
		// 						var oTemplate = this._getPostJSONTemplate();
		// 						if(new Date(oRow[0])){
		// 						var sFromDate = new Date(oRow[0]);
		// 						var oToDate = new Date(new Date(rowObject[1][0]).getTime() + 4 * 24 * 60 * 60 * 1000);
		// 						var SToDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 							pattern: "yyyyMMdd"
		// 						}).format(oToDate);
		//                             // monday to friday logic
		//                             var oSDate = null;
		//                             	if (sFromDate.getDay() === 0) {
		// 						oSDate = new Date(sFromDate.getTime() + 24 * 60 * 60 * 1000);
		// 					} else if (sFromDate.getDay() === 1) {
		// 						oSDate = new Date(sFromDate.getTime());
		// 					} else {
		// 						var iCalc = sFromDate.getDay() - 1;
		// 						oSDate = new Date(sFromDate.getTime() - (iCalc * 24 * 60 * 60 * 1000));
		// 					}
		// 					var sToDate = new Date(new Date(oSDate).getTime() + (4 * 24 * 60 * 60 * 1000));
		// 					var sFrmDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 						pattern: "yyyyMMdd"
		// 					}).format(oSDate);
		// 					var sTDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 						pattern: "yyyyMMdd"
		// 					}).format(sToDate);
		// 					oTemplate.validFrom = sFrmDate;
		// 						oTemplate.validTo = sTDate;
		// 						}else{
		// 							oTemplate.validFrom = '99991231';
		// 						oTemplate.validTo = '99991231';
		// 						}
		// 						oTemplate.weekPrice = oRow[1];

		// 						aData.push(oTemplate);
		// 					}.bind(this));
		// 	this.getView().getModel("excelData").setProperty("/NAV_HEADER_TO_PRINT/results", aData);
		// },

		// _getPostJSONTemplate: function () {
		// 	var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
		// 	sFromDate = sFromDate.split("-").join("");
		// 	// var sToDate = this.getView().getModel("excelData").getProperty("/toDate");
		// 	// sToDate = sToDate.split("-").join("");

		// 	return {
		// 		"fuelDate": sFromDate,
		// 		"weekPrice": "",
		// 		"salesOrg": "",
		// 		"distrChannel": "",
		// 		"division": "",
		// 		"shipTo": "",
		// 		"supplPlant": "",
		// 		"condType": "",
		// 		// "amount":0,
		// 		"condCurr": "",
		// 		// "pricingUnit":"",
		// 		"unitOfMeasure": "",
		// 		"validFrom": sFromDate,
		// 		"validTo": ""

		// 	};
		// },

		// _uploadData: function () {
		// 	var oSelectedRadio = this.getView().byId("selectedRadio").getSelectedButton();
		// 	var sRegion = oSelectedRadio ? oSelectedRadio.getText() : "";
		// 	this.getView().getModel("excelData").setProperty("/region", sRegion);

		// 	// changes 23.09
		// 	var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
		// 	var oFDate = new Date(sFromDate);
		// 	var oSDate = null;

		// 	if (oFDate.getDay() === 0) {
		// 		oSDate = new Date(oFDate.getTime() + 24 * 60 * 60 * 1000);
		// 	} else if (oFDate.getDay() === 1) {
		// 		oSDate = new Date(oFDate.getTime());
		// 	} else {
		// 		var iCalc = oFDate.getDay() - 1;
		// 		oSDate = new Date(oFDate.getTime() - (iCalc * 24 * 60 * 60 * 1000));
		// 	}
		// 	var sToDate = new Date(new Date(oSDate).getTime() + (4 * 24 * 60 * 60 * 1000));
		// 	var sFrmDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 		pattern: "yyyyMMdd"
		// 	}).format(oSDate);
		// 	var sTDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
		// 		pattern: "yyyyMMdd"
		// 	}).format(sToDate);
		// 	var oExcelModel = this.getView().getModel("excelData");
		// 	var oPayload = {
		// 		"fromDate": sFrmDate,
		// 		"toDate": sTDate,
		// 		"division": oExcelModel.getProperty("/division"),
		// 		"region": oExcelModel.getProperty("/region"),
		// 		"NAV_HEADER_TO_PRINT": oExcelModel.getProperty("/NAV_HEADER_TO_PRINT")
		// 	};

		// 	var oView = this.getView();
		// 	oView.setBusy(true);
		// 	var oModel = this.getView().getModel();
		// 	oModel.create("/FUEL_SURCHRG_HEADERSet", oPayload, {
		// 		success: function (aData, oResponse) {
		// 			this._downloadData();
		// 			oView.setBusy(false);
		// 		}.bind(this),
		// 		error: function (oError) {

		// 		}.bind(this)
		// 	});
		// 	//end change 23.09

		// },

		// downloadWeekly: function (oEvent) {

		// 	var sText = oEvent.getSource().getSelectedButton().getText();
		// 	var aConfig = [{
		// 			text: "California",
		// 			"url": "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2DXL0_PTE_SCA_DPG&f=M"
		// 		}, {
		// 			text: "PADD 3 Gulf Coast",
		// 			url: "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=pet&s=emd_epd2dxl0_pte_r30_dpg&f=m"
		// 		},

		// 		{
		// 			text: "PADD 5 Except CA",
		// 			"url": "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2DXL0_PTE_R5XCA_DPG&f=M"
		// 		}, {
		// 			text: "PADD 1C Lower Atlantic",
		// 			"url": "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2DXL0_PTE_R1Z_DPG&f=M"
		// 		}, {
		// 			text: "PADD 4 Rocky Mountain",
		// 			"url": "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=pet&s=emd_epd2dxl0_pte_r40_dpg&f=m"
		// 		}
		// 	];
		// 	var oConfig = aConfig.find(function (oConfig) {
		// 		return oConfig.text === sText;
		// 	}.bind(this));
		// 	window.open(oConfig.url);
		// },
		// commented on 01/11/2022 - end
		_downloadData: function () {
			this.getView().byId("datRange").setValueState("None");
			this.getView().byId("datRange1").setValueState("None");
			var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			var oFDate = new Date(sFromDate);
			// var oSDate = null;

			// if (oFDate.getDay() === 0) {
			// 	oSDate = new Date(oFDate.getTime() + 24 * 60 * 60 * 1000);
			// } else if (oFDate.getDay() === 1) {
			// 	oSDate = new Date(oFDate.getTime());
			// } else {
			// 	var iCalc = oFDate.getDay() - 1;
			// 	oSDate = new Date(oFDate.getTime() - (iCalc * 24 * 60 * 60 * 1000));
			// }
			// var sToDate = new Date(new Date(oSDate).getTime() + (6 * 24 * 60 * 60 * 1000));

			var sToDate = this.getView().getModel("excelData").getProperty("/toDate");

			if (!sFromDate) {
				this.getView().byId("datRange").setValueState("Error");
				this.getView().byId("datRange").setValueStateText("Please select Weekly Start Date");
				return;
			}
			if (!sToDate) {

				this.getView().byId("datRange1").setValueState("Error");
				this.getView().byId("datRange1").setValueStateText("Please select Weekly End Date");
				return;
			}
			var sFrmDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd-MM-yyyy"
			}).format(oFDate);
			var sTDate = new Date(sToDate);
			var sToDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd-MM-yyyy"
			}).format(sTDate);
			// var sCondType = this.getView().getModel("excelData").getProperty("/condType");

			// var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			// sFromDate = sFromDate.split("-").join("");
			// var sToDate = this.getView().getModel("excelData").getProperty("/toDate");
			// sToDate = sToDate.split("-").join("");
			var aFilters = [new Filter('fromDate', FilterOperator.EQ, sFrmDate), new Filter('toDate', FilterOperator.EQ, sToDate)];
			sap.ui.core.BusyIndicator.show();
			this.getOwnerComponent().getModel().read("/fuelSurchargeHeaderSet", {
				urlParameters: {
					$expand: "NAV_HEADER_TO_PRINT",
					$inlinecount: "allpages"
				},
				filters: aFilters,
				success: function (oData, oResponse) {
					sap.ui.core.BusyIndicator.hide();
					var oOutPut = oData.results[0].NAV_HEADER_TO_PRINT.results;
					if (oOutPut.length === 0) {
						sap.m.MessageBox.information("No Data found for the selected Date Range");
						return;
					}
					this.getView().getModel("oDataModel").setProperty("/results", oOutPut);
					this.getView().byId().setCount(oOutput.length);
				}.bind(this),
				error: function (oError) {
					sap.ui.core.BusyIndicator.hide();
					sap.m.MessageBox.error("Failed to load the service. Please contact your administrator");
				}.bind(this)
			});
			sap.ui.core.BusyIndicator.hide();
		},
		onDownloadResult: function () {
			var aData, aProperties, mSettings, oSheet, oTable;
			var aData = this.getView().getModel("oDataModel").getProperty("/results");
			var aProperties = [
				// 	{
				// 	label: "Fuel Date",
				// 	property: "fuelDate",
				// 	type: "date",
				// }, {
				// 	label: "Week Price",
				// 	property: "weekPrice"
				// }, 
				{
					label: "Sales Organization",
					property: "salesOrg"
				}, {
					label: "Distribution Channel",
					property: "distrChannel"
				}, {
					label: "Division",
					property: "division"
				}, {
					label: "Ship To",
					property: "shipTo"
				}, {
					label: "Supply Plant",
					property: "supplPlant"
				}, {
					label: "Condition Type",
					property: "condType"
				}, {
					label: "Condition Currency",
					property: "condCurr"
				}, {
					label: "Pricing Unit",
					property: "pricingUnit"
						// }, {
						// 	label: "Unit Of Measure",
						// 	property: "unitOfMeasure"
				}, {
					label: "Valid From",
					property: "validFrom"
				}, {
					label: "Valid To",
					property: "validTo"
				},

				{
					label: "Distance from Plant",
					property: "Distance"
				}, {
					label: "Surcharge",
					property: "Surcharge"
				}, {
					label: "Amount",
					property: "amount"
				},

				{
					label: "Unit Of Measure",
					property: "Distanceunit"
				}, {
					label: "EIA Region Description",
					property: "EiaRegionDesc"
				}, {
					label: "Weekly Price",
					property: "WeeklyPrice"
				}

			];
			var mSettings = {
				workbook: {
					columns: aProperties,
					context: {

						title: 'Data'
					},
					dataSource: aData,
					fileName: "Data.xlsx"
				}
			};
			// var oSpreadsheet = new sap.ui.export.Spreadsheet(mSettings);
			// oSpreadsheet.build();
			// // var oSpreadsheet = new sap.ui.export.Spreadsheet(mSettings);
			// 	// oSheet = new Spreadsheet(oSettings);
			// oSpreadsheet.build().finally(function() {
			// 	oSheet.destroy();
			// });

			if (!this._oTable) {
				this._oTable = this.byId('resultTable');
			}

			oTable = this._oTable;
			// oRowBinding = oTable.getBinding('items');
			// aCols = this.createColumnConfig();

			mSettings = {
				workbook: {
					columns: aProperties,
					hierarchyLevel: "Level"
				},
				dataSource: aData,
				fileName: "Weekly Data.xlsx",
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(mSettings);
			oSheet.build().finally(function () {
				oSheet.destoy();
			});

		},
		onExportWeeklyData: function () {
			var aData, aProperties, mSettings, oSheet, oTable;
			var aData = this.getView().getModel("oDataModel").getProperty("/results");
			var aProperties = [
				// 	{
				// 	label: "Fuel Date",
				// 	property: "fuelDate",
				// 	type: "date",
				// }, {
				// 	label: "Week Price",
				// 	property: "weekPrice"
				// }, 
				{
					label: "Week Start Date",
					property: "WeekStartDate"
				}, {
					label: "Week End Date",
					property: "WeekEndDate"
				}, {
					label: "EIA Region",
					property: "EiaRegio"
				}, {
					label: "Week Price",
					property: "WeekPrice"
				}, {
					label: "Surcharge",
					property: "Surcharge"
				}, {
					label: "Upload Status",
					property: "Reviewstatus"
				}

			];
			var mSettings = {
				workbook: {
					columns: aProperties,
					context: {

						title: 'Data'
					},
					dataSource: aData,
					fileName: "Data.xlsx"
				}
			};
			// var oSpreadsheet = new sap.ui.export.Spreadsheet(mSettings);
			// oSpreadsheet.build();
			// // var oSpreadsheet = new sap.ui.export.Spreadsheet(mSettings);
			// 	// oSheet = new Spreadsheet(oSettings);
			// oSpreadsheet.build().finally(function() {
			// 	oSheet.destroy();
			// });

			if (!this._oTable) {
				this._oTable = this.byId('weeklyTable');
			}

			oTable = this._oTable;
			// oRowBinding = oTable.getBinding('items');
			// aCols = this.createColumnConfig();

			mSettings = {
				workbook: {
					columns: aProperties,
					hierarchyLevel: "Level"
				},
				dataSource: aData,
				fileName: "Weekly Data.xlsx",
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(mSettings);
			oSheet.build().finally(function () {
				oSheet.destoy();
			});

		},
		onPressContinue: function () {

			this._showWeeklyData();
		},
		handleChange: function () {

			this._downloadData();
		},
		// handleTabChange: function () {

		// 	this._downloadData();
		// },
		onUploadStatus: function (change) {
			if (change === "Reviewed") {
				return "Success";
			} else {
				return "Error";
			}
		},

		onUploadStatus1: function (change) {
			if (change === "Reviewed") {
				return "sap-icon://accept";
			} else {
				return "sap-icon://pending";
			}
		},
		onUploadStatus2: function (change) {
			if (change === "Reviewed") {
				return "#12b317";
			} else {
				return "#7d727e";
			}
		},
		onUploadStatus3: function (change) {
			if (change === "Reviewed") {
				return change;
			} else {
				return change;
			}
		},

		_showWeeklyData: function () {

			// var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			// 	// var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			// var oFDate = new Date(sFromDate);
			// var oSDate = null;

			// if (oFDate.getDay() === 0) {
			// 	oSDate = new Date(oFDate.getTime() + 24 * 60 * 60 * 1000);
			// } else if (oFDate.getDay() === 1) {
			// 	oSDate = new Date(oFDate.getTime());
			// } else {
			// 	var iCalc = oFDate.getDay() - 1;
			// 	oSDate = new Date(oFDate.getTime() - (iCalc * 24 * 60 * 60 * 1000));
			// }
			// var sToDate = new Date(new Date(oSDate).getTime() + (4 * 24 * 60 * 60 * 1000));
			// var sFrmDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
			// 	pattern: "dd-MM-yyyy"
			// }).format(oSDate);
			// var sTDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
			// 	pattern: "dd-MM-yyyy"
			// }).format(sToDate);
			// var sDate = this.getView().byId("").getValue();

			this.getView().byId("datRange").setValueState("None");
			this.getView().byId("datRange1").setValueState("None");
			this.getView().byId("weeklyTable").removeSelections();
			var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			var oFDate = new Date(sFromDate);
			// var oSDate = null;

			// if (oFDate.getDay() === 0) {
			// 	oSDate = new Date(oFDate.getTime() + 24 * 60 * 60 * 1000);
			// } else if (oFDate.getDay() === 1) {
			// 	oSDate = new Date(oFDate.getTime());
			// } else {
			// 	var iCalc = oFDate.getDay() - 1;
			// 	oSDate = new Date(oFDate.getTime() - (iCalc * 24 * 60 * 60 * 1000));
			// }
			// var sToDate = new Date(new Date(oSDate).getTime() + (6 * 24 * 60 * 60 * 1000));

			var sToDate = this.getView().getModel("excelData").getProperty("/toDate");
			var sTDate = new Date(sToDate);
			if (!sFromDate) {
				this.getView().byId("datRange").setValueState("Error");
				this.getView().byId("datRange").setValueStateText("Please select Weekly Start Date");
				return;
			}
			if (!sToDate) {

				this.getView().byId("datRange1").setValueState("Error");
				this.getView().byId("datRange1").setValueStateText("Please select Weekly End Date");
				return;
			}

			var sFrmDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd-MM-yyyy"
			}).format(oFDate);
			sFrmDate = sFrmDate + "T00:00:00";

			var sToDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd-MM-yyyy"
			}).format(sTDate);
			sToDate = sToDate + "T00:00:00";

			// this.getView().byId("datRange").setValue(sFrmDate);
			// this.getView().byId("datRange1").setValue(sTDate);

			// var sFromDate = this.getView().getModel("excelData").getProperty("/fromDate");
			// sFromDate = sFromDate.split("-").join("");
			// var sToDate = this.getView().getModel("excelData").getProperty("/toDate");
			// sToDate = sToDate.split("-").join("");
			// var aFilters = [new Filter('fromDate', FilterOperator.EQ, sFrmDate), new Filter('toDate', FilterOperator.EQ, sTDate)];

			var aFilters = [new Filter('WeekStartDate', FilterOperator.EQ, sFrmDate), new Filter('WeekEndDate', FilterOperator.EQ, sToDate)];
			sap.ui.core.BusyIndicator.show();

			this.getOwnerComponent().getModel().read("/weeklyPricesEIASet", {

				urlParameters: {

					$format: "json"
				},
				filters: aFilters,
				success: function (oData, oResponse) {
					sap.ui.core.BusyIndicator.hide();
					var oOutPut = oData.results;
					this.getView().getModel("oDataModel").setProperty("/results", oOutPut);
					this.getView().getModel("oDataModel").updateBindings();
				}.bind(this),

				error: function (oError) {
					sap.ui.core.BusyIndicator.hide();
					sap.m.MessageBox.error("Failed to load the service. Please contact your administrator");
				}.bind(this)
			});
			// sap.ui.core.BusyIndicator.hide();
		}

	});
});