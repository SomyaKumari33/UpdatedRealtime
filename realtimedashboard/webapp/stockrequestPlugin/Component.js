sap.ui.define([
	"sap/dm/dme/podfoundation/component/production/ProductionUIComponent",
	"sap/ui/Device"
], function (ProductionUIComponent, Device) {
	"use strict";

	return ProductionUIComponent.extend("company.custom.plugins.realtimedashboard.stockrequestPlugin.Component", {
		metadata: {
			manifest: "json"
		}
	});
});