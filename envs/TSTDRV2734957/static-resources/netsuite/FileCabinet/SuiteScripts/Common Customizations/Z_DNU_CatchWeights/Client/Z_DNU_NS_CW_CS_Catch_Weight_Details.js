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
 * @NScriptType ClientScript
 * @NApiVersion 2.0
 */
define(['N/currentRecord', 'N/search', '../Library/NS_CW_Constants', '../Library/NS_CW_Lib'], function(currentRecordModule, search, constants, lib) {
    var Helper = {};

    Helper.showNoParentError = function() {
        try {
            require(['N/ui/dialog'], function(dialog) {
                dialog.alert({
                    title: 'Invalid Window State',
                    message: 'An error occurred retrieving the calling page.'
                });
            });
        } catch (e) {
            console.log(JSON.stringify(e));
        }
    }

    Helper.getSublistId = function(context) {
        var parent = window.parent;
        var recordType = parent.nlapiGetRecordType();
        var sublistId = (recordType == 'inventoryadjustment' || recordType == 'inventorytransfer') ? 'inventory' : 'item';
        return sublistId;
    }

    Helper.getQuantityFieldId = function(context) {
        var parent = window.parent;
        var recordType = parent.nlapiGetRecordType();
        var quantityId = (recordType == 'inventoryadjustment' || recordType == 'inventorytransfer') ? 'adjustqtyby': 'quantity';
        return quantityId;
    }

    Helper.getLotsWithQuantity = function(context) {
        console.log('getLotsWithQuantity');
        var parent = window.parent;

        if (!parent) {
            Helper.showNoParentError();
            return;
        }

        var sublistId = Helper.getSublistId();
        var recordType = parent.nlapiGetRecordType();

        var lots = [];

        // Check if the line is a lot?
        var inventoryDetail = parent.nlapiViewCurrentLineItemSubrecord(sublistId, 'inventorydetail');

        if (inventoryDetail) {
            var inventoryNumberFieldId = 'issueinventorynumber';
            if (recordType == 'itemreceipt') {
                inventoryNumberFieldId = 'receiptinventorynumber';
            }
            if (recordType == 'inventoryadjustment') {
                var currentLine = parent.nlapiGetCurrentLineItemIndex('inventory');
                var lineQuantity = parent.nlapiGetLineItemValue('inventory', 'adjustqtyby', currentLine)
                if (lineQuantity > 0) {
                    inventoryNumberFieldId = 'receiptinventorynumber';
                }
            }
            // Get the inventory detail subrecord
            var lines = inventoryDetail.getLineItemCount('inventoryassignment');
            var lotCache = {};

            for (var x = 1; x <= lines; x++) {
                inventoryDetail.selectLineItem('inventoryassignment', x);

                var lot = inventoryDetail.getCurrentLineItemValue('inventoryassignment', inventoryNumberFieldId);

                var quantity = inventoryDetail.getCurrentLineItemValue('inventoryassignment', 'quantity');

                if (!lotCache[lot]) {
                    lotCache[lot] = {quantity: 0};
                }
                var cache = lotCache[lot];
                cache.quantity += parseFloat(quantity);
            }

            Object.keys(lotCache).forEach(function (lot) {
                var cache = lotCache[lot];
                lots.push({
                    lot: lot,
                    quantity: cache.quantity
                });
            })
        }

        return lots;
    }

    Helper.getCatchWeightDetails = function(context) {
        var parent = window.parent;

        if (!parent) {
            Helper.showNoParentError();
            return;
        }

        var catchWeightDetails = parent.nlapiGetCurrentLineValue(
            Helper.getSublistId(context),
            constants.TransactionLineFields.CATCH_WEIGHT_DETAILS
        );
    }

    Helper.passesQuantityCheck = function() {
        console.log('passesQuantityCheck');
        var currentRecord = currentRecordModule.get();

        var lots = Helper.getLotsWithQuantity();
        var lotsCache = JSON.parse(currentRecord.getValue('lots') || '');
        var lotids = JSON.parse(currentRecord.getValue('lotids'));

        console.log('lots: ' + JSON.stringify(lots));
        console.log('lotsCache: ' + lotsCache);

        var passed = true;

        if (lots.length > 0) {
            lots.forEach(function (lot, lotIndex) {
                var realIndex = lotIndex;
                var lotLabel = lot.lot;

                if (lotids.length > 0) {
                    realIndex = lotids.indexOf(lot.lot);
                    lotLabel = lotsCache[realIndex];
                }

                console.log('lot: ' + JSON.stringify(lot));
                console.log('lotIndex: ' + realIndex);
                var lotWeight = currentRecord.getValue('lotweight_'+realIndex);
                console.log('lotWeight: ' + lotWeight);
                var lotQuantity = currentRecord.getLineCount({
                    sublistId: 'custlist_' + realIndex
                });
                if(lotWeight && lotQuantity == 0){
                    console.log('lot weight was entered and no case based weight. quantity check not needed');
                    passed = true;
                } else if (lotQuantity != Math.abs(lot.quantity)) {
                    passed = false;
                    var recordType = window.parent.nlapiGetRecordType();
                    if (recordType == 'inventoryadjustment') {
                        // For whatever reason the N/ui/dialog module is not valid in inventoryadjustment
                        alert(['Incorrect Quantity: ', JSON.stringify(lot)].join(''));
                    } else {
                        require(['N/ui/dialog'], function(dialog) {
                            dialog.alert({
                                title: 'Incorrect Quantity',
                                message: ['Lot', lotLabel, 'expecting quantity of ',parseInt(lot.quantity)].join(' ')
                            });
                        });
                    }
                }
            });
        } else {
            var lotSublistId = 'custlist_0';
            var lotQuantity = currentRecord.getLineCount({
                sublistId: lotSublistId
            });
            var lineUnitQuantity = currentRecord.getValue({
                fieldId: 'quantity'
            });
            return lotQuantity == lineUnitQuantity;
        }

        return passed;
    }

    Helper.getWeightUnitsFromItem = function(item) {
        var weightUnit = search.lookupFields({type: 'item', id: item, columns: 'weightunit'}).weightunit[0].text;
        return weightUnit;
    }

    Helper.showDialog = function(options) {
        require(['N/ui/dialog'], function(dialog) {
            dialog.alert(options);
            wasShown = true;
        });
    }
    Helper.recalculateWeight = function(context){
        var totalLines = 0;
        var catchWeight = 0;
        var lots = JSON.parse(context.currentRecord.getValue('lots'));
        if (lots.length == 0) lots.push(constants.NO_LOT);
        lots.forEach(function (lot, index) {
            var lotSublistId = 'custlist_0';
            if (lot != constants.NO_LOT) {
                lotSublistId = 'custlist_' + index;
            }
            var lotWeight = 0;
            console.log('lotSublistId: ' + lotSublistId);
            var lines = context.currentRecord.getLineCount({
                sublistId: lotSublistId
            });
            if (lines == 0){
                nlapiDisableField('lotweight_'+index, false);
                nlapiDisableField('lotgs1data_' + index, false);
            } else {
                nlapiDisableField('lotweight_'+index, true);
                nlapiDisableField('lotgs1data_' + index, true);
            }
            var currentLotWeight = context.currentRecord.getValue('lotweight_' + index);
            var neededLotQuantity = context.currentRecord.getValue('lotquantity_' + index);
            if(currentLotWeight && 
                lines == 0){
                catchWeight += parseFloat(currentLotWeight)
                totalLines += neededLotQuantity;
                return true;
            } else{
                totalLines += lines;
                for (var x = 0; x < lines; x++) {
                    var weight = context.currentRecord.getSublistValue({
                        sublistId: lotSublistId,
                        fieldId: 'weight',
                        line: x
                    });
                    console.log('x: ' + weight);
                    if (!weight) continue;
                    catchWeight += parseFloat(weight);
                    lotWeight += parseFloat(weight);
                }
                context.currentRecord.setValue({
                    fieldId: 'lotweight_' + index,
                    value: lotWeight,
                    ignoreFieldChange: true
                });
            }
        });
        catchWeight = parseFloat(catchWeight).toFixed(5);
        context.currentRecord.setValue({
            fieldId: 'linesentered',
            value: totalLines,
            ignoreFieldChange: true
        });
        context.currentRecord.setValue({
            fieldId: 'catchweight',
            value: catchWeight,
            ignoreFieldChange: true
        });
    }
    var Client = {};

    Client.pageInit = function(context) {
        var parent = window.parent;

        if (parent) {
            var sublistId = Helper.getSublistId();
            var detailsString = parent.nlapiGetCurrentLineItemValue(sublistId, constants.TransactionLineFields.CATCH_WEIGHT_DETAILS);
            var parentQuantity;
            if (sublistId == 'inventory') {
                parentQuantity = parent.nlapiGetCurrentLineItemValue(sublistId, 'adjustqtyby');
            }
            var details = lib.parseCatchWeightDetails(detailsString);
            console.log('detailsString: ' + detailsString);
            console.log('details: ' + JSON.stringify(details));
            console.log('details count: ' + details.length);
            var lots = JSON.parse(context.currentRecord.getValue('lots') || '');
            var lotids = JSON.parse(context.currentRecord.getValue('lotids'));
            console.log('lotids' + lotids);
            var lotsWithQuantity = Helper.getLotsWithQuantity(context);
            console.log('lotsWithQuantity: ' + JSON.stringify(lotsWithQuantity));
            var totalLines = 0;
            var catchWeight = 0;
            var currentRecord = context.currentRecord;
            var item = currentRecord.getValue('item');
            var weightUnit = Helper.getWeightUnitsFromItem(item);
            Helper.loading = true;

            if (lotsWithQuantity.length > 1) {
                lotsWithQuantity.forEach(function (lot, index) {
                    var realIndex = index;

                    if (lotids.length > 0) {
                        realIndex = lotids.indexOf(lot.lot);
                    }

                    context.currentRecord.setValue({
                        fieldId: 'lotquantity_' + realIndex,
                        value: parseInt(lot.quantity),
                        ignoreFieldChange: true
                    });
                });
            }
            var uniqueLot = {};
            details.forEach(function (detail) {
                var lot = detail.lot;
                uniqueLot[lot] = (uniqueLot[lot] || 0) + 1
            });
            details.forEach(function (detail) {
                var lot = detail.lot;
                var otherGs1 = detail.otherGs1;
                var weight = parseFloat(detail.weight);
                var totalLotLines = uniqueLot[lot];
                if (parentQuantity && parentQuantity < 0) {
                    weight = -weight;
                }

                var sublistId = 'custlist_0';
                var lotWeightId = 'lotweight'
                var lotGS1Id = 'lotgs1data'

                console.log('lot: ' + lot);

                if (lot) {
                    var indexOfLot = lots.indexOf(lot);
                    if (indexOfLot >= 0) {
                        sublistId = 'custlist_' + indexOfLot;
                        lotWeightId = 'lotweight_' + indexOfLot;
                        lotGS1Id = 'lotgs1data_' + indexOfLot;
                        lotQuantityId = 'lotquantity_' + indexOfLot;
                    } else {
                        // Wasn't found so nothing to pre-populate
                        return;
                    }
                }
                console.log('sublistId: ' + sublistId);
                if(totalLotLines > 1){
                    context.currentRecord.selectNewLine({
                        sublistId: sublistId
                    });
    
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'weight',
                        value: weight
                    });
    
                    context.currentRecord.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'gs1',
                        value: otherGs1
                    });
    
                    context.currentRecord.commitLine({
                        sublistId: sublistId
                    });
    
                    totalLines++;

                } else if(totalLotLines == 1){
                    context.currentRecord.setValue({
                        fieldId: lotGS1Id,
                        value: otherGs1
                    });
                    context.currentRecord.setValue({
                        fieldId: lotWeightId,
                        value: weight
                    });
                    lotQuantity = context.currentRecord.getValue(lotQuantityId);
                    totalLines += Math.abs(lotQuantity);
                }
                catchWeight += weight;
            });

            catchWeight = catchWeight.toFixed(5);

            context.currentRecord.setValue({
                fieldId: 'linesentered',
                value: totalLines,
                ignoreFieldChange: true
            });
    
            context.currentRecord.setValue({
                fieldId: 'catchweight',
                value: catchWeight,
                ignoreFieldChange: true
            });

            currentRecord.setValue({
                fieldId: 'weightunit',
                value: weightUnit,
                ignoreFieldChange: true
            });

            Helper.loading = false;
        } else {
            alert('we do not have a parent');
        }
    }
    Client.fieldChanged = function(context){
        var lots = JSON.parse(context.currentRecord.getValue('lots'));
        if (lots.length == 0) lots.push(constants.NO_LOT);
        if(Helper.loading)
        return;
        if(!Helper.loading){
            Helper.recalculateWeight(context)
        }
    }
    Client.sublistChanged = function(context) {
        if (Helper.loading) return;
        if(!Helper.loading){
            Helper.recalculateWeight(context);
        }
    }
    Client.submit = function() {
        console.log('submit');
        if (Helper.passesQuantityCheck()) {
            var parent = window.parent;

            var currentRecord = currentRecordModule.get();

            if (parent) {
                var sublistId = Helper.getSublistId();
                var lots = JSON.parse(currentRecord.getValue('lots'));
                if (lots.length == 0) lots.push(constants.NO_LOT);
                console.log('lots: ' + JSON.stringify(lots));
                var details = [];
                lots.forEach(function (lot, index) {
                    var lotSublistId = 'custlist_0';
                    if (lot != constants.NO_LOT) {
                        lotSublistId = 'custlist_' + index;
                    }

                    console.log('lotSublistId: ' + lotSublistId);

                    var lotLines = currentRecord.getLineCount({
                        sublistId: lotSublistId
                    });

                    console.log('lotLines: ' + lotLines);

                    if(lotLines == 0){
                        var detail = {};
                        detail.lot = lot;
                        detail.weight = currentRecord.getValue({
                            fieldId: 'lotweight_'+index
                        });
                        detail.otherGS1 = currentRecord.getValue({
                            fieldId: 'lotgs1data_'+ index
                        });
                        details.push(detail);
                    } else {
                        for (var x = 0; x < lotLines; x++) {
                            var detail = {};
                            if (lot != constants.NO_LOT) {
                                detail.lot = lot;
                            }

                            detail.weight = currentRecord.getSublistValue({
                                sublistId: lotSublistId,
                                fieldId: 'weight',
                                line: x
                            });

                            detail.otherGs1 = currentRecord.getSublistValue({
                                sublistId: lotSublistId,
                                fieldId: 'gs1',
                                line: x
                            });
                            details.push(detail);
                        }
                    }
                });

                var item = currentRecord.getValue('item');
                var weightUnit = Helper.getWeightUnitsFromItem(item);
                console.log('details: ' + JSON.stringify(details));
                var catchWeight = currentRecord.getValue('catchweight');
                var serialized = lib.stringifyCatchWeightDetails({
                    details: details,
                    weightUnit: weightUnit
                });
                parent.nlapiSetCurrentLineItemValue(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, catchWeight);
                parent.nlapiSetCurrentLineItemValue(sublistId, constants.TransactionLineFields.CATCH_WEIGHT_DETAILS, serialized);
                var line = parent.nlapiGetCurrentLineItemIndex(sublistId);
                parent.nlapiSetLineItemDisabled(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, true, line);
                parent.cwDetailPopup.close();
            } else {
                Helper.showNoParentError();
            }
        } else {
            Helper.showDialog({
                title: 'Incorrect Quantity',
                message: 'Please make sure the number of lines entered matches the line unit quantity.'
            });
        }
    }

    Client._clearDetails = function() {
        console.log('_clearDetails');
        var parent = window.parent;
        var sublistId = Helper.getSublistId();

        if (parent) {
            var sublistId = Helper.getSublistId();
            parent.nlapiSetCurrentLineItemValue(sublistId, constants.TransactionLineFields.CATCH_WEIGHT_DETAILS, '');
            var line = parent.nlapiGetCurrentLineItemIndex(sublistId);
            parent.nlapiSetLineItemDisabled(sublistId, constants.TransactionLineFields.CATCH_WEIGHT, false, line);
            parent.cwDetailPopup.close();
        }
    }

    Client.clearDetails = function() {
        var recordType = window.parent.nlapiGetRecordType();
        var message = 'Clearing details will remove all details from the line. OK to proceed?';
        if (recordType == 'inventoryadjustment') {
            // For whatever reason the N/ui/dialog module is not valid in inventoryadjustment
            if (confirm(message)) {
                Client._clearDetails();
            }
        } else {
            require(['N/ui/dialog'], function(dialog) {
                dialog.confirm({
                    title: 'Clear Details',
                    message: message
                }).then(Client._clearDetails());
            });
        }
    }

    return Client;
})