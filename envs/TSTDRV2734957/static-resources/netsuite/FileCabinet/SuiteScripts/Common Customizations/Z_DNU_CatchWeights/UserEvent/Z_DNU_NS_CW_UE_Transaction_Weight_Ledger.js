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
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', '../Library/NS_CW_Constants', '../Library/NS_CW_Lib'], function (record, search, constants, lib) {
    var Helper = {};

    Helper.generateLedgerObject = function(newRecordId, newRecordDate, tranLineId, catchWeight, totalNominalWeight, location, lot, itemId, baseUnitQty, sourceLocation, explicitPricingUnitRate) {
        return {
            transactionId: newRecordId,
            transactionDate: newRecordDate,
            transactionLineId: tranLineId,
            catchWeight: catchWeight,
            totalNominalWeight: totalNominalWeight,
            location: location,
            lot: lot,
            itemId: itemId,
            baseUnitQty: baseUnitQty,
            sourceLocation: sourceLocation,
            explicitPricingUnitRate: explicitPricingUnitRate
        };
    }

    Helper.getEndingLedgers = function(context) {
        var ledgers = [];

        var newRecord = context.newRecord;
        var newRecordId = newRecord.id;
        var newRecordType = newRecord.type;
        var newRecordDate = newRecord.getValue({
            fieldId: 'trandate'
        });
        
        var logTitle = 'getEndingLedgers';
        var sourceLocation = newRecord.getValue({
            fieldId: 'transferlocation'
        });

        //gather line count, define object for ledger creation information
        var conversionRateId = (newRecordType == 'inventoryadjustment' || newRecordType == 'inventorytransfer') ? 'unitconversionrate' : 'unitconversion';
        var sublistId = (newRecordType == 'inventoryadjustment' || newRecordType == 'inventorytransfer') ? 'inventory' : 'item';
        var quantityId = (newRecordType == 'inventoryadjustment' || newRecordType == 'inventorytransfer') ? 'adjustqtyby': 'quantity';
        var lineCount = newRecord.getLineCount(sublistId);
        log.debug(logTitle, 'Line Count: ' + lineCount);
        var ledgerLines = [];
        //gather line item info for ledger creation
        for(i=0; i < lineCount; i++){
            var isCatchWeight = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_ITEM,
                line: i
            });
            //for non catchweight lines, ignore
            if(!isCatchWeight) {
                continue;
            }
            //grab line level fields for object
            var quantity = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: quantityId,
                line: i
            });
            // If we don't have a quantity then the line should not end up in the ending results
            if (!quantity) {
                continue;
            }
            //convert quantity to number for later calculation
            var properQuantity = parseFloat(quantity);
            var itemId = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'item',
                line: i
            });
            var properQuantity = parseFloat(quantity);
            var catchWeight = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT,
                line: i
            });
            if (properQuantity < 0 && catchWeight > 0) {
                // Quantity is negative so catch weight should also be negative
                catchWeight = -catchWeight;
            }
            var catchWeightDetails = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_DETAILS,
                line: i
            });
            var nominalWeight = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.AVERAGE_WEIGHT,
                line: i
            });
            var properNominal = parseFloat(nominalWeight);
            var tranLineId = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'line',
                line: i
            });
            var properLineId = (i+1);
            log.debug(logTitle, 'Proper Line ID: ' + properLineId)
            log.debug(logTitle, 'Transaction Line ID: ' + tranLineId);
            if (tranLineId == undefined || tranLineId == '' || tranLineId == null) {
                tranLineId = properLineId;
                log.debug(logTitle, 'Fixed Transaction Line ID: ' + tranLineId);
            }
            var lineLocation = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'location',
                line: i
            });
            var lineUnits = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'units',
                line: i
            });
            var isLotItem = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'isnumbered',
                line: i
            });
            var conversionRate = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: conversionRateId,
                line: i
            });
            var purchaseRatePerPricingUnit = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.PURCHASE_RATE_PER_PRICING_UNIT,
                line: i
            });
            if (newRecordType == 'inventorytransfer'){
                log.debug(logTitle, 'Inventory Transfer: Grabbing to and from location data');
                var toLocation = newRecord.getValue('transferlocation');
                log.debug(logTitle, 'Inventory Transfer to Location : ' + toLocation)
                var fromLocation = newRecord.getValue('location');
                log.debug(logTitle, 'IT From Location : ' + fromLocation);
            }
            log.debug(logTitle, 'Conversion Rate for Line: ' + conversionRate);
            log.debug(logTitle, 'Line Number: ' + tranLineId + ' Lot Item ' + isLotItem);
            var baseUnitQty = (properQuantity)*(conversionRate)
            log.debug(logTitle, 'Base Unit Qty for Line: ' + baseUnitQty);

            ledgerLines.push({
                itemId : itemId,
                properQuantity: properQuantity,
                properNominal: properNominal,
                catchWeight: catchWeight,
                catchWeightDetails: catchWeightDetails,
                tranLineId: tranLineId,
                lineLocation: lineLocation,
                lineUnits: lineUnits,
                isLotItem: isLotItem,
                baseUnitQty: baseUnitQty,
                conversionRate: conversionRate,
                toLocation : toLocation,
                fromLocation : fromLocation,
                purchaseRatePerPricingUnit: purchaseRatePerPricingUnit
            });
        }
        log.debug(logTitle, 'CREATE: Out of For Loop, Transaction Information Gathered for ledger records');
        log.debug(logTitle, ledgerLines);

        // If we have some lot items then we need to get the inventory breakdown

        ledgerLines.forEach(function (line) {
            //create ledger record for each line for non-lot lines based on transaction information and converted quantities
            if(line.isLotItem == 'F'){
                var totalNominalWeight = (line.properQuantity)*(line.properNominal);
                log.debug(logTitle, 'Total Nominal Weight: ' + totalNominalWeight);
                if (newRecordType == 'itemreceipt' || newRecordType == 'inventoryadjustment'){
                    var explicitPricingUnitRate = line.purchaseRatePerPricingUnit;
                    if (line.baseUnitQty < 0) {
                        explicitPricingUnitRate = undefined;
                    }
                    var positiveLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, line.catchWeight, totalNominalWeight, line.lineLocation, '', line.itemId, line.baseUnitQty, sourceLocation, explicitPricingUnitRate);
                    log.debug(logTitle, 'Adjustment/Receipt Ledger Created: ' + positiveLedger);
                    ledgers.push(positiveLedger);
                }
                if(newRecordType == 'itemfulfillment'){
                    var negativeLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, -Math.abs(line.catchWeight), -Math.abs(totalNominalWeight), line.lineLocation, '', line.itemId, -Math.abs(line.baseUnitQty));
                    log.debug(logTitle, 'Fulfillment Ledger Created: ' + negativeLedger);
                    ledgers.push(negativeLedger);
                }
                if(newRecordType == 'inventorytransfer'){
                    var negativeLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, -Math.abs(line.catchWeight), -Math.abs(totalNominalWeight), fromLocation, '', line.itemId, -Math.abs(line.baseUnitQty));
                    var positiveLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, line.catchWeight, totalNominalWeight, toLocation, '', line.itemId, line.baseUnitQty, line.fromLocation);
                    log.debug(logTitle, 'Negative Ledger Created: ' + negativeLedger);
                    log.debug(logTitle, 'Positive Ledger Created: ' + positiveLedger);
                    ledgers.push(negativeLedger);
                    ledgers.push(positiveLedger);
                }
            } else {
                //analyze lot level detail line items for ledger creation. Gather proper lot id
                if (newRecordType == 'itemfulfillment'){
                    var lotDetailResult = lotItemDetailCheck(newRecordId, (line.tranLineId +1));
                } else {
                    var lotDetailResult = lotItemDetailCheck(newRecordId, line.tranLineId);
                }

                var catchWeightByLot = {};

                if (line.catchWeightDetails) {
                    var weightDetails = lib.parseCatchWeightDetails(line.catchWeightDetails);
                    weightDetails.forEach(function (detail) {
                        var lotCatchWeight = detail.weight;
                        if (line.baseUnitQty < 0) {
                            lotCatchWeight = -lotCatchWeight;
                        }
                        var lotName = detail.lot;

                        if (!catchWeightByLot[lotName]) {
                            catchWeightByLot[lotName] = lotCatchWeight;
                        } else {
                            catchWeightByLot[lotName] += lotCatchWeight;
                        }
                    });
                }

                //for each result in the lot detail search, gather quantity from lot
                lotDetailResult.each(function(result){
                    var lotQuantity = result.getValue({
                        name: 'quantity',
                        join: 'inventorydetail'
                    });
                    if (line.baseUnitQty < 0) {
                        lotQuantity = -lotQuantity;
                    }
                    var lotName = result.getValue({
                        name: 'inventorynumber',
                        join: 'inventorydetail'
                    });
                    var lotText = result.getText({
                        name: 'inventorynumber',
                        join: 'inventorydetail'
                    });
                    var unitProportion = (lotQuantity / line.baseUnitQty).toFixed(8);
                    log.debug(logTitle, 'Lot Quantity: ' + lotQuantity + 'Lot Name: ' + lotName);
                    var lotNominalWeight = lotNominalWeightCalculation(lotQuantity, line.conversionRate, line.properNominal);
                    log.debug(logTitle, 'Lot Nominal Weight: ' + lotNominalWeight);
                    var lotCatchWeight = catchWeightByLot[lotText] || lotCatchWeightCalculation(line.properQuantity, lotQuantity, line.conversionRate, line.catchWeight);
                    lotCatchWeight = lotCatchWeight.toFixed(5);
                    log.debug(logTitle, 'Lot Catch Weight: ' + lotCatchWeight);
                    if(newRecordType == 'itemreceipt' || newRecordType == 'inventoryadjustment'){
                        var explicitPricingUnitRate = line.purchaseRatePerPricingUnit;
                        if (line.baseUnitQty < 0) {
                            explicitPricingUnitRate = undefined;
                        }
                        var lotPositiveLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, lotCatchWeight, lotNominalWeight, line.lineLocation, lotName, line.itemId, lotQuantity, sourceLocation, explicitPricingUnitRate);
                        lotPositiveLedger.unitProportion = unitProportion;
                        log.debug(logTitle, 'Positive Lot Ledger Created: ' + lotPositiveLedger);
                        ledgers.push(lotPositiveLedger);
                    }
                    if(newRecordType == 'itemfulfillment'){
                        var lotNegativeLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, -Math.abs(lotCatchWeight), -Math.abs(lotNominalWeight), line.lineLocation, lotName, line.itemId, -Math.abs(lotQuantity));
                        lotNegativeLedger.unitProportion = unitProportion;
                        log.debug(logTitle, 'Negative Lot Ledger Created: ' + lotNegativeLedger);
                        ledgers.push(lotNegativeLedger);
                    }
                    if(newRecordType == 'inventorytransfer'){
                        var lotNegativeLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, -Math.abs(lotCatchWeight), -Math.abs(lotNominalWeight), fromLocation, lotName, line.itemId, -Math.abs(lotQuantity));
                        lotNegativeLedger.unitProportion = unitProportion;
                        log.debug(logTitle, 'Negative Lot Ledger Created: ' + lotNegativeLedger);
                        var lotPositiveLedger = Helper.generateLedgerObject(newRecordId, newRecordDate, line.tranLineId, lotCatchWeight, lotNominalWeight, toLocation, lotName, line.itemId, lotQuantity, line.fromLocation);
                        lotPositiveLedger.unitProportion = unitProportion;
                        log.debug(logTitle, 'Positive Lot Ledger Created: ' + lotPositiveLedger);
                        ledgers.push(lotNegativeLedger);
                        ledgers.push(lotPositiveLedger);
                    }
                    return true;
                });
            }
        });

        return ledgers;
    }

    Helper.getExistingLedgers = function(context) {
        var transactionId = context.oldRecord.id;
        var ledgers = [];
        // Create a search
        var ledgerSearch = search.create({
            type: constants.RecordType.WeightLedger.ID,
            // Add filter to be related to the transaction just created
            filters: [
                search.createFilter({
                    name: constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER,
                    operator: search.Operator.ANYOF,
                    values: [transactionId]
                })
            ],
            columns: [
                {name: constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER},
                {name: constants.RecordType.WeightLedger.Fields.DATE},
                {name: constants.RecordType.WeightLedger.Fields.LINE_KEY},
                {name: constants.RecordType.WeightLedger.Fields.LOCATION},
                {name: constants.RecordType.WeightLedger.Fields.ITEM},
                {name: constants.RecordType.WeightLedger.Fields.LOT},
                {name: constants.RecordType.WeightLedger.Fields.NOMINAL_WEIGHT},
                {name: constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS},
                {name: constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT},
                {name: constants.RecordType.WeightLedger.Fields.UNIT_PROPORTION}
            ]
        });
        // Run through the results and construct objects using Helper.generateLedgerObject (make sure id is set)
        ledgers = ledgerSearch.run().getRange(0, 1000).map(function (result) {
            return {
                id: result.id,
                transactionId: result.getValue(constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER),
                transactionDate: result.getValue(constants.RecordType.WeightLedger.Fields.DATE),
                transactionLineId: result.getValue(constants.RecordType.WeightLedger.Fields.LINE_KEY),
                location: result.getValue(constants.RecordType.WeightLedger.Fields.LOCATION),
                itemId: result.getValue(constants.RecordType.WeightLedger.Fields.ITEM),
                lot: result.getValue(constants.RecordType.WeightLedger.Fields.LOT),
                totalNominalWeight: result.getValue(constants.RecordType.WeightLedger.Fields.NOMINAL_WEIGHT),
                baseUnitQty: result.getValue(constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS),
                catchWeight: result.getValue(constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT),
                unitProportion: result.getValue(constants.RecordType.WeightLedger.Fields.UNIT_PROPORTION)
            }
        });

        // Return ledgers
        return ledgers;
    }

    Helper.deleteOrphanLedgers = function() {
        search.create({
            type: constants.RecordType.WeightLedger.ID,
            // Add filter to be related to the transaction just created
            filters: [
                [constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER, search.Operator.ANYOF, '@NONE@'],
                'AND',
                [constants.RecordType.WeightLedger.Fields.IS_TRUE_UP, search.Operator.IS, false]
            ]
        }).run().each(function (ledger) {
            record.delete({
                type: constants.RecordType.WeightLedger.ID,
                id: ledger.id
            });
            return true;
        });
    }

    /**
     * 
     * @param {Object} options 
     */
    Helper.getDeltaLedgers = function(options) {
        var ledgers = [];

        var existingLedgers = options.existingLedgers;
        var endingLedgers = options.endingLedgers;

        // We're going to create a key/value pair with key being combination of item, lot, and location (keeping in mind lot may be empty)
        var existingLedgersByKey = {};
        var endingLedgersByKey = {};

        existingLedgers.forEach(function (ledger) {
            var key = [ledger.itemId, ledger.lot, ledger.location, ledger.transactionLineId].join('$$$'); // Picked an arbitrary separator
            existingLedgersByKey[key] = ledger;
        });

        endingLedgers.forEach(function (ledger) {
            var key = [ledger.itemId, ledger.lot, ledger.location, ledger.transactionLineId].join('$$$'); // Picked an arbitrary separator
            endingLedgersByKey[key] = ledger;
        });

        // Find keys in ending ledgers that are not in existing; these we will create
        Object.keys(endingLedgersByKey).filter(function (key) {
            return !existingLedgersByKey[key]
        }).forEach(function (key) {
            ledgers.push(endingLedgersByKey[key]);
        });

        // Find keys in existing ledgers that are not in ending; these we will delete
        Object.keys(existingLedgersByKey).filter(function (key) {
            return !endingLedgersByKey[key]
        }).forEach(function (key) {
            existingLedgersByKey[key].isDelete = true;
            ledgers.push(existingLedgersByKey[key]);
        });

        // Keys in both ledgers we will update with the values from ending ledgers (no need to even care what's in existing ledgers)
        Object.keys(existingLedgersByKey).filter(function (key) {
            return !!endingLedgersByKey[key]
        }).forEach(function (key) {
            var ledger = endingLedgersByKey[key];
            ledger.id = existingLedgersByKey[key].id; // Assign the existing ledger's record id so we're updating the right one
            // If the baseUnitQty is undefined, null, or zero, then we'll treat this as a delete
            if (!ledger.baseUnitQty) ledger.isDelete = true;
            ledgers.push(ledger);
        });

        return ledgers;
    }
    
    //custom function to check for lot numbered details from transactions and return results to aftersubmit function
    function lotItemDetailCheck(newRecordId, line){
        var logTitle = 'lotItemDetailCheck';
        log.debug(logTitle, 'In IF statement');
        var transactionIdFilter = search.createFilter({
            name: 'internalid',
            operator: search.Operator.ANYOF,
            values: newRecordId
        });
        log.debug(logTitle, 'TRAN ID FILTER: ' + transactionIdFilter);
        var lineIdFilter = search.createFilter({
            name: 'line',
            operator: search.Operator.ANYOF,
            values: line
        });
        log.debug(logTitle, 'LINE ID FILTER: ' + lineIdFilter);
        var lotDetailSearch = search.load({
                id: constants.SavedSearch.LOT_DETAILS
        });
        lotDetailSearch.filters.push (transactionIdFilter, lineIdFilter);
        var lotDetailResult = lotDetailSearch.run();
        return lotDetailResult;
    }
    //custom function to calculate nominal weight for lot numbered items
    function lotNominalWeightCalculation(lotQuantity, conversionRate, properNominal){
        var logTitle = 'lotNominalWeightCalculation';
        var lotNominalWeight = ((lotQuantity)/(conversionRate))*properNominal
        log.debug(logTitle, 'LOT Nominal Weight: ' + lotNominalWeight);
        return lotNominalWeight;
    }
    //custom function to calculate catch weight for lot numbered items
    function lotCatchWeightCalculation(properQuantity, lotQuantity, conversionRate, catchWeight){
        var logTitle = 'lotCatchWeightCalculation';
        var averageCatchWeight = catchWeight/properQuantity;
        log.debug(logTitle, 'LOT: Catch Weight Average to add: ' + averageCatchWeight);
        var lotToTransactionQty = lotQuantity/conversionRate;
        log.debug(logTitle, 'LOT QUANTITY in Trans Units' + lotToTransactionQty);
        var lotCatchWeight = lotToTransactionQty*averageCatchWeight
        log.debug(logTitle, 'Lot Catch Weight to Add: ' + lotCatchWeight);
        return lotCatchWeight;
    }
    //custom function to create ledger records with data sent from aftersubmit function
    function createLedger(ledger) { //newRecordId, newRecordDate, tranLineId, catchWeight, totalNominalWeight, location, lot, itemId, baseUnitQty){
        var newRecordId = ledger.transactionId;
        var newRecordDate = ledger.transactionDate;
        var tranLineId = ledger.transactionLineId;
        var catchWeight = ledger.catchWeight;
        var totalNominalWeight = ledger.totalNominalWeight;
        var location = ledger.location;
        var lot = ledger.lot;
        var itemId = ledger.itemId;
        var baseUnitQty = ledger.baseUnitQty;
        var sourceLocation = ledger.sourceLocation;
        var explicitPricingUnitRate = ledger.explicitPricingUnitRate;
        var unitProportion = ledger.unitProportion;

        var logTitle = 'createLedger'
        log.debug(logTitle, 'Creating Ledger based on parameters....');
        var newLedger = record.create({
            type: constants.RecordType.WeightLedger.ID,
            isDynamic: true
        });
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER,
            value: newRecordId
        });
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.DATE,
            value: newRecordDate
        });
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.LINE_KEY,
            value: tranLineId
        });
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.LOCATION,
            value: location
        });
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.ITEM,
            value: itemId
        });
        if(lot){
            newLedger.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.LOT,
                value: lot
            });
        }
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.NOMINAL_WEIGHT,
                value: totalNominalWeight
        });    
        log.debug(logTitle, 'Base Unit QTY to use: ' + baseUnitQty);
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS,
            value: baseUnitQty
        });            
        newLedger.setValue({
            fieldId: constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT,
            value: catchWeight
        });
        if (sourceLocation) {
            newLedger.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.SOURCE_LOCATION,
                value: sourceLocation
            });
        }
        if (explicitPricingUnitRate != undefined) {
            newLedger.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.EXPLICIT_PRICING_UNIT_RATE,
                value: explicitPricingUnitRate
            });
        }
        if (unitProportion) {
            newLedger.setValue({
                fieldId: constants.RecordType.WeightLedger.Fields.UNIT_PROPORTION,
                value: unitProportion
            });
        }
        newLedger.save();
        var newLedgerId = newLedger.id;
        log.debug(logTitle, 'New Ledger Record Created: ' + newLedgerId);  
        return newLedgerId;
    }

    function beforeSubmit(context) {
        if (context.type != context.UserEventType.CREATE && context.type != context.UserEventType.EDIT) {
            // Only run for create or edit so leave
            return;
        }

        var newRecord = context.newRecord;
        if (newRecord.type != 'inventoryadjustment') {
            // Only run for inventory adjustments to leave
            return;
        }
        
        var sublistId = 'inventory';

        // Loop over the lines and look for positive catch weight lines so we calculate the est unit cost correctly as Catch Weight * Purchase Rate / Quantity
        var lines = newRecord.getLineCount({
            sublistId: sublistId
        });

        for (var x = 0; x < lines; x++) {
            var isCatchWeight = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT_ITEM,
                line: x
            });

            if (!isCatchWeight) {
                continue;
            }

            log.debug('x', x);

            var quantity = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: 'adjustqtyby',
                line: x
            });

            log.debug('quantity', quantity);

            if (!quantity || quantity < 0) {
                // We only care about lines with positive quantity so skip the line
                continue;
            }

            var purchaseRatePerPricingUnit = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.PURCHASE_RATE_PER_PRICING_UNIT,
                line: x
            });

            var catchWeight = newRecord.getSublistValue({
                sublistId: sublistId,
                fieldId: constants.TransactionLineFields.CATCH_WEIGHT,
                line: x
            });

            var unitCost = purchaseRatePerPricingUnit * catchWeight / quantity;

            newRecord.setSublistValue({
                sublistId: sublistId,
                fieldId: 'unitcost',
                line: x,
                value: unitCost
            });
        }
    }

    function afterSubmit(context) {
        var logTitle = 'afterSubmit';
        try {
            //run on create and edit only, define basic variables
            var newRecord = context.newRecord;
            var newRecordId = newRecord.id;
            var newRecordType = newRecord.type;
            var newRecordDate = newRecord.getValue({
                fieldId: 'trandate'
            });
            log.debug (logTitle, newRecordType + " : " + newRecordId);
            log.debug(logTitle, 'Date: ' + newRecordDate);
            if (context.type != context.UserEventType.CREATE && context.type != context.UserEventType.EDIT && context.type != context.UserEventType.DELETE) {
                log.debug(logTitle, 'Invalid event type. context.type=' + context.type);
                return;
            }
            var endingLedgers = [];
            if (context.type == context.UserEventType.DELETE) {
                Helper.deleteOrphanLedgers();
                return;
            }
            // We only have ending ledgers when it's a Create or Edit. Delete will mean we don't want any ledgers in the end.
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                endingLedgers = Helper.getEndingLedgers(context);
            }
            
            log.debug('endingLedgers', JSON.stringify(endingLedgers));
            if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.DELETE) {
                var existingLedgers = Helper.getExistingLedgers(context);
                log.debug('existingLedgers', JSON.stringify(existingLedgers));
                var endingLedgers = Helper.getDeltaLedgers({
                    existingLedgers: existingLedgers,
                    endingLedgers: endingLedgers
                });
                log.debug('deltaLedgers', JSON.stringify(endingLedgers));
            }
            endingLedgers.forEach(function (ledger) {
                if (ledger.id) {
                    // Update or Delete
                    if (ledger.isDelete) {
                        // Delete
                        record.delete({type: constants.RecordType.WeightLedger.ID, id: ledger.id});
                    } else {
                        var values = {};
                        values[constants.RecordType.WeightLedger.Fields.NOMINAL_WEIGHT] = ledger.totalNominalWeight;
                        values[constants.RecordType.WeightLedger.Fields.QUANTITY_IN_BASE_UNITS] = ledger.baseUnitQty;
                        values[constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT] = ledger.catchWeight;
                        values[constants.RecordType.WeightLedger.Fields.EXPLICIT_PRICING_UNIT_RATE] = ledger.explicitPricingUnitRate;
                        values[constants.RecordType.WeightLedger.Fields.SOURCE_LOCATION] = ledger.sourceLocation;
                        values[constants.RecordType.WeightLedger.Fields.UNIT_PROPORTION] = ledger.unitProportion;
                        log.debug('submitFields', JSON.stringify(values));
                        // Update
                        record.submitFields({
                            type: constants.RecordType.WeightLedger.ID,
                            id: ledger.id,
                            values: values
                        });
                    }
                } else {
                    // Create
                    createLedger(ledger);
                }
            });
        }
        catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
        }
    }
    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});