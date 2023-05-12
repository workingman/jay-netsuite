/**
 * Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
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
define(['N/runtime', 'N/record', 'N/error', 'N/search'], function (runtime, record, error, search) {
    var logTitle = 'Pricing Adjust';
    //Custom function to return Total Weight Calculation
    function totalWeightCalculation(quantity, weightPerQuantity){
        var logTitle = 'Total Weight Calculation';
            var totalWeight = quantity*weightPerQuantity;
            log.debug(logTitle, 'Total Weight: ' + totalWeight);
    return totalWeight;
    } 
    //Custom Function to Evaulate a required change to either Unit Rate or Pricing Unit Rate on Transactions
    function initialRateCalculation(standardRate, standardPricingUnitRate, unitRate, pricingUnitRate){
        var logTitle = 'initialRateCalculation';
        log.debug(logTitle, 'Standard Pricing Unit Rate: ' + standardPricingUnitRate + ' Transaction Pricing Unit Rate: ' + pricingUnitRate);
        log.debug(logTitle, 'Standard Unit Rate based on Standard Pricing Unit Rate: ' + standardRate + ' Transaction Unit Rate: ' + unitRate);
        //if standard matches actual, return no change
        if ((standardPricingUnitRate == pricingUnitRate) &&
            (standardRate == unitRate)){
            log.debug(logTitle, 'Standard pricing unit rate and Transaction Pricing Unit Rate are the same. Standard Rate and Unit Rate are the same. No Requirement for changes');
            return 'No Change';
        }
        //if both rate and pricing unit rate are different than standard, or JUST pricing unit rate is different, return Rate Update
        if (((standardPricingUnitRate !== pricingUnitRate) &&
            (standardRate == unitRate)) ||
            ((standardPricingUnitRate !== pricingUnitRate) &&
            (standardRate !== unitRate))){
            log.debug(logTitle, 'Standard vs. Actual Pricing Unit Rate Mismatch.');
            return 'Rate Update';
        }
        //if only rate has changed, then update the pricing unit rate
        if ((standardPricingUnitRate == pricingUnitRate) &&
            (standardRate !== unitRate)){
            log.debug(logTitle, 'Only Rate Override occurred.');
            return 'PUR Update';
        }
    }
    //custom function to calculate standard weight per quantity
    function standardWeightPerQuantity(conversionRate, weightPerBaseUnit){
        var logTitle = 'standardWeightPerQuantity';
        log.debug(logTitle, 'Conversion Rate: ' + conversionRate + ' ' + 'Weight Per Base: ' + weightPerBaseUnit);
        var newStandardWeightPerQuantity = (conversionRate)*(weightPerBaseUnit);
        log.debug(logTitle, 'New Standard Weight per QTY: ' + newStandardWeightPerQuantity);
        return newStandardWeightPerQuantity;
    }
    //basic rate update based on weight based pricing adjustment
    function weightPricingAdjustment(lineQuantity, pricingUnitRate, totalWeight){
            var updatedRate = ((pricingUnitRate)*(totalWeight)/(lineQuantity));
            log.debug(logTitle, 'New Rate for Line: ' + updatedRate);
        return updatedRate;
    }
    //function to evaluate individual lines to see if a proper adjustment should occur based on Moved vs. Total Quantity
    function lineCompleted(movedQty, currentQuantity){
        var logTitle = 'lineCompleted'
        if(movedQty == currentQuantity){
            log.debug(logTitle, 'Line is complete. Returning True');
            return 'Complete';
        } else if (!movedQty){
            log.debug(logTitle, 'Line is not started');
            return 'Not Started';
        } else
        log.debug(logTitle, 'Line is incomplete.');
        return 'Incomplete';
    }
    function getPricingUnitRateId(recordType){
        if(recordType == 'purchaseorder' ||
        recordType == 'inventoryadjustment' || 
        recordType == 'vendorreturnauthorization'){
            return 'custcol_cw_rate_per_pricing_unit_pur';
        } else 
        if(recordType == 'salesorder' || 
        recordType == 'returnauthorization'){
            return 'custcol_cw_rate_per_pricing_unit_sal';
        } else {
            return 'none needed'
        }
    }
    //custom function to retrieve standard pricing unit rate ID
    function getStandardPricingUnitRateId(recordType){
        if(recordType == 'purchaseorder' ||
        recordType == 'inventoryadjustment' || 
        recordType == 'vendorreturnauthorization'){
            return 'custcol_cw_std_pp_pu';
        } 
        if(recordType == 'salesorder' || 
        recordType == 'returnauthorization'){
            return 'custcol_cw_std_sp_pu';
        }
        else {
            return 'none needed'
        }
    }
    //custom function to gather sublist ID
    function getProperSublistId(recordType){
        if(recordType == 'purchaseorder' ||
        recordType == 'salesorder' || 
        recordType == 'returnauthorization' || 
        recordType == 'transferorder' || 
        recordType == 'vendorreturnauthorization'){
            return 'item';
        }
        if(recordType == 'inventorytransfer' || recordType == 'inventoryadjustment'){
            return 'inventory';
        }
    }
    //custom function to add record type for Created From Loading
    function getRecordType(createdFromRecordType){
        if(createdFromRecordType == 'Sales Order'){
            return record.Type.SALES_ORDER;
        }
        if(createdFromRecordType == 'Purchase Order'){
            return record.Type.PURCHASE_ORDER;
        }
        if(createdFromRecordType == 'Return Authorization'){
            return record.Type.RETURN_AUTHORIZATION;
        }
        if(createdFromRecordType == 'Vendor Return Authorization'){
            return record.Type.VENDOR_RETURN_AUTHORIZATION;
        }
    }
    //custom function to return quantity ID
    function getQuantityId(recordType){
        var quantityId = (recordType == 'inventoryadjustment' || recordType == 'inventorytransfer') ? 'adjustqtyby': 'quantity';
        return quantityId;
    }
    //custom function to return conversion rate field ID
    function getUnitConversionId(recordType){
        var conversionRateId = (recordType == 'inventorytransfer') ? 'unitconversion' : 'unitconversionrate';
        return conversionRateId;
    }
    function beforeSubmit(context) {
        var logTitle = 'beforeSubmit'
        try{
            var newRecord = context.newRecord;
            var oldRecord = context.oldRecord;
            var recordType = newRecord.type;
            var recordId = newRecord.recordId;
            log.debug(logTitle, 'Record Type: ' + recordType + ' ID: ' + recordId);
            if (recordType !== 'purchaseorder' && 
                recordType !== 'salesorder' && 
                recordType !== 'transferorder' && 
                recordType !== 'inventorytransfer' && 
                recordType !== 'inventoryadjustment' &&
                recordType !== 'returnauthorization' && 
                recordType !== 'vendorreturnauthorization'){
                log.debug(logTitle, 'Record Type is not eligible for beforeSubmit. Moving to afterSubmit');
                return;
            }
            var sublistId = getProperSublistId(recordType);
            log.debug(logTitle, 'SublistID: ' + sublistId);
            var unitConversionId = getUnitConversionId(recordType);
            log.debug(logTitle, 'Unit Conversion ID: ' + unitConversionId);
            var quantityId = getQuantityId(recordType);
            var standardPricingRateId = getStandardPricingUnitRateId(recordType);
            var transPricingRateId = getPricingUnitRateId(recordType);
            log.debug(logTitle, 'Quantity ID: ' + quantityId);
            var lineCount = newRecord.getLineCount(sublistId);
            log.debug(logTitle, 'LineCount: ' + lineCount);
            var standardPricingRateId = getStandardPricingUnitRateId(recordType);
            log.debug(logTitle, 'STD Pricing Unit Rate ID: ' + standardPricingRateId);
            var transPricingRateId = getPricingUnitRateId(recordType);
            log.debug(logTitle, 'Transaction Pricing Unit Rate ID: ' + transPricingRateId)
            if (context.type == context.UserEventType.CREATE){
                log.debug(logTitle, 'CREATE: in initial IF Statement');
                log.debug(logTitle, 'CREATE: Record Creation Detected');                   
                for(i=0; i < lineCount; i++){
                    //find catch weight lines
                    var catchWeightItem = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_item_ckbx',
                        line: i
                    });
                    if(catchWeightItem == false){
                        continue;
                    }
                    //set per quantity standard weight
                    var weightPerBaseUnit = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_wgt_per_base_unit',
                        line: i
                    });
                    var conversionRate = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: unitConversionId,
                        line: i
                    });
                    var perQuantityStdWeight = standardWeightPerQuantity(conversionRate, weightPerBaseUnit);
                    newRecord.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_avg_wght',
                        line: i,
                        value: perQuantityStdWeight
                    });
                    //set total weight
                    var lineQuantity = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: quantityId,
                        line: i
                    });
                    var properQuantity = parseFloat(lineQuantity);
                    newRecord.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_total_weight',
                        line: i,
                        value: totalWeightCalculation(properQuantity, perQuantityStdWeight)
                    });
                    if (recordType == 'returnauthorization' || recordType == 'vendorreturnauthorization'){
                        log.debug(logTitle, 'New Return Transaction detected, Clearing Actual Weight');
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_act_wght',
                            line: i,
                            value: null
                        });
                    }
                    if(recordType == 'salesorder' || recordType == 'purchaseorder'){
                        log.debug(logTitle, 'CREATE: PO/SO detected. Analyzing further fields.');
                        var pricingUnitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: transPricingRateId,
                            line: i
                        });
                        var unitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'rate',
                            line: i
                        });
                        var standardPricingUnitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: standardPricingRateId,
                            line: i
                        });
                        var standardRate = (conversionRate)*(weightPerBaseUnit)*(standardPricingUnitRate);
                        var lineRateEvaluation = initialRateCalculation(standardRate,standardPricingUnitRate, unitRate, pricingUnitRate);
                        log.debug(logTitle, 'Line Evaluation: ' + lineRateEvaluation);
                        if (lineRateEvaluation == 'No Change'){
                            continue;
                        }
                        if (lineRateEvaluation == 'Rate Update'){
                            var newUnitRate = (conversionRate)*(weightPerBaseUnit)*(pricingUnitRate);
                            log.debug(logTitle, 'CREATE: Updating Unit Rate based on overrides from standard to: ' + newUnitRate);
                            if (recordType == 'salesorder'){
                                log.debug(logTitle, 'CREATE: new record is SO, updating price level to custom and updating rate');
                                newRecord.setSublistValue({
                                        sublistId: sublistId,
                                        fieldId: 'price',
                                        value: '-1',
                                        line: i
                                    });
                                }
                            newRecord.setSublistValue({
                                sublistId: sublistId,
                                fieldId: 'rate',
                                value: newUnitRate,
                                    line: i
                            });
                            continue;
                        }
                        if (lineRateEvaluation == 'PUR Update'){
                            log.debug(logTitle, 'CREATE: Only a rate override has occurred. Analyzing Further to adjust Transaction');
                            var newPricingUnitRate = (unitRate)/(conversionRate)/(weightPerBaseUnit);
                            log.debug(logTitle, 'CREATE: Transaction Pricing Unit Rate to be updated to: ' + newPricingUnitRate);
                            newRecord.setSublistValue({
                                sublistId: sublistId,
                                fieldId: transPricingRateId,
                                value: newPricingUnitRate,
                                line: i
                            });
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
            }
            if (context.type == context.UserEventType.EDIT){
                for(i=0; i < lineCount; i++){
                    //find catch weight lines
                    log.debug(logTitle, 'EDIT: in For Loop');
                    var catchWeightItem = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_item_ckbx',
                        line: i
                    });
                    if(catchWeightItem == false){
                        continue;
                    }
                    //gather line item data
                    var oldConversionRate = oldRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: unitConversionId,
                        line: i
                    });
                    var conversionRate = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: unitConversionId,
                        line: i
                    });
                    var oldQuantity = oldRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: quantityId,
                        line: i
                    });
                    var lineQuantity = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: quantityId,
                        line: i
                    });
                    var weightPerBaseUnit = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_cw_wgt_per_base_unit',
                        line: i
                    });
                    var properQuantity = parseFloat(lineQuantity);
                    var perQuantityStdWeight = standardWeightPerQuantity(conversionRate, weightPerBaseUnit);
                    var lineUniqueKey = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: 'lineuniquekey',
                        line: i
                    });
                    if(recordType == 'purchaseorder' || 
                    recordType == 'salesorder'){
                        var movedQtyId = (recordType == 'purchaseorder' || recordType == 'returnauthorization') ? 'quantityreceived' : 'quantityfulfilled';
                        log.debug(logTitle, 'EDIT: PO/SO Edit. Gathering Additional Information');
                        var OldpricingUnitRate = oldRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: transPricingRateId,
                            line: i
                        });
                        var actualWeight = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_act_wght',
                            line: i
                        });
                        var pricingUnitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: transPricingRateId,
                            line: i
                        });
                        var OldunitRate = oldRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'rate',
                            line: i
                        });
                        var unitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'rate',
                            line: i
                        });
                        var standardPricingUnitRate = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: standardPricingRateId,
                            line: i
                        });
                        var movedQty = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: movedQtyId,
                            line: i
                        });
                        var properMovedQuantity = parseFloat(movedQty);
                    }
                    log.debug(logTitle, 'EDIT: NEW LINE IF THIS IS BLANK: ' + lineUniqueKey);
                    if (!lineUniqueKey){
                        log.debug(logTitle, 'EDIT: New Catch Weight Line added. Analyzing to properly adjust');
                        log.debug(logTitle, 'NEW LINE: Per Quantity Standard Weight: ' + perQuantityStdWeight);
                        //set per quantity standard weight
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_avg_wght',
                            line: i,
                            value: perQuantityStdWeight
                        });
                        //set total weight
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_total_weight',
                            line: i,
                            value: totalWeightCalculation(properQuantity, perQuantityStdWeight)
                        });
                        if(recordType == 'purchaseorder' || 
                        recordType == 'salesorder'){
                            log.debug(logTitle, 'NEW SO/PO LINE: Additional Checks Needed...');
                            var standardRate = (conversionRate)*(weightPerBaseUnit)*(standardPricingUnitRate);
                            var newLineRateEvalResult = initialRateCalculation(standardRate, standardPricingUnitRate, unitRate, pricingUnitRate)
                            if(newLineRateEvalResult == 'No Change'){
                                log.debug(logTitle, 'No Change needed');
                            }
                            if(newLineRateEvalResult == 'Rate Update'){
                                var newUnitRate = (conversionRate)*(weightPerBaseUnit)*(pricingUnitRate);
                                log.debug(logTitle, 'NEW LINE: Updating Unit Rate based on overrides from standard to: ' + newUnitRate);
                                if (recordType == 'salesorder'){
                                    log.debug(logTitle, 'NEW LINE: new record is SO, updating price level to custom and updating rate');
                                    newRecord.setSublistValue({
                                        sublistId: sublistId,
                                        fieldId: 'price',
                                        value: '-1',
                                        line: i
                                    });
                                }
                                newRecord.setSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'rate',
                                    value: newUnitRate,
                                    line: i
                                });
                            }
                            if(newLineRateEvalResult == 'PUR Update'){
                                var newPricingUnitRate = (unitRate)/(conversionRate)/(weightPerBaseUnit);
                                log.debug(logTitle, 'NEW LINE: Transaction Pricing Unit Rate to be updated to: ' + newPricingUnitRate);
                                newRecord.setSublistValue({
                                    sublistId: sublistId,
                                    fieldId: transPricingRateId,
                                    value: newPricingUnitRate,
                                    line: i
                                });
                            }
                        }
                        continue;
                    }
                    log.debug(logTitle, 'OLD CONVERSION RATE: ' + oldConversionRate + ' NEW CONVERSION RATE: ' + conversionRate);
                    log.debug(logTitle, 'OLD QTY: ' + oldQuantity + ' NEW QTY: ' + lineQuantity);
                    if(oldConversionRate !== conversionRate || 
                        oldQuantity !== lineQuantity){
                        log.debug(logTitle, 'Units/Quantities have been changed. Adjusting Standard Weight Per Quantity & Total Weight');
                        log.debug(logTitle, 'EDIT: Standard Weight Per Quantity will be changed to: ' + perQuantityStdWeight);
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_avg_wght',
                            value: perQuantityStdWeight,
                            line: i
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_total_weight',
                            line: i,
                            value: totalWeightCalculation(properQuantity, perQuantityStdWeight)
                        });
                        if(recordType == 'salesorder' ||
                        recordType == 'purchaseorder'){
                            log.debug(logTitle, 'PO/SO Requires more adjustments for quantity/conversion rate changes');
                            log.debug(logTitle, 'EDIT: OLD PRICING UNIT RATE: ' + OldpricingUnitRate + ' NEW PRICING UNIT RATE: ' + pricingUnitRate);
                            log.debug(logTitle, 'EDIT: OLD UNIT RATE: ' + OldunitRate + ' NEW UNIT RATE: ' + unitRate);
                            log.debug(logTitle, 'EDIT: Actual Weight Value: ' + actualWeight);
                            if(oldConversionRate == conversionRate &&
                                OldunitRate == unitRate &&
                                OldpricingUnitRate == pricingUnitRate && oldQuantity == lineQuantity){
                                log.debug(logTitle, 'EDIT: Old and New values match. No requirement for adjustment');
                                continue;
                            }
                            var lineCompletedEval = lineCompleted(movedQty, lineQuantity);
                            if(lineCompletedEval == 'Complete' || lineCompletedEval == 'Incomplete'){
                                var newRate = weightPricingAdjustment(properMovedQuantity, pricingUnitRate, actualWeight);
                                log.debug(logTitle, 'New Rate: ' + newRate);
                                if(recordType == 'salesorder'){
                                    newRecord.setSublistValue({
                                        sublistId: sublistId,
                                        fieldId: 'price',
                                        value: '-1',
                                        line: i
                                    });
                                }
                                newRecord.setSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'rate',
                                    value: newRate,
                                    line: i
                                });
                                continue;
                            }
                            if(lineCompletedEval == 'Not Started'){
                                var rateEditResult = initialRateCalculation(OldunitRate, OldpricingUnitRate, unitRate, pricingUnitRate);
                                if (rateEditResult == 'No Change'){
                                    continue;
                                }
                                if(rateEditResult == 'Rate Update'){
                                    //calculate what expected rate should be based on the conversion rate and line item details
                                    var expectedRate = (weightPerBaseUnit)*(conversionRate)*(pricingUnitRate);
                                    log.debug(logTitle, 'Expected Rate to Update: ' + expectedRate)
                                    if(recordType == 'salesorder'){
                                        newRecord.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'price',
                                            value: '-1',
                                            line: i
                                        });
                                    }
                                    newRecord.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: expectedRate,
                                        line: i
                                    });
                                    continue;
                                }
                                if(rateEditResult == 'PUR Update'){
                                    //calculate waht PUR should be and update line item
                                    var newPricingUnitRate = (unitRate)/(conversionRate)/(weightPerBaseUnit);
                                    log.debug(logTitle, 'CREATE: New Pricing Unit Rate: ' + newPricingUnitRate);
                                    newRecord.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: transPricingRateId,
                                        value: newPricingUnitRate,
                                        line: i
                                    });
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
        }
    }
    function afterSubmit(context) {
        var logTitle = 'afterSubmit'
        try{
            var newRecord = context.newRecord;
            var recordType = newRecord.type;
            var recordId = newRecord.recordId;
            var oldRecord = context.oldRecord
            log.debug(logTitle, 'Record Type: ' + recordType + ' ID: ' + recordId);
            log.debug(logTitle, 'Context: ' + context.type);
            //exit if not item fulfillment/receipt
            if (recordType !== 'itemfulfillment' && 
                recordType !== 'itemreceipt'){
                log.debug(logTitle, 'Record Type is not IR or IF, exiting function');
                return;
            }
            if ((recordType == 'itemfulfillment' || 
                recordType == 'itemreceipt') &&
                context.type == context.UserEventType.CREATE || 
                context.type == context.UserEventType.EDIT || context.type == 'pack' || context.type == 'ship'){
                log.debug(logTitle, 'Record meets criteria, now analyzing created from');
                var createdFrom = newRecord.getValue('createdfrom');
                var createdFromType = newRecord.getValue('custbody_cw_createdfrom_trans_type');
                log.debug(logTitle, 'Created From: ' + createdFrom + ' Type: ' + createdFromType);
                //if it is not created from an SO or PO, exit. PENDIGN QUESTION BASED ON RETURN LOGIC
                if(createdFromType !== 'Sales Order' &&
                    createdFromType !== 'Purchase Order' && 
                    createdFromType !== 'Return Authorization' && 
                    createdFromType !== 'Vendor Return Authorization'){
                        log.debug(logTitle, 'Created From Type is not PO/SO/VRMA/RMA, exiting');
                        return;
                }
                var lineCount = newRecord.getLineCount('item');
                log.debug(logTitle, 'Line Count: ' + lineCount);
                var inventoryTransactionData = {};
                for(i=0; i<lineCount; i++){
                    //grab catch weight lines
                    var catchWeightItem = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_item_ckbx',
                        line: i
                    });
                    if (catchWeightItem == false){
                        continue;
                    }
                    var catchWeight = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight',
                        line: i
                    });
                    var movedQuantity = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    if(context.type == context.UserEventType.EDIT){
                        var oldQuantity = oldRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                        var oldCatchWeight = oldRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_cw_catch_weight',
                            line: i
                        });
                    }
                    var properMovedQuantity = parseFloat(movedQuantity);
                    var catchWeightNet = (catchWeight)-(oldCatchWeight);
                    log.debug(logTitle, 'Catch Weight Net: ' + catchWeightNet);
                    var orderLineNumber = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'orderline',
                        line: i
                    });
                    var key = recordId;
                    if(!inventoryTransactionData[key]){
                        inventoryTransactionData[key] = { 
                            recordId: recordId,
                            lines: []
                        }
                    }
                    inventoryTransactionData[key].lines.push({
                        properMovedQuantity: properMovedQuantity,
                        catchWeight: catchWeight,
                        orderLineNumber: orderLineNumber,
                        catchWeightNet: catchWeightNet
                    });
                }
                log.debug(logTitle, 'CREATE: Out of For Loop, Transaction Information Gathered to update originating transaction');
                log.debug(logTitle, inventoryTransactionData);
                var createdFromRecordType = getRecordType(createdFromType);
                log.debug(logTitle, 'Created From Record Load: ' + createdFromRecordType);
                Object.keys(inventoryTransactionData).forEach(function (key) {
                    var createdFromUpdates = inventoryTransactionData[key];
                    var createdFromRecord = record.load({
                        type: createdFromRecordType,
                        id: createdFrom,
                        isDynamic: true
                    });
                    log.debug(logTitle, 'PO/SO : ' + createdFrom + ' has been loaded. Now looping through lines for updating weight');
                    createdFromUpdates.lines.forEach(function (line) {
                        var movedQtyId = (createdFromType == 'Purchase Order' || createdFromType == 'Return Authorization') ? 'quantityreceived' : 'quantityfulfilled';
                        log.debug(logTitle, 'Moved Qty ID: ' + movedQtyId)
                        var transPricingRateId = (createdFromType == 'Purchase Order') ? 'custcol_cw_rate_per_pricing_unit_pur' : 'custcol_cw_rate_per_pricing_unit_sal';
                        cfLineCount = createdFromRecord.getLineCount('item');
                        for(i = 0; i < cfLineCount; i++){
                            var cfLineNumber = createdFromRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'line',
                                line: i
                            });
                            log.debug(logTitle, 'Line Number on PO/SO: ' + cfLineNumber + ' Order Line Number from IR/IF: ' + line.orderLineNumber)
                            if(cfLineNumber !== line.orderLineNumber){
                                continue;
                            }
                            if(cfLineNumber == line.orderLineNumber){
                                var cfQuantity = createdFromRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i
                                });
                                var cfMovedQty = createdFromRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: movedQtyId,
                                    line: i
                                });
                                var currentTotalWeight = createdFromRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_cw_total_weight',
                                    line: i
                                });
                                var cfPricingUnitRate = createdFromRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: transPricingRateId,
                                    line: i
                                });
                                var cfActualWeight = createdFromRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_cw_act_wght',
                                    line: i
                                });
                                log.debug(logTitle, 'Moved Quantity: ' + cfMovedQty);  
                                createdFromRecord.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });
                                if(!cfMovedQty){
                                    log.debug(logTitle, 'No Moved quantity after submission. Clearing fields and resetting rates');
                                    createdFromRecord.setCurrentSublistValue({
                                        sublistId:'item',
                                        fieldId: 'custcol_cw_act_wght',
                                        line: i,
                                        value: null
                                    });
                                    log.debug(logTitle, 'Cleared Actual Weight');
                                    var newRate = weightPricingAdjustment(cfQuantity, cfPricingUnitRate, currentTotalWeight);
                                    log.debug(logTitle, 'Rate Reset based on standard to: ' + newRate);
                                    if(createdFromType == 'Sales Order'){
                                        createdFromRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'price',
                                            value: '-1',
                                            line: i
                                        }); 
                                    }
                                    createdFromRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: newRate
                                    });
                                    createdFromRecord.commitLine({
                                        sublistId: 'item',
                                    });   
                                        continue;
                                } else {
                                    var addedActualWeight = (!line.catchWeightNet) ? (cfActualWeight) + (line.catchWeight) : (cfActualWeight) + (line.catchWeightNet);
                                    log.debug(logTitle, 'Added Actual Weight: ' + addedActualWeight + ' ' + 'Line Catch Weight from IR/IF: ' + line.catchWeight);
                                    var newActualWeight = (!cfActualWeight) ? line.catchWeight : addedActualWeight;
                                    var updatedRate = weightPricingAdjustment(cfMovedQty, cfPricingUnitRate, newActualWeight);
                                    var currentUnitRate = createdFromRecord.getCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        line: i
                                    });
                                    log.debug(logTitle, 'Current Line Rate: ' + currentUnitRate);
                                    log.debug(logTitle, 'CREATE: Updating PO/SO Rate to: ' + updatedRate);
                                    if (createdFromType == 'Sales Order'){
                                        createdFromRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'price',
                                            value: '-1',
                                            line: i
                                        });
                                    }
                                    createdFromRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: updatedRate,
                                        line: i
                                    });
                                    createdFromRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_cw_act_wght',
                                        line: i,
                                        value: newActualWeight
                                    });
                                    createdFromRecord.commitLine({
                                        sublistId: 'item',
                                    });
                                    continue;
                                } 
                            }
                        }
                    });
                    createdFromRecord.save();
                    log.debug(logTitle, 'PO/SO has been updated');
                });
            }
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