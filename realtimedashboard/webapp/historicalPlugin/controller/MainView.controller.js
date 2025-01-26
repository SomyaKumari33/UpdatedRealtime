sap.ui.define([
    'jquery.sap.global',
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/ui/model/json/JSONModel",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    'sap/m/Label',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/comp/smartvariants/PersonalizableInfo',
    "sap/ui/core/Fragment",
    "sap/ui/core/Control",
    "sap/ui/table/Column",
    "sap/m/MessageToast",
    "sap/m/MessageBox",

    'sap/ui/export/Spreadsheet', // Import the Spreadsheet library
    "sap/m/TablePersoController",
    // "sap/ui/table/TablePersonalizeService"




], function (jQuery, PluginViewController, JSONModel, ColumnListItem, Text, Label, Filter, FilterOperator, PersonalizableInfo, Fragment, Control, Column, MessageToast, MessageBox, Spreadsheet, TablePersoController) {
    "use strict";

    return PluginViewController.extend("company.custom.plugins.realtimedashboard.historicalPlugin.controller.MainView", {
        onInit: function () {
            PluginViewController.prototype.onInit.apply(this, arguments);
            
            var oModel = new JSONModel({
                isOperatorEnabled: false,//Initially disable the operator
                workCenter: "",
                userId: "",
                workCenters: [],
                operators: [],
                startDate: null,
                endDate: null,
                tabItems: [], // Initialize with an empty array to ensure no data is displayed

                columns: {
                    PLANT: true,
                    WORKCENTER: true,
                    WORKCENTER_DESCRIPTION: true,

                    OPERATOR: true,
                    ORDER_NO: true,
                    ORDER_STATUS: true,
                    RESOURCE: true,
                    HEADER_MATERIAL: true,

                    HEADER_MATERIAL_DESCRIPTION: true,
                    COMPONENT: true,
                    COMPONENT_DESCRIPTION: true,

                    TARGET: true,
                    UPPER_TOLERANCE: true,
                    LOWER_TOLERANCE: true,
                    QUANTITY: true,
                    UNIT_OF_MEASURE: true,
                    CONSUMPTION_DATE: true
                }
            

        });
                
                  
            
            // console.log(aColumns);



            // Set the model to the view for access in UI components
            this.getView().setModel(oModel, "data");
            // this._fetchResourceData();
            // this._fetchOrderData();
            // this._fetchworkCenterData();
            this._initializeData();




         
             // Initialize the table personalization
        
        const TablePersonalizeService = {
            oData: {
              _persoSchemaVersion: '1.0',
              aColumns: []
            },

            getPersData: function() {
              const oDeferred = new jQuery.Deferred();
              if (!this._oBundle) {
                this._oBundle = this.oData;
              }
              const oBundle = this._oBundle;
              oDeferred.resolve(oBundle);
              return oDeferred.promise();
            },

            setPersData: function(oBundle) {
              const oDeferred = new jQuery.Deferred();
              this._oBundle = oBundle;
              oDeferred.resolve();
              return oDeferred.promise();
            }
          };
          TablePersonalizeService.getPersData();
          TablePersonalizeService.setPersData({});
          this._oTableSettings = new TablePersoController({
            table: this.byId('table'), //Reference to your table
            componentName: 'settings',
            persoService: TablePersonalizeService
          }).activate();
        },
        _initializeData: function () {
        
             this._fetchResourceData();
            this._fetchOrderData();
            this._fetchworkCenterData();
        },
        onOpenTablePersonalization: function () {
                this._oTableSettings.openDialog();
            },


        formatDateTimeToSeconds: function (sDate) {
            if (!sDate) return "";

            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) return sDate;

            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd HH:mm:ss"
            });

            return oDateFormat.format(oDate); // Trims milliseconds
        },


        formatDateTime: function (oDate, sTime) {
            if (!oDate) return "";

            // Ensure date is formatted as "yyyy-MM-dd"
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd"
            });
            var sFormattedDate = oDateFormat.format(oDate);

            // Append time in "HH:mm:ss" format
            return `${sFormattedDate} ${sTime || "00:00:00"}`; // Default to "00:00:00" if time is not provided
        },

//Resource
onResourceInputChange: function (oEvent) {
    var oInput = oEvent.getSource();
    var sValue = oInput.getValue();

    if (!sValue) {
        oInput.setValueState("Error");
        oInput.setValueStateText("Resource is required.");
    } else {
        oInput.setValueState("None");
    }
},

       
        onSearch: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data"),
                aFilters = [];
        
            // Collect other filters
            var sOrder = oViewModel.getProperty("/order");
            var sResource = oViewModel.getProperty("/resource");
            var sworkCenter = oViewModel.getProperty("/workCenter");
            var suserId = oViewModel.getProperty("/userId");
        
            if (sOrder) {
                aFilters.push(new sap.ui.model.Filter("ORDER_NO", sap.ui.model.FilterOperator.EQ, sOrder));
            }
            if (sResource) {
                aFilters.push(new sap.ui.model.Filter("RESOURCE", sap.ui.model.FilterOperator.EQ, sResource));
            }
            if (sworkCenter) {
                aFilters.push(new sap.ui.model.Filter("WORKCENTER", sap.ui.model.FilterOperator.EQ, sworkCenter));
            }
            if (suserId) {
                aFilters.push(new sap.ui.model.Filter("OPERATOR", sap.ui.model.FilterOperator.EQ, suserId));
            }
        
            // Start Date & Time
            var oStartDate = oView.byId("idStartDatePicker").getDateValue();
            var oStartTime = oView.byId("idStartTimePicker").getValue();
        
            //End Date & Time
            var oEndDate = oView.byId("idFGIEndDatePicker").getDateValue();
            var oEndTime = oView.byId("idEndTimePicker").getValue();
        
            // Combine Start Date and Time
            if (oStartDate && oStartTime) {
                var sStartDateTime = this.formatDateTime(oStartDate, oStartTime);
                aFilters.push(new sap.ui.model.Filter("CONSUMPTION_DATE", sap.ui.model.FilterOperator.GE, sStartDateTime));
            }
        
            // Combine End Date and Time
            if (oEndDate && oEndTime) {
                var sEndDateTime = this.formatDateTime(oEndDate, oEndTime);
                aFilters.push(new sap.ui.model.Filter("CONSUMPTION_DATE", sap.ui.model.FilterOperator.LE, sEndDateTime));
            }
        
            // Combine all filters
            var oFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });
        
            // Fetch filtered data and update the table
            var oTable = oView.byId("table");
            var oItemsTemplate = this.getView().byId("idTableListItem");
        
            if (aFilters.length > 0) {
                 // Fetch additional data
                
                this._fetchConsumptionData(oFilter, function (filteredData) {
                    oViewModel.setProperty("/tabItems", filteredData);
        
                    // Bind data to table dynamically
                    oTable.bindItems({
                        path: "/tabItems",
                        model: "data",
                        template: oItemsTemplate,
                        templateShareable: true
                    });
                    
                   
                }.bind(this));
            } else {
                sap.m.MessageToast.show("Please select filters before searching.");
            
            }
        },
        
        

         

        /**
         * Converts a 12-hour time format to 24-hour format.
         * @param {string} sTime - The time string to convert.
         * @param {string} sFormat - The time format ("12-hour" or "24-hour").
         * @returns {string} - Converted time in 24-hour format.
         */
        _convertTo24HourFormat: function (sTime, sFormat) {
            if (sFormat === "24-hour") {
                return sTime; // Already in 24-hour format
            }

            // For 12-hour format, we need to handle AM/PM conversion
            var timeParts = sTime.split(' '); // Split time and AM/PM
            var timeArray = timeParts[0].split(':'); // Split hour, minute, and second
            var hour = parseInt(timeArray[0]);

            if (timeParts[1] === "AM" && hour === 12) {
                hour = 0; // Convert 12 AM to 00
            } else if (timeParts[1] === "PM" && hour !== 12) {
                hour += 12; // Convert PM hours to 24-hour format
            }

            timeArray[0] = hour.toString().padStart(2, '0'); // Add leading zero for single digit hours

            // Rejoin the time parts in 24-hour format
            return timeArray.join(':');
        },

        /**
         * Formats the date and time to a string in "yyyy-MM-dd HH:mm:ss" format.
         * @param {object} oDate - The Date object to format.
         * @param {string} sTime - The time string to append.
         * @returns {string} - The formatted date-time string.
         */



        _fetchConsumptionData: function (oFilter, fnCallback) {
            var sUrl = 'https://dbapicall.cfapps.eu20-001.hana.ondemand.com/api/get/consumptionData';
            var oPayload = {
                plant: this.getPodController().getUserPlant()
            };
        
            this.ajaxPostRequest(
                sUrl,
                oPayload,
                function (oResponseData) {
                    // Convert CONSUMPTION_DATE property from string to Date
                    oResponseData.forEach(item => {
                        item.CONSUMPTION_DATE = new Date(item.CONSUMPTION_DATE);
                    });
        
                    if (oFilter) {
                        // Manually filter the data
                        var aFilteredData = oResponseData.filter(item => {
                            // Apply each filter in the oFilter.filters array
                            return oFilter.aFilters.every(subFilter => {
                                var sPath = subFilter.sPath;
                                var sOperator = subFilter.sOperator;
                                var oValue = subFilter.oValue1;
        
                                // Handle specific filter logic based on operator
                                switch (sOperator) {
                                    case sap.ui.model.FilterOperator.EQ:
                                        return item[sPath] === oValue;
                                    case sap.ui.model.FilterOperator.GT:
                                        return new Date(item[sPath]) > oValue;
                                    case sap.ui.model.FilterOperator.LT:
                                        return new Date(item[sPath]) < oValue;
                                    default:
                                        return true; // Add support for more operators if needed
                                }
                            });
                        });
        
                        // Update the model with the filtered data
                        this.getView().getModel("data").setProperty("/tabItems", aFilteredData);
        
                        // Execute the callback with filtered data
                        if (fnCallback) {
                            fnCallback(aFilteredData);
                        }
                    } else {
                        // No filter, set full data
                        this.getView().getModel("data").setProperty("/tabItems", oResponseData);
        
                        // Execute the callback with full data
                        if (fnCallback) {
                            fnCallback(oResponseData);
                        }
                    }
        
                    MessageToast.show("Filtered data loaded!");
                }.bind(this),
                function (oError) {
                    MessageBox.error("Error fetching data: " + (oError.responseText || oError.statusText));
                }
            );
        },
        

        ajaxPostRequest: function (sUrl, oPayload, fnSuccess, fnError) {
            $.ajax({
                url: sUrl,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                success: fnSuccess,
                error: fnError
            });
        },

        formatDate: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) return sDate;
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "yyyy-MM-dd"
            });
            return oDateFormat.format(oDate);
        },
        formatTime: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) return sDate;

            var oTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
                pattern: "HH:mm:ss"
            });
            return oTimeFormat.format(oDate);
        },

        handleResponseOrders: function (oResponseData) {
            var oModel = this.getView().getModel("data");
            oModel.setProperty("/orders", oResponseData.content);
        },

        handleResponseResources: function (oResponseData) {
            var oModel = this.getView().getModel("data");
            oModel.setProperty("/resources", oResponseData);
            console.log("Resources Data:", oModel.getProperty("/resources"));

        },
        // handleResponseOrders: function (oResponseData) {
        //     var oModel = this.getView().getModel("data");
        //     oModel.setProperty("/orders", oResponseData.content);
        // },

        handleResponseworkCenters: function (oResponseData) {
            var oModel = this.getView().getModel("data");
            oModel.setProperty("/workCenters", oResponseData);
            console.log("workCenter Data:", oModel.getProperty("/workCenters"));

        },
        _fetchOrderData: function () {
            var sUrl = this.getPublicApiRestDataSourceUri() + '/order/v1/orders/list';
            var oParameters = {
                plant: 'M206',
                page: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
                size: "1000"
            };
            this.ajaxGetRequest(sUrl, oParameters, (oResponseData) => {
                // Ensure that oResponseData.content exists and is an array before setting the model
                if (oResponseData && oResponseData.content && Array.isArray(oResponseData.content)) {
                    this.handleResponseOrders(oResponseData);
                } else {
                    console.error("Order data is not available or not in the correct format.");
                }
            }, this.handleErrorMessage);
        },

        handleResponseOrders: function (oResponseData) {
            var oModel = this.getView().getModel("data");
            oModel.setProperty("/orders", oResponseData.content);

            var aOrderData = oModel.getProperty("/orders");

            if (aOrderData && Array.isArray(aOrderData)) {
                var aBOMs = aOrderData.map(oOrder => oOrder.bom).filter(bom => bom);  // Ensure there's valid data
                oModel.setProperty("/boms", aBOMs);
            } else {
                console.error("Order data is not available or not in the correct format.");
            }


            console.log("Orders Data:", oModel.getProperty("/orders"));
            console.log("BOM Data:", oModel.getProperty("/boms"));

        },


        _fetchResourceData: function () {
            var sUrl = this.getPublicApiRestDataSourceUri() + '/resource/v2/resources';
            var oParameters = {
                plant: 'M206',
                page: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
                size: "1000"
            };
            this.ajaxGetRequest(sUrl, oParameters, (oResponseData) => {
                this.handleResponseResources(oResponseData);
            }, this.handleErrorMessage);
        },

        ajaxGetRequest: function (sUrl, oParameters, fnSuccess, fnError) {
            $.ajax({
                url: sUrl,
                type: "GET",
                data: oParameters,
                success: fnSuccess,
                error: fnError
            });
        },

        handleErrorMessage: function (oError) {
            MessageBox.error("An error occurred while fetching data.");
        },

        _fetchworkCenterData: function () {
            var sUrl = this.getPublicApiRestDataSourceUri() + '/workcenter/v2/workcenters';
            var oParameters = {
                plant: 'M206',
                page: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
                size: "1000"
            };
            this.ajaxGetRequest(sUrl, oParameters, (oResponseData) => {
                this.handleResponseworkCenters(oResponseData);
            }, this.handleErrorMessage);
        },

        ajaxGetRequest: function (sUrl, oParameters, fnSuccess, fnError) {
            $.ajax({
                url: sUrl,
                type: "GET",
                data: oParameters,
                success: fnSuccess,
                error: fnError
            });
        },

        handleErrorMessage: function (oError) {
            MessageBox.error("An error occurred while fetching data.");
        },


        //For operators

        _fetchOperatorsForWorkCenter: function (sWorkCenter) {
            var oViewModel = this.getView().getModel("data");
            var aWorkCenters = oViewModel.getProperty("/workCenters");

            // Find the selected work center
            var oSelectedWorkCenter = aWorkCenters.find(function (oWorkCenter) {
                return oWorkCenter.workCenter === sWorkCenter;
            });

            if (oSelectedWorkCenter && oSelectedWorkCenter.userAssignments) {
                // Bind the user IDs (operators) to the model
                oViewModel.setProperty("/operators", oSelectedWorkCenter.userAssignments);
            } else {
                // Clear operators if none are found
                oViewModel.setProperty("/operators", []);
            }
        },
      
       
     

        onOrderValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data");

            if (!this.oOrderVHDia) {
                //Load the fragment
                this.oOrderVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.historicalPlugin.view.fragments.OrderValueHelpRequest",
                    this
                );

                this.oOrderVHDia.getTableAsync().then(function (oTable) {
                    //Add columns to the table
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Order" }),
                            template: new Text({ text: "{data>order}" }),
                            width: "170px"

                        })
                    );
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "status" }),
                            template: new Text({ text: "{data>status}" }),
                            width: "170px"
                        })
                    );
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "orderType" }),
                            template: new Text({ text: "{data>orderType}" }),
                            width: "170px"
                        })
                    );
                    //Bind data to the table
                    oTable.setModel(oViewModel, "data");
                    oTable.bindRows("data>/orders");
                });
            }
            this.oOrderVHDia.open();
        },

        onOrderVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            //Create filters based on selected input Values
            aFilters = aFilterGroupItems.map(function (oFGI) {
                var oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    return new Filter({
                        path: oFGI.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    });
                }
            })
                .filter(Boolean); //Filter out empty values

            //Get the table for dialog and apply filter 
            this.oOrderVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                //    oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },
        onOrderVHDiaOKPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No order selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oOrderVHDia.close();

            //Get Batch info for selected resource
            var sSelectedorder = aSelectedItems[0].getKey();

            //Set the selected order to model
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/order", sSelectedorder);
            oViewModel.setProperty("/isorderSelected", true);
        },





        onOrderVHDiaCancelPress: function (oEvent) {
            this.oOrderVHDia.close();
        },




        

        onResourceValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data");

            if (!this.oResourceVHDia) {
                // Load the fragment
                this.oResourceVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.historicalPlugin.view.fragments.ResourceValueHelpRequest",
                    this
                );

                this.oResourceVHDia.getTableAsync().then(function (oTable) {
                    // Add columns to the table
                    oTable.addColumn(
                        new sap.ui.table.Column({
                            label: new sap.m.Text({ text: "Resource" }),
                            template: new sap.m.Text({ text: "{data>resource}" }),
                            width: "170px"
                        })
                    );
                    oTable.addColumn(
                        new sap.ui.table.Column({
                            label: new sap.m.Text({ text: "Description" }),
                            template: new sap.m.Text({ text: "{data>description}" }),
                            width: "170px"
                        })
                    );
                    oTable.addColumn(
                        new sap.ui.table.Column({
                            label: new sap.m.Text({ text: "Status" }),
                            template: new sap.m.Text({ text: "{data>status}" }),
                            width: "170px"
                        })
                    );

                    // Bind data to the table
                    oTable.setModel(oViewModel, "data");
                    oTable.bindRows("data>/resources");

                    // Apply the custom filter to only show resources with types "FORMULATION" or "PORTIONING"
                    var oFilter = new sap.ui.model.Filter({
                        path: 'types',
                        test: function (oTypes) {
                            return oTypes.some(function (typeObj) {
                                return typeObj.type === "FORMULATION" || typeObj.type === "PORTIONING";
                            });
                        }
                    });

                    var oBinding = oTable.getBinding("rows");
                    oBinding.filter([oFilter]);
                }.bind(this));
            }

            this.oResourceVHDia.open();
        },


        onResourceVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            //Create filters based on selected input Values
            aFilters = aFilterGroupItems.map(function (oFGI) {
                var oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    return new Filter({
                        path: oFGI.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    });
                }
            })
                .filter(Boolean); //Filter out empty values

            //Get the table for dialog and apply filter 
            this.oResourceVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                //    oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },
        onResourceVHDiaOKPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No Resource selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oResourceVHDia.close();

            //Get Batch info for selected resource
            var sSelectedResource = aSelectedItems[0].getKey();

            //Set the selected Resource to model
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/resource", sSelectedResource);
            oViewModel.setProperty("/isresourceSelected", true);
        },





        onResourceVHDiaCancelPress: function (oEvent) {
            this.oResourceVHDia.close();
        },



        onworkCenterValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data");

            if (!this.oworkCenterVHDia) {
                //Load the fragment
                this.oworkCenterVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.historicalPlugin.view.fragments.workCenterValueHelpRequest",
                    this
                );

                this.oworkCenterVHDia.getTableAsync().then(function (oTable) {
                    //Add columns to the table
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "workCenter" }),
                            template: new Text({ text: "{data>workCenter}" }),
                            width: "170px"

                        })
                    );
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "description" }),
                            template: new Text({ text: "{data>description}" }),
                            width: "170px"
                        })
                    );
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "status" }),
                            template: new Text({ text: "{data>status}" }),
                            width: "170px"
                        })
                    );
                    //Bind data to the table
                    oTable.setModel(oViewModel, "data");
                    oTable.bindRows("data>/workCenters");
                });
            }
            this.oworkCenterVHDia.open();
        },

        onworkCenterVHDiaSearch: function (oEvent) {
            const oFilterBar = oEvent.getSource();
            const aFilterGroupItems = oFilterBar.getFilterGroupItems();
            let aFilters = [];
        
            // Create filters for all input fields
            aFilterGroupItems.forEach((oFGI) => {
                const oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    const sValue = oControl.getValue().trim();
                    if (sValue) {
                        // Add both filters for 'workCenter' and 'description' using OR
                        const oWorkCenterFilter = new Filter("workCenter", FilterOperator.Contains, sValue);
                        const oDescriptionFilter = new Filter("description", FilterOperator.Contains, sValue);
                        aFilters.push(new Filter({
                            filters: [oWorkCenterFilter, oDescriptionFilter],
                            and: false, // OR condition
                        }));
                    }
                }
            });
        
            // Apply the combined filter to the table
            if (this.oworkCenterVHDia) {
                this.oworkCenterVHDia.getTableAsync().then((oTable) => {
                    const oBinding = oTable.getBinding("rows");
                    if (oBinding) {
                        oBinding.filter(aFilters); // Apply filters
                    }
                });
            }
        },
        
        onworkCenterVHDiaOKPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            // No WorkCenter selected
            if (aSelectedItems.length < 1) {
                return;
            }

            // Close dialog
            this.oworkCenterVHDia.close();

            // Get the selected WorkCenter
            var sSelectedWorkCenter = aSelectedItems[0].getKey();

            // Set the selected WorkCenter in the model
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/workCenter", sSelectedWorkCenter);

            // Enable the Operator input field
            oViewModel.setProperty("/isOperatorEnabled", true);

            // Fetch user IDs (operators) for the selected WorkCenter
            this._fetchOperatorsForWorkCenter(sSelectedWorkCenter);
        },

        onworkCenterVHDiaCancelPress: function () {
            var oViewModel = this.getView().getModel("data");
            this.oworkCenterVHDia.close();

            // Reset Operator and disable the Operator input field
            oViewModel.setProperty("/userId", "");
            oViewModel.setProperty("/operators", []);
            oViewModel.setProperty("/isOperatorEnabled", false);
        },


        onOperatorValueHelpRequest: function () {
            if (!this.oOperatorVHDia) {
                // Load the fragment for Operator VHD
                this.oOperatorVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.historicalPlugin.view.fragments.OperatorValueHelpRequest",
                    this
                );
                this.getView().addDependent(this.oOperatorVHDia);

                // Configure table columns in the dialog
                this.oOperatorVHDia.getTableAsync().then(function (oTable) {
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "User ID" }),
                            template: new Text({ text: "{data>userId}" }),
                        })
                    );

                    // Bind data to the dialog
                    oTable.setModel(this.getView().getModel("data"), "data");
                    oTable.bindRows("data>/operators");
                }.bind(this));
            }

            this.oOperatorVHDia.open();
        },


        onOperatorVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            //Create filters based on selected input Values
            aFilters = aFilterGroupItems.map(function (oFGI) {
                var oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    return new Filter({
                        path: oFGI.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    });
                }
            })
                .filter(Boolean); //Filter out empty values

            //Get the table for dialog and apply filter 
            this.oOperatorVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                //    oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },
        onOperatorVHDiaOKPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No order selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oOperatorVHDia.close();

            //Get Batch info for selected resource
            var sSelectedOperator = aSelectedItems[0].getKey();

            //Set the selected order to model
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/userId", sSelectedOperator);
            oViewModel.setProperty("/isOperatorSelected", true);
        },





        onOperatorVHDiaCancelPress: function (oEvent) {
            this.oOperatorVHDia.close();
        },


        onClearFilters: function () {
            var oView = this.getView();
            var oModel = oView.getModel("data");

            // Clear the properties in the model
            oModel.setProperty("/order", null); // Clear order
            oModel.setProperty("/resource", null); // Clear resource
            oModel.setProperty("/bom", null); // Clear BOM
            oModel.setProperty("/workCenter", null); // Clear BOM
            oModel.setProperty("/userId", null); // Clear userId

            

           // Ensure the controls exist before attempting to set values
    var oStartDatePicker = this.getView().byId('idStartDatePicker');
    if (oStartDatePicker) {
        oStartDatePicker.setDateValue(null);
    }

    var oStartTimePicker = this.getView().byId('idStartTimePicker');
    if (oStartTimePicker) {
        oStartTimePicker.setValue("");
    }

    var oEndDatePicker = this.getView().byId('idFGIEndDatePicker');
    if (oEndDatePicker) {
        oEndDatePicker.setDateValue(null);
    }

    var oEndTimePicker = this.getView().byId('idEndTimePicker');
    if (oEndTimePicker) {
        oEndTimePicker.setValue("");
    }


            // Clear the table filters
            var oTable = oView.byId("table");
            if (oTable) {
                oTable.getBinding("items").filter([]);
            }
            // Disable operator input field if work center is empty
            var oWorkCenterField = oView.byId("IdworkCenterInput"); // Replace with the actual ID of the work center input field
            var oOperatorField = oView.byId("IdOperatorInput"); // Replace with the actual ID of the operator input field
            if (oWorkCenterField && oOperatorField) {
                var sWorkCenterValue = oWorkCenterField.getValue(); // Or getProperty("value") depending on the control type
                if (!sWorkCenterValue) {
                    oOperatorField.setEnabled(false); // Disable operator field
                }
            }
            //Clear table data
            oModel.setProperty("/tabItems", []);
            //Optional: Unbind items to clear the table view
            var oTable = oView.byId("table");
            oTable.unbindItems();
             MessageToast.show("Filters cleared successfully!");
        },

     
        onExportToExcel: function () {
            var oModel = this.getView().getModel("data");
            var aData = oModel.getProperty("/tabItems");
        
            // Get visible columns from the "columns" model
            var oColumnsConfig = oModel.getProperty("/columns");
            var aVisibleColumns = Object.entries(oColumnsConfig)
                .filter(([key, isVisible]) => isVisible)
                .map(([key]) => key);
        
            // Define all possible columns with proper formatters
            var aAllColumns = [
                { label: 'Plant', property: 'PLANT' },
                { label: 'Work Center', property: 'WORKCENTER' },
                { label: 'Work Center Description', property: 'WORKCENTER_DESCRIPTION' },
                { label: 'Operator', property: 'OPERATOR' },
                { label: 'Order', property: 'ORDER_NO' },
                { label: 'Order Status', property: 'ORDER_STATUS' },
                { label: 'Scale', property: 'RESOURCE' },
                { label: 'Material Details', property: 'HEADER_MATERIAL', combineWith: 'HEADER_MATERIAL_DESCRIPTION' },
                { label: 'Component Details', property: 'COMPONENT', combineWith: 'COMPONENT_DESCRIPTION' },
                { label: 'Target', property: 'TARGET' },
                { label: 'Upper Tolerance', property: 'UPPER_TOLERANCE' },
                { label: 'Lower Tolerance', property: 'LOWER_TOLERANCE' },
                { label: 'Actual Weight', property: 'QUANTITY' },
                { label: 'UOM', property: 'UNIT_OF_MEASURE' },
                // Apply the formatDate function to Consumption Date
                {
                    label: 'Consumption Date',
                    property: 'CONSUMPTION_DATE',
                    type: 'string',
                    formatter: function (sDate) {
                        if (!sDate) return "";
                        var oDate = new Date(sDate);
                        return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oDate);
                    }
                },
                // Apply the formatTime function to Consumption Time
                {
                    label: 'Consumption Time',
                    property: 'CONSUMPTION_DATE',
                    type: 'string',
                    formatter: function (sDate) {
                        if (!sDate) return "";
                        var oDate = new Date(sDate);
                        return sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "HH:mm:ss" }).format(oDate);
                    }
                }
            ];
        
            // Include combined columns explicitly for export
            var aExportColumns = aAllColumns.filter(column => aVisibleColumns.includes(column.property) || column.combineWith);
        
            // Format data for export
            var aFormattedData = aData.map(item => {
                var oFormattedItem = {};
                aExportColumns.forEach(column => {
                    if (column.combineWith) {
                        //Combine the properties with a space or separator
                        oFormattedItem[column.label] = `${item[column.property]} ${item[column.combineWith]}`;
                    }
                    else if (column.formatter) {
                        oFormattedItem[column.label] = column.formatter(item[column.property]);
                    } else {
                        oFormattedItem[column.label] = item[column.property];
                    }
                });
                return oFormattedItem;
            });
        
            // Initialize the Spreadsheet with formatted data
            var oSpreadsheet = new sap.ui.export.Spreadsheet({
                workbook: {
                    columns: aExportColumns.map(col => ({
                        label: col.label,
                        property: col.label,
                        type: 'string'
                    }))
                },
                dataSource: aFormattedData,
                fileName: 'report.xlsx',
                worker: false,
                showProgress: true
            });
        
            oSpreadsheet.build().then(function () {
                console.log('Export to Excel successful!');
            }).catch(function (oError) {
                console.error('Error while exporting to Excel:', oError);
            });
        },
        
     

        // onExportToPDF: function () {
        //     var oModel = this.getView().getModel("data");
        //     var aData = oModel.getProperty("/tabItems");

        //     // Create a new jsPDF instance
        //     var doc = new jsPDF();

        //     // Add title to the PDF
        //     doc.setFontSize(18);
        //     doc.text('Exported Table Data', 14, 16);

        //     // Table headers and data
        //     var columns = [
        //         'Work Center', 'Operator', 'Order', 'Scale', 'Material Description', 
        //         'Component', 'BOM', 'Target', 'Actual Weight', 'UOM', 'Consumption Date and Time'
        //     ];

        //     var rows = aData.map(function (item) {
        //         return [
        //             item.WORKCENTER,
        //             item.OPERATOR,
        //             item.ORDER_NO,
        //             item.RESOURCE,
        //             item.MATERIAL_DESCRIPTION,
        //             item.COMPONENT,
        //             item.BOM,
        //             item.TARGET,
        //             item.QUANTITY,
        //             item.UOM,
        //             this.formatDateTime(item.CONSUMPTION_DATE)
        //         ];
        //     }.bind(this));

        //     // Add table to PDF
        //     doc.autoTable({
        //         head: [columns],
        //         body: rows,
        //         startY: 20, // Start from a position below the title
        //         margin: { top: 20, left: 10, right: 10, bottom: 10 }
        //     });

        //     // Save the PDF
        //     doc.save('report.pdf');
        // },
    

        onAfterRendering: function () {

            // this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
            // this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);

            // this.getView().byId("headerTitle").setText(this.getConfiguration().title);
            // this.getView().byId("textPlugin").setText(this.getConfiguration().text);

        },

        onBeforeRenderingPlugin: function () {



        },

        isSubscribingToNotifications: function () {

            var bNotificationsEnabled = true;

            return bNotificationsEnabled;
        },


        getCustomNotificationEvents: function (sTopic) {
            //return ["template"];
        },


        getNotificationMessageHandler: function (sTopic) {

            //if (sTopic === "template") {
            //    return this._handleNotificationMessage;
            //}
            return null;
        },

        _handleNotificationMessage: function (oMsg) {

            var sMessage = "Message not found in payload 'message' property";
            if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
                for (var i = 0; i < oMsg.parameters.length; i++) {

                    switch (oMsg.parameters[i].name) {
                        case "template":

                            break;
                        case "template2":


                    }



                }
            }

        },


        onExit: function () {
            PluginViewController.prototype.onExit.apply(this, arguments);


        }
    });
});