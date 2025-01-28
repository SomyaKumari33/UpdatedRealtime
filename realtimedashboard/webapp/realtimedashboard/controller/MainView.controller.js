sap.ui.define(
  [
    'jquery.sap.global',
    'sap/dm/dme/podfoundation/controller/PluginViewController',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/base/Log'
  ],
  function(jQuery, PluginViewController, JSONModel, Filter, FilterOperator, Log) {
    'use strict';
    var oLogger = Log.getLogger('realtimedashboard', Log.Level.INFO);

    return PluginViewController.extend('company.custom.plugins.realtimedashboard.realtimedashboard.controller.MainView', {
      metadata: {
        properties: {}
      },

      onInit: function() {
        if (PluginViewController.prototype.onInit) {
          PluginViewController.prototype.onInit.apply(this, arguments);
        }
        var oModel = new JSONModel({
          isOperatorEnabled: false,
          workCenter: '',
          userId: '',
          workCenters: [],
          operators: [],
          items: []
        });

        var oView = this.getView();
        oView.setModel(new JSONModel(), 'resourceData');
        oView.setModel(new JSONModel(), 'workCenterData');
        oView.setModel(oModel, 'data');
        // Fetch initial data to display the card
      },

      onBeforeRenderingPlugin: function() {},
      onBeforeRendering: function() {
        this._getWorkCenterAssignments();
      },

      onExit: function() {
        if (PluginViewController.prototype.onExit) {
          PluginViewController.prototype.onExit.apply(this, arguments);
        }
      },

      onRefresh: async function() {
        // Display a busy indicator to inform the user that data is being refreshed
        sap.ui.core.BusyIndicator.show(0);

        try {
          // Refresh resource and work center data
          await this._getWorkCenterAssignments();
          sap.m.MessageToast.show('Data refreshed successfully.');
        } catch (error) {
          sap.m.MessageBox.error('Error while refreshing data: ' + error.message);
        } finally {
          // Hide the busy indicator
          sap.ui.core.BusyIndicator.hide();
        }
      },

      onAfterRendering: function() {},

      resourceStatusTextFormatter: function(sStatus) {
        if (!sStatus) return;
        switch (sStatus) {
          case 'ENABLED':
            return this.getI18nText('enum.resource.status.enabled');
          case 'UNKNOWN':
            return this.getI18nText('enum.resource.status.unknown');
          case 'PRODUCTIVE':
            return this.getI18nText('enum.resource.status.productive');
          case 'SCHEDULED_DOWN':
            return this.getI18nText('enum.resource.status.scheduledDown');
          case 'UNSCHEDULED_DOWN':
            return this.getI18nText('enum.resource.status.unscheduledDown');
          case 'DISABLED':
            return this.getI18nText('enum.resource.status.disabled');
        }
      },

      resourceStatusIconFormatter: function(sStatus) {
        if (!sStatus) return;
        switch (sStatus) {
          case 'ENABLED':
            return 'sap-icon://sys-enter-2';
          case 'UNKNOWN':
          case 'PRODUCTIVE':
          case 'SCHEDULED_DOWN':
          case 'UNSCHEDULED_DOWN':
          case 'DISABLED':
            return 'sap-icon://error';
        }
      },

      resourceStatusStatusFormatter: function(sStatus) {
        if (!sStatus) return;
        switch (sStatus) {
          case 'ENABLED':
            return 'Success';
          case 'UNKNOWN':
          case 'PRODUCTIVE':
          case 'SCHEDULED_DOWN':
          case 'UNSCHEDULED_DOWN':
          case 'DISABLED':
            return 'Error';
        }
      },

      _getWorkCenterAssignments: async function() {
        //Get resource data
        var aResources = await this._getResourceData().then(aResources => {
          return this._createCustomDataObject(aResources);
        });

        this.getView().getModel('resourceData').setData(aResources);

        //Get Workcenter data
        var aWorkCenters = await this._getWorkCenterData();
        this.getView().getModel('workCenterData').setData(aWorkCenters);

        // this._createTableLineItems(aWorkCenters, aResources);
        this._createPanelLineItems(aWorkCenters, aResources);
        this._getResourceHeartBeats();
      },

      _getResourceData: function() {
        var sUrl = this.getPublicApiRestDataSourceUri() + '/resource/v2/resources';
        var oParamters = {
          plant: this.getPodController().getUserPlant()
        };
        return new Promise((resolve, reject) => {
          this.ajaxGetRequest(sUrl, oParamters, resolve, reject);
        });
      },

      _getWorkCenterData: function() {
        var sUrl = this.getPublicApiRestDataSourceUri() + 'workcenter/v2/workcenters';
        var oParameters = {
          plant: this.getPodController().getUserPlant()
        };
        return new Promise((resolve, reject) => {
          this.ajaxGetRequest(sUrl, oParameters, resolve, reject);
        });
      },

      _createCustomDataObject: function(aData) {
        return aData.map(oItem => {
          var oCustomData = oItem.customValues.reduce((acc, val) => {
            acc[val.attribute] = val.value;
            return acc;
          }, {});
          oItem.customData = oCustomData;
          return oItem;
        });
      },

      _createPanelLineItems: function(aWorkCenters, aResources) {
        var oResourceByWorkCenter = {};

        var aResourceList = aResources
          .filter(oResource => oResource.types.find(value => value.type === 'PORTIONING' || value.type === 'FORMULATION'))
          .map(oResource => {
            return {
              ...oResource,
              status: ''
            };
          });

        aWorkCenters = aWorkCenters.map(oWorkCenter => {
          var aList = oWorkCenter.members.map(oMember => oMember.resource.resource);
          return {
            ...oWorkCenter,
            resourceList: aList
          };
        });

        aResourceList.forEach(oResource => {
          var sWorkCenterId = '',
            sWorkCenterDesc = '';

          var oWorkCenter = aWorkCenters.find(oWorkCenter => oWorkCenter.resourceList.includes(oResource.resource));

          if (oWorkCenter) {
            sWorkCenterId = oWorkCenter.workCenter;
            sWorkCenterDesc = oWorkCenter.description;
          }

          if (!oResourceByWorkCenter[sWorkCenterId]) {
            oResourceByWorkCenter[sWorkCenterId] = {
              workCenter: sWorkCenterId,
              workCenterDesc: sWorkCenterDesc,
              resources: []
            };
          }

          oResourceByWorkCenter[sWorkCenterId].resources.push(oResource);
        });

        var aResourceList = Object.values(oResourceByWorkCenter);

        this.getView().getModel('data').setProperty('/items', aResourceList);

        return aResourceList;
      },

      _getResourceHeartBeats: async function() {
        var oModel = this.getView().getModel('data'),
          aLineItems = oModel.getProperty('/items');

        var aResources = aLineItems.flatMap(oItem => oItem.resources);
        var aPromises = aResources.map(oResource => this._fetchResourceHeartBeat(oResource));

        await Promise.all(aPromises);
        oModel.setProperty('/items', aLineItems);
      },

      _fetchResourceHeartBeat: function(oResource) {
        // if (!sResourceId || !sWorkCenter) {
        //   //DO error handling
        //   return;
        // }
        var sResourceId = oResource.resource;

        var sUrl =
          this.getPublicApiRestDataSourceUri() +
          '/pe/api/v1/process/processDefinitions/start?key=REG_112d9e32-1270-43fb-b587-c0d21d8424fd&async=false';

        // Create payload dynamically with fetched values
        var oPayload = {
          inPlant: this.getPodController().getUserPlant(),
          inResource: sResourceId
          // inWorkCenter: sWorkCenter
        };

        return new Promise((resolve, reject) => {
          this.ajaxPostRequest(sUrl, oPayload, resolve, reject);
        })
          .then(function(oResponse) {
            var oItem = {
              resource: sResourceId,
              status: oResponse.OUTPUT === 1 ? 'ENABLED' : 'DISABLED'
            };
            Object.assign(oResource, oItem);
            return oResource;
          })
          .catch(function(oError, sHttpErrorMessage) {
            console.error('Error fetching process status', oError, sHttpErrorMessage);
          });
      },

      onResourceValueHelpRequest: function() {
        var oView = this.getView(),
          oResourceDataModel = oView.getModel('resourceData'),
          oResourceData = oResourceDataModel.getData();

        // Filter resources based on the types (PORTIONING or FORMULATION)
        var aFilteredResources = oResourceData.filter(function(oResource) {
          return (
            oResource.types &&
            oResource.types.some(function(type) {
              return type.type === 'PORTIONING' || type.type === 'FORMULATION';
            })
          );
        });

        // Set the filtered resources to the model
        oResourceDataModel.setData(aFilteredResources);

        if (!this.oResourceVHDia) {
          // Load the fragment
          this.oResourceVHDia = sap.ui.xmlfragment(
            'company.custom.plugins.realtimedashboard.realtimedashboard.view.fragments.ResourceValueHelpRequest',
            this
          );

          // Bind the 'resourceData' model to the dialog
          this.oResourceVHDia.setModel(oResourceDataModel, 'resourceData');

          this.oResourceVHDia.getTableAsync().then(function(oTable) {
            // Add columns to the table
            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'Resource' }),
                template: new sap.m.Text({ text: '{resourceData>resource}' }),
                width: '170px'
              })
            );

            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'Description' }),
                template: new sap.m.Text({ text: '{resourceData>description}' }),
                width: '170px'
              })
            );

            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'Status' }),
                template: new sap.m.Text({ text: '{resourceData>status}' }),
                width: '170px'
              })
            );

            // Bind rows to the 'resourceData' model
            oTable.bindRows('resourceData>/');
          });
        }

        this.oResourceVHDia.open();
      },

      onResourceVHDiaSearch: function(oEvent) {
        var oFilterBar = oEvent.getSource(),
          aFilterGroupItems = oFilterBar.getFilterGroupItems(),
          aFilters = [];

        // Create filters based on selected input values
        aFilters = aFilterGroupItems
          .map(function(oFGI) {
            var oControl = oFGI.getControl();
            if (oControl && oControl.getValue) {
              return new Filter({
                path: oFGI.getName(),
                operator: FilterOperator.Contains,
                value1: oControl.getValue()
              });
            }
          })
          .filter(Boolean);

        // Get the table for dialog and apply filter
        this.oResourceVHDia.getTableAsync().then(oTable => {
          var oRowBindingCtx = oTable.getBinding('rows');

          // Apply filters to the 'resourceData' model
          oRowBindingCtx.filter(aFilters);
        });
      },

      onResourceVHDiaOKPress: function(oEvent) {
        var aSelectedItems = oEvent.getParameter('tokens');

        // No Resource selected
        if (aSelectedItems.length < 1) {
          return;
        }

        // Close dialog
        this.oResourceVHDia.close();

        // Get Batch info for selected resource
        var sSelectedResource = aSelectedItems[0].getKey();

        // Store the selected Resource in a separate property
        var oViewModel = this.getView().getModel('resourceData');
        oViewModel.setProperty('/selectedResource', sSelectedResource); // Store selected resource separately
        oViewModel.setProperty('/isresourceSelected', true);
      },

      onResourceVHDiaCancelPress: function(oEvent) {
        this.oResourceVHDia.close();
      },

      onworkCenterValueHelpRequest: function() {
        var oViewModel = this.getView().getModel('workCenterData'); // Correctly get the model

        if (!this.oworkCenterVHDia) {
          // Load the fragment
          this.oworkCenterVHDia = sap.ui.xmlfragment(
            'company.custom.plugins.realtimedashboard.realtimedashboard.view.fragments.workCenterValueHelpRequest',
            this
          );

          this.oworkCenterVHDia.getTableAsync().then(function(oTable) {
            // Add columns to the table
            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'workCenter' }),
                template: new sap.m.Text({ text: '{workCenter}' }), // Correct model path
                width: '170px'
              })
            );
            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'description' }),
                template: new sap.m.Text({ text: '{description}' }), // Correct model path
                width: '170px'
              })
            );
            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'status' }),
                template: new sap.m.Text({ text: '{status}' }), // Correct model path
                width: '170px'
              })
            );

            // Bind data to the table
            oTable.setModel(oViewModel); // Correct model
            oTable.bindRows('/'); // Correct binding path
          });
        }

        this.oworkCenterVHDia.open();
      },

      onworkCenterVHDiaSearch: function(oEvent) {
        const oFilterBar = oEvent.getSource();
        const aFilterGroupItems = oFilterBar.getFilterGroupItems();
        let aFilters = [];

        // Create filters for all input fields
        aFilterGroupItems.forEach(oFGI => {
          const oControl = oFGI.getControl();
          if (oControl && oControl.getValue) {
            const sValue = oControl.getValue().trim();
            if (sValue) {
              // Add both filters for 'workCenter' and 'description' using OR
              const oWorkCenterFilter = new Filter('workCenter', FilterOperator.Contains, sValue);
              const oDescriptionFilter = new Filter('description', FilterOperator.Contains, sValue);
              aFilters.push(
                new Filter({
                  filters: [oWorkCenterFilter, oDescriptionFilter],
                  and: false // OR condition
                })
              );
            }
          }
        });

        // Apply the combined filter to the table
        if (this.oworkCenterVHDia) {
          this.oworkCenterVHDia.getTableAsync().then(oTable => {
            const oBinding = oTable.getBinding('rows');
            if (oBinding) {
              oBinding.filter(aFilters); // Apply filters
            }
          });
        }
      },

      onworkCenterVHDiaOKPress: function(oEvent) {
        var aSelectedItems = oEvent.getParameter('tokens');

        // No WorkCenter selected
        if (aSelectedItems.length < 1) {
          return;
        }

        // Close dialog
        this.oworkCenterVHDia.close();

        // Get the selected WorkCenter
        var sSelectedWorkCenter = aSelectedItems[0].getKey();

        // Set the selected WorkCenter in the model
        var oViewModel = this.getView().getModel('data');
        oViewModel.setProperty('/workCenter', sSelectedWorkCenter);

        // Enable the Operator input field
        oViewModel.setProperty('/isOperatorEnabled', true);

        // Fetch user IDs (operators) for the selected WorkCenter
        this._fetchOperatorsForWorkCenter(sSelectedWorkCenter);
      },

      _fetchOperatorsForWorkCenter: function(sWorkCenter) {
        // Get WorkCenter data model
        var oWorkCenterModel = this.getView().getModel('workCenterData');
        var aWorkCenters = oWorkCenterModel.getData();

        // Find the WorkCenter object by its ID (workCenter)
        var oSelectedWorkCenter = aWorkCenters.find(function(oWorkCenter) {
          return oWorkCenter.workCenter === sWorkCenter;
        });

        if (oSelectedWorkCenter) {
          //   // Extract the user assignments (operators) for the selected WorkCenter
          //   var aOperators = oSelectedWorkCenter.userAssignments.map(function (oAssignment) {
          //     return oAssignment.userId;
          //   });

          var aOperators = []; // Initialize an empty array
          oSelectedWorkCenter.userAssignments.map(function(oAssignment) {
            var operator = {
              userId: oAssignment.userId
            };
            aOperators.push(operator);
          });

          // Update the operator list and selected user ID in the model
          var oViewModel = this.getView().getModel('data');
          oViewModel.setProperty('/operators', aOperators); // Set available operators in model

          // // Optionally, you can set the first operator as the default selected operator
          // if (aOperators.length > 0) {
          //   oViewModel.setProperty("/userId", aOperators[0]); // Set default selected user ID
          // }
        }
      },

      onworkCenterVHDiaCancelPress: function() {
        var oViewModel = this.getView().getModel('data');

        this.oworkCenterVHDia.close();

        // Reset Operator and disable the Operator input field

        oViewModel.setProperty('/userId', '');

        oViewModel.setProperty('/operators', []);

        oViewModel.setProperty('/isOperatorEnabled', false);
      },

      onOperatorValueHelpRequest: function() {
        var oViewModel = this.getView().getModel('data'); // The model with operators

        if (!this.oOperatorVHDia) {
          // Load the fragment for Operator VHD

          this.oOperatorVHDia = sap.ui.xmlfragment(
            'company.custom.plugins.realtimedashboard.realtimedashboard.view.fragments.OperatorValueHelpRequest',
            this
          );

          this.getView().addDependent(this.oOperatorVHDia);

          // Configure table columns in the dialog

          this.oOperatorVHDia.getTableAsync().then(function(oTable) {
            oTable.addColumn(
              new sap.ui.table.Column({
                label: new sap.m.Text({ text: 'User ID' }),

                template: new sap.m.Text({ text: '{data>userId}' })
              })
            );

            // Bind data to the dialog
            // Bind data to the table
            oTable.setModel(oViewModel);
            oTable.bindRows('data>/operators');
          });
        }

        this.oOperatorVHDia.open();
      },
      onOperatorVHDiaSearch: function(oEvent) {
        var oFilterBar = oEvent.getSource(),
          aFilterGroupItems = oFilterBar.getFilterGroupItems(),
          aFilters = [];

        //Create filters based on selected input Values

        aFilters = aFilterGroupItems
          .map(function(oFGI) {
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
          var oRowBindingCtx = oTable.getBinding('rows');

          //    oRowBindingCtx = oTable.getBinding("rows");

          oRowBindingCtx.filter(aFilters);
        });
      },

      onOperatorVHDiaOKPress: function(oEvent) {
        var aSelectedItems = oEvent.getParameter('tokens');

        //No order selected

        if (aSelectedItems.length < 1) {
          return;
        }

        //Close dialog

        this.oOperatorVHDia.close();

        //Get Batch info for selected resource

        var sSelectedOperator = aSelectedItems[0].getKey();

        //Set the selected order to model

        var oViewModel = this.getView().getModel('data');

        oViewModel.setProperty('/userId', sSelectedOperator);

        oViewModel.setProperty('/isOperatorSelected', true);
      },

      onOperatorVHDiaCancelPress: function(oEvent) {
        this.oOperatorVHDia.close();
      },

      onCardTitlePress: function(oEvent) {
        var oSource = oEvent.getSource(),
          oContext = oSource.getBindingContext('data'),
          oSelectedResource = oContext.getObject(),
          oPodSelectionModel = this.getPodSelectionModel();

        //Set the selected resource data to the PodSelectionModel

        oPodSelectionModel.stelSelectedResourceData = oSelectedResource;

        this.navigateToPage('CHARTPAGE');
      },

      onSearch: function() {
        var oView = this.getView();

        var aFilters = [];

        // Get values directly from the input fields

        var sResource = oView.byId('IdResourceInput').getValue();

        var sOperator = oView.byId('IdOperatorInput').getValue();

        var sOrder = oView.byId('IdOrderInput').getValue();

        var sComponent = oView.byId('IdComponentInput').getValue();

        var sWorkCenter = oView.byId('IdworkCenterInput').getValue();

        // Add filters based on the input values

        if (sResource) {
          aFilters.push(new sap.ui.model.Filter('resource', sap.ui.model.FilterOperator.Contains, sResource));
        }

        if (sOperator) {
          aFilters.push(new sap.ui.model.Filter('customData/OPERATOR', sap.ui.model.FilterOperator.Contains, sOperator));
        }

        if (sOrder) {
          aFilters.push(new sap.ui.model.Filter('customData/ORDER', sap.ui.model.FilterOperator.Contains, sOrder));
        }

        if (sComponent) {
          aFilters.push(new sap.ui.model.Filter('customData/MATERIAL', sap.ui.model.FilterOperator.Contains, sComponent));
        }

        if (sWorkCenter) {
          aFilters.push(new sap.ui.model.Filter('customData/WORK_CENTER', sap.ui.model.FilterOperator.Contains, sWorkCenter));
        }

        var oPanelContainer = oView.byId('tileContainer');

        oPanelContainer.getItems().forEach(item => item.getBinding('content').filter(aFilters));

        oView.getModel('data').refresh(true);
      },

      onClearFilters: function() {
        var oView = this.getView();

        // Clear the values in the input fields

        oView.byId('IdResourceInput').setValue('');

        oView.byId('IdOperatorInput').setValue('');

        oView.byId('IdOrderInput').setValue('');

        oView.byId('IdComponentInput').setValue('');

        oView.byId('IdworkCenterInput').setValue('');

        // Reset any additional model properties

        var oModel = oView.getModel('data');
        // Clear any filters applied to cards
        oModel.setProperty('/lineItems', []);
        oModel.setProperty('/items', []);

        if (oModel) {
          oModel.setProperty('/selectedResource', '');

          oModel.setProperty('/isResourceSelected', false);

          oModel.setProperty('/controls/OperatorInput/valueState', 'None');

          oModel.setProperty('/controls/orderInput/valueState', 'None');

          oModel.setProperty('/controls/ResourceInput/valueState', 'None');
        }
        // Fetch the data again as during the initial load
        this._getWorkCenterAssignments(); // Fetch resources and work centers again
      },

      onAfterRendering: function() {
        // this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
        // this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);
        // this.getView().byId("headerTitle").setText(this.getConfiguration().title);
        // this.getView().byId("textPlugin").setText(this.getConfiguration().text);
      },

      onBeforeRenderingPlugin: function() {},

      isSubscribingToNotifications: function() {
        var bNotificationsEnabled = true;

        return bNotificationsEnabled;
      },

      getCustomNotificationEvents: function(sTopic) {
        //return ["template"];
      },

      getNotificationMessageHandler: function(sTopic) {
        //if (sTopic === "template") {
        //    return this._handleNotificationMessage;
        //}
        return null;
      },

      _handleNotificationMessage: function(oMsg) {
        var sMessage = "Message not found in payload 'message' property";
        if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
          for (var i = 0; i < oMsg.parameters.length; i++) {
            switch (oMsg.parameters[i].name) {
              case 'template':
                break;
              case 'template2':
            }
          }
        }
      },

      onExit: function() {
        PluginViewController.prototype.onExit.apply(this, arguments);
      }
    });
  }
);
