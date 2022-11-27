function initModel() {
	var sUrl = "/sap/opu/odata/sap/ZGW_EIA_FUEL_SURCHARGE_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}