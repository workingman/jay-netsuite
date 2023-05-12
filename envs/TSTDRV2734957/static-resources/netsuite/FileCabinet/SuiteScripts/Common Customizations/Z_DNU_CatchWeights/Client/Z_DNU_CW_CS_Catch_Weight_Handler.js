/**
 * Copyright © 2020, Oracle and/or its affiliates. All rights reserved.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ('Confidential Information').
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
define(['N/url', 'N/record', 'N/search', 'N/currentRecord', '../Library/NS_CW_Constants', '../Library/NS_CW_Lib'], function(url, record, search, currentRecordModule, constants, lib) {
    var Helper = {};
    //custom function to check tolerances
    Helper.toleranceCheck = function(quantity, standardWeightPerQuantity, lineTolerance, catchWeight){
        var trueTolerance = lineTolerance/100;
        var totalNominalWeight = (standardWeightPerQuantity)*(quantity);
        var threshold = totalNominalWeight*trueTolerance;
        var maxWeight = totalNominalWeight + threshold;
        var minimumWeight = totalNominalWeight - threshold;
        if (catchWeight < minimumWeight ||
            catchWeight > maxWeight){
                alert('The Catch Weight entered of: ' + catchWeight + ' is outside of the range of tolerance. Minimum: ' + minimumWeight + ' Maximum: ' + maxWeight);
        }
        return true;
    }

    Helper.openCwDetail = function(params) {
        var suitelet = url.resolveScript({
            scriptId: 'customscript_ns_cw_sl_details',
            deploymentId: 'customdeploy_ns_cw_sl_details',
            params: params
        });

        var title = 'Catch Weight Details';
        var intWidth = 500;
        var intHeight = 500;

        window.cwDetailPopup = nlExtOpenWindow(suitelet, title, intWidth, intHeight, this, true, null);
    }

    Helper.getSublistId = function(context) {
        var currentRecord = context.currentRecord;
        var recordType = currentRecord.type;
        var sublistId = (recordType == 'inventoryadjustment' || recordType == 'inventorytransfer') ? 'inventory' : 'item';
        return sublistId;
    }

    Helper.getQuantityFieldId = function(context) {
        var currentRecord = context.currentRecord;
        var recordType = currentRecord.type;
        console.log('recordType: ' + recordType);
        var quantityId = (recordType == 'inventoryadjustment' || recordType == 'inventorytransfer') ? 'adjustqtyby': 'quantity';
        return quantityId;
    }

    Helper.handleEditDetailsFieldChange = function(context) {
        try {
            if (context.fieldId != constants.TransactionLineFields.EDIT_CATCH_WEIGHT_DETAILS) return;
            if (Client.showing) return;
            Client.showing = true;

            var currentRecord = context.currentRecord;
            var quantityField = Helper.getQuantityFieldId(context);

            console.log('quantityField: ' + quantityField);

            var sublistId = context.sublistId;

            currentRecord.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.EDIT_CATCH_WEIGHT_DETAILS,
                value: false
            });
    
            console.log('here');

            var item = currentRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'item'
            }) || nlapiGetLineItemValue(sublistId, 'item', context.line+1);

            var rawQuantity = currentRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: quantityField
            });

            var quantity = Math.abs(rawQuantity);
    
            var lots = [];
            var lotInternalIds = [];
            var hasInventoryDetail = currentRecord.hasCurrentSublistSubrecord({
                sublistId: sublistId,
                fieldId: 'inventorydetail'
            });
    
            if (hasInventoryDetail) {
                var lotCache = {};
                
                // See if the item is a lot item, in which case we need the inventory detail subrecord
                var inventoryDetail = currentRecord.getCurrentSublistSubrecord({
                    sublistId: sublistId,
                    fieldId: 'inventorydetail'
                });

                var inventoryNumberFieldId = 'issueinventorynumber';
                if (currentRecord.type == record.Type.ITEM_RECEIPT) {
                    inventoryNumberFieldId = 'receiptinventorynumber';
                } else if (currentRecord.type == record.Type.INVENTORY_ADJUSTMENT && rawQuantity > 0) {
                    // Positive adjustment changes number field to same as item receipt
                    inventoryNumberFieldId = 'receiptinventorynumber';
                }
                
                var lines = inventoryDetail.getLineCount({
                    sublistId: 'inventoryassignment'
                });

                console.log('inventoryassignment lines', lines);
    
                for (var x = 0; x < lines; x++) {
                    inventoryDetail.selectLine({
                        sublistId: 'inventoryassignment',
                        line: x
                    });
    
                    var lot = inventoryDetail.getCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: inventoryNumberFieldId
                    });

                    // This is easy way to prevent duplicates
                    lotCache[lot] = true;
                }

                lots = Object.keys(lotCache);

                var getLotNames = currentRecord.type != record.Type.ITEM_RECEIPT;

                if (currentRecord.type == record.Type.INVENTORY_ADJUSTMENT && rawQuantity > 0) {
                    // Adjustment is adding inventory so lots are provided already as names, not internal IDs
                    getLotNames = false;
                }

                console.log('lots', JSON.stringify(lots));

                if (getLotNames) {
                    // We have internal IDs for lots so we need to run a quick search to get the actual lots
                    var columns = [search.createColumn({name: 'inventorynumber'})];
                    var filters = [search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: lots})];
                    var lotSearch = search.create({type: 'inventorynumber', columns: columns, filters: filters});
                    var newLots = [];
                    lotSearch.run().getRange(0,1000).forEach(function (result) {
                        // Push them so they're in the same order
                        newLots.push(result.getValue('inventorynumber'));
                        lotInternalIds.push(result.id);
                    });
                    lots = newLots;

                    console.log('newLots', JSON.stringify(lots));
                }
            }

            Helper.openCwDetail({
                item: item,
                quantity: quantity,
                lots: JSON.stringify(lots),
                lotInternalIds: JSON.stringify(lotInternalIds)
            });
    
            return false;
        } finally {
            Client.showing = false;
        }
    }

    var detailsSemiphore = false;

    Helper.handleDetailsFieldChange = function(context) {
        if (context.fieldId != constants.TransactionLineFields.CATCH_WEIGHT_DETAILS) return;
        if (detailsSemiphore) return;

        var currentRecord = context.currentRecord;
        var sublistId = Helper.getSublistId(context);
        var line = context.line;
        var catchWeightDetails = currentRecord.getCurrentSublistValue({
            sublistId: sublistId,
            fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS
        });
        if (!catchWeightDetails) {
            // Enable Catch Weight field
            nlapiSetLineItemDisabled(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, false, line+1);
            return;
        }

        var item = currentRecord.getCurrentSublistValue({
            sublistId: sublistId,
            fieldId: 'item'
        });

        if (!item) {
            // We tried to retrieve the item but can't using normal sublist method
            var lineIndex = currentRecord.getCurrentSublistIndex({
                sublistId: sublistId
            });
    
            item = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'item',
                line: lineIndex
            });
        }

        var convertResults = lib.convertWeightUnitsIfNeeded({
            detailsString: catchWeightDetails,
            item: item
        });

        if (convertResults.converted) {
            // Show message to user
            Helper.showDialog({
                title: 'Weight Conversion',
                message: 'Details were converted to match Shipping Unit defined on the Item.'
            });

            // Set the Catch Weight Details
            detailsSemiphore = true;

            currentRecord.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS,
                value: convertResults.convertedDetailsString
            });

            detailsSemiphore = false;
        }

        currentRecord.setCurrentSublistValue({
            sublistId: sublistId,
            fieldId: constants.TransactionLineFields.CATCH_WEIGHT,
            value: convertResults.totalWeight
        });
        nlapiSetLineItemDisabled(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, true, line+1);
    }

    Helper.handleCatchWeightFieldChange = function(context) {
        if(context.fieldId !== constants.TransactionLineFields.CATCH_WEIGHT) return;

        var sublistId = Helper.getSublistId(context);
        var currentRecord = context.currentRecord;
        var currentLine = context.line;
        var recordType = currentRecord.type;
        var quantityField = Helper.getQuantityFieldId(context);
        
        if(context.fieldId == constants.TransactionLineFields.CATCH_WEIGHT){
            var currentCatchWeight = currentRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT,
                line: currentLine
            });
            if(currentCatchWeight){
                var lineTolerance = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_cw_tolerance',
                    line: currentLine
                });
                var quantity = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: quantityField,
                    line: currentLine
                });
                var standardWeightPerQuantity = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_cw_avg_wght',
                    line: currentLine
                });
                Helper.toleranceCheck(quantity, standardWeightPerQuantity, lineTolerance, currentCatchWeight);
                if(recordType == 'itemreceipt'){
                    var pricePerPricingUnit = currentRecord.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_rate_per_pricing_unit_pur',
                        line: currentLine
                    });
                    var newRate = ((currentCatchWeight)*(pricePerPricingUnit))/quantity;
                    currentRecord.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'rate',
                        value: newRate,
                        line: currentLine
                    });
                }
            }
        }
    }

    Helper.showDialog = function(options) {
        console.log('Helper.showDialog: ' + JSON.stringify(options));
        var currentRecord = currentRecordModule.get();
        if (currentRecord.type == 'inventoryadjustment') {
            alert([options.title, options.message].join(': '));
        } else {
            require(['N/ui/dialog'], function(dialog) {
                dialog.alert(options);
            });
        }
    }

    var Client = {};

    Client.fieldChanged = function(context) {
        Helper.handleEditDetailsFieldChange(context);
        Helper.handleDetailsFieldChange(context);
        Helper.handleCatchWeightFieldChange(context);
    }

    Client.pageInit = function(context) {
        try {
            Helper.runningInit = true;
            var currentRecord = context.currentRecord;
            var sublistId = Helper.getSublistId(context);
            var recordType = currentRecord.type
            var lines = currentRecord.getLineCount({sublistId: sublistId});
            var pricingRateId = (recordType == 'itemfulfillment') ? 'custcol_cw_rate_per_pricing_unit_sal' : 'custcol_cw_rate_per_pricing_unit_pur'; 
            for (var x = 0; x < lines; x++) {
                currentRecord.selectLine({
                    sublistId: sublistId,
                    line: x
                });
                var catchWeightDetails = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS
                });
                var isCatchWeightItem = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: constants.TransactionLineFields.CATCH_WEIGHT_ITEM,
                });
                if ((catchWeightDetails && catchWeightDetails.trim()) || !isCatchWeightItem) {
                    // Disable the Catch Weight field because we want the user to use details
                    nlapiSetLineItemDisabled(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, true, x+1);
                }
                nlapiSetLineItemDisabled(sublistId, pricingRateId, true, (x+1));
                if(isCatchWeightItem && recordType == 'itemreceipt'){
                    nlapiSetLineItemDisabled('item', 'rate', true, (x+1));
                }
                if (catchWeightDetails && catchWeightDetails.indexOf('\u0005') >= 0) {
                    catchWeightDetails = catchWeightDetails.replace('\u0005', '\n');
                    currentRecord.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS,
                        value: catchWeightDetails
                    });
                }
            }
        } finally {
            Helper.runningInit = false;
        }
    }

    Client.validateLine = function(context) {
        try {
            if (Helper.validating) return true;
            Helper.validating = true;
            var currentRecord = context.currentRecord;
            var sublistId = Helper.getSublistId(context);
            // Make sure if details are provided, the lots and the weights match the other fields
            var catchWeightDetails = currentRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS
            });
            if (!catchWeightDetails) return true;

            var parsedDetails = lib.parseCatchWeightDetails(catchWeightDetails);
            if (parsedDetails.length == 0) {
                return true;
            }
            var totalWeight = 0;
            parsedDetails.forEach(function (detail) {
                totalWeight += detail.weight;
            });

            var catchWeight = currentRecord.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT
            });

            console.log(JSON.stringify({
                totalWeight: totalWeight.toFixed(5),
                catchWeight: catchWeight.toFixed(5)
            }));
            if (catchWeight && totalWeight.toFixed(5) != Math.abs(catchWeight).toFixed(5)) {
                Helper.showDialog({
                    title: 'Weight Error',
                    message: 'Weight from Catch Weight Details must match Catch Weight.'
                });
                return false;
            }
            return true;
        } finally {
            Helper.validating = false;
        }
    }

    Client.saveRecord = function(context) {
        var currentRecord = context.currentRecord;
        var sublistId = Helper.getSublistId(context);
        var quantityField = Helper.getQuantityFieldId(context);
        var lines = currentRecord.getLineCount({
            sublistId: sublistId
        });
        var linesWithErrors = [];
        for (var x = 0; x < lines; x++) {
            var quantity = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: quantityField,
                line: x
            });

            if (!quantity) {
                // Line has zero or no quantity so skip
                continue;
            }

            var isCatchWeightItem = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_ITEM,
                line: x
            });
            if (!isCatchWeightItem) {
                // Not a Catch Weight Item so skip
                continue;
            }

            // Make sure Catch Weight is populated for the line
            var catchWeight = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT,
                line: x
            });

            if (!catchWeight) {
                linesWithErrors.push({
                    line: x,
                    catchWeight: catchWeight
                });
                continue;
            }

            // Next, check if we have details the weight in the details match the Catch Weight
            var catchWeightDetails = currentRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS,
                line: x
            });

            var parsedDetails = lib.parseCatchWeightDetails(catchWeightDetails);

            if (parsedDetails.length == 0) {
                // There are no details so skip this line
                continue;
            }

            // Get the total weight from the Catch Weight Details
            var totalWeight = 0;
            parsedDetails.forEach(function (detail) {
                totalWeight += detail.weight;
            });
            totalWeight = totalWeight.toFixed(5);
            
            if (totalWeight != Math.abs(catchWeight)) {
                linesWithErrors.push({
                    line: x,
                    catchWeight: catchWeight
                });
            }
        }
        if (linesWithErrors.length > 0) {
            Helper.showDialog({
                title: 'Catch Weight Validation',
                message: 'Please review the following lines for Catch Weight Details:\n<ul>' + linesWithErrors.map(function (line) {
                    return '<li>' + (line.line+1) + '</li>';
                }).join('\n') + '</ul>'
            });
            return false;
        } else {
            return true;
        }
    }

    return Client;
})