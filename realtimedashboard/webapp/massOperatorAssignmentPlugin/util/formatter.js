sap.ui.define(
  [
    'sap/ui/core/format/NumberFormat',
    'sap/dm/dme/formatter/DateTimeUtils',
    'sap/dm/dme/formatter/NumberFormatter',
    'sap/dm/dme/podfoundation/util/PodUtility'
  ],
  function(NumberFormat, DateTimeUtils, NumberFormatter, PodUtility) {
    return {
      getDisplayValue: function(plannedQty, completedQty, unitOfMeasure, oController) {
        let oContext = this;
        if (oController) {
          oContext = oController;
        }
        let pQty = plannedQty ? NumberFormatter.dmcLocaleQuantityFormatterDisplay(plannedQty, unitOfMeasure) : 0;
        let cQty = completedQty ? NumberFormatter.dmcLocaleQuantityFormatterDisplay(completedQty, unitOfMeasure) : 0;
        if (!unitOfMeasure) {
          unitOfMeasure = '';
        }
        return oContext.getI18nText('orderCard.GRquantityValue', [cQty, pQty, unitOfMeasure]);
      }
    };
  }
);
