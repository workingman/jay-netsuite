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
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/record', 'N/error', 'N/search'], function (runtime, record, error, search) {

    function beforeSubmit(context) {
        var logTitle = 'beforeSubmit';
        //run on edit and create only
        try {
            var newRecord = context.newRecord;
            var newRecordId = newRecord.id;
            var newRecordType = newRecord.type;
            var createdFrom = newRecord.getValue('createdfrom');
            log.debug(logTitle, 'RecordType: ' + newRecordType + '. RecordId: ' + newRecordId + '. createdFrom: ' + createdFrom);
            //Creation Scenarios
            if (context.type == context.UserEventType.CREATE){
                if (newRecordType == 'itemfulfillment' || 
                newRecordType == 'itemreceipt' || 
                newRecordType == 'inventoryadjustment'){
                    log.debug(logTitle, 'CREATE: Supported Transaction: ' + newRecordType + '. Exiting Script for record creation.');
                    return;
                };
                //Non-Standalone Transaction check for Cash Sales and Invoices
                if ((newRecordType == 'cashsale' ||
                    newRecordType == 'invoice') && createdFrom) {
                    log.debug(logTitle, 'CREATE: Non-standalone transaction, currently supporting');
                    return;   
                }
                //standalone vendor bill check. Actual Weight is only populated via IR/PO
                if (newRecordType == 'vendorbill'){
                    var lineCount = newRecord.getLineCount('item');
                    for (var i = 0; i < lineCount; i++) {
                        var actualWeightPopulated = newRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_cw_act_wght',
                            line: i
                        });
                        log.debug(logTitle, 'CREATE: Vendor Bill Actual Weight Check: ' + actualWeightPopulated);
                        if (actualWeightPopulated) {
                            log.debug(logTitle, 'CREATE: Actual Weight Populated, Non-Standalone Vendor Bill');
                            return;
                        }
                    }
                }
                //Cross workflow Created From Check (Sales to Returns/Credits)
                var createdFromTransType = newRecord.getValue ('custbody_cw_createdfrom_trans_type');
                log.debug(logTitle, 'CREATE: Created From Type: ' + createdFromTransType);
                if ((newRecordType == 'cashrefund' ||
                    newRecordType == 'creditmemo') && 
                    (createdFromTransType !== 'Cash Sale' &&
                    createdFromTransType !== 'Invoice' &&
                    createdFromTransType)) {
                    log.debug(logTitle, 'CREATE: Credit Memo/Cash Refund was created via supported processing');
                    return;
                }
                //standalone/bill created vendor credit check
                if (newRecordType == 'vendorcredit' && 
                    (createdFromTranstype !== 'Bill' &&
                    createdFromTransType)) {
                    log.debug(logTitle, 'CREATE: Vendor Credit was created via supported processing');
                    return;
                }
                //standalone VRMA check
                if(newRecordType =='vendorreturnauthorization' && createdFromTransType){
                    log.debug(logTitle, 'CREATE: VRMA is not standalone, so this is supported processing');
                    return;
                }
                //Inbound Shipment Handling - Run Search to check CW items since no custom columns can be added for IB Shipment record
                if (newRecordType == 'inboundshipment') {
                    log.debug(logTitle, 'CREATE: Inbound Shipment Check');
                    var lineCount = newRecord.getLineCount('items');
                    var itemArray = [];
                    for (var i=0; i< lineCount; i++) {
                        var itemIds = newRecord.getSublistValue({
                            sublistId: 'items',
                            fieldId: 'itemid',
                            line: i
                        }); 
                        itemArray.push (itemIds);
                    
                    }
                    if(itemArray.length > 0){
                        log.debug(logTitle, 'CREATE: Inbound Shipment Item IDs Gathered' + JSON.stringify(itemArray));
                        var idFilter = search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: itemArray
                        });
                        var catchWeightItemSearch = search.load ({
                            id: 'customsearch_cw_current_cw_items'
                        });
                        catchWeightItemSearch.filters.push (idFilter);
                        var firstResult = catchWeightItemSearch.run().getRange(0,1)[0];
                        if(firstResult){
                            throw error.create ({
                                name: "Transaction_Unsupported",
                                message: "Inbound Shipments are Not Supported with Catch Weight Items. Please Receive Catch Weight Items directly from Purchase Orders",
                                notify: false

                            });
                        }
                    }
                }
                if(newRecordType == 'transferorder'){
                    log.debug(logTitle, 'Transfer Order Creation detected. analyzing lines');
                    var lineCount = newRecord.getLineCount('item')
                    for (var i = 0; i < lineCount; i++) {
                        //define how to find catchweight item
                        var hasCatchweightItem = newRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_cw_item_ckbx',
                            line: i
                        });
                        if (hasCatchweightItem == true) {
                            var transferCostSetting = newRecord.getValue('useitemcostastransfercost');
                            log.debug(logTitle, 'Catch Weight Item Found. Itme Cost as Transfer Cost Value: ' + transferCostSetting);
                            if(transferCostSetting == true){
                                return;
                            } else {
                                throw error.create({
                                    name: "Transaction_Unsupported",
                                    message: "Use Item Cost as Transfer Cost must be true for transfer orders containing catch weight items",
                                    notify: false
                                });
                            break;    
                            }
                        }
                    }
                }
                var lineCount = newRecord.getLineCount('item');
                //throw error based on if catchweight items are on the record
                for (var i = 0; i < lineCount; i++) {
                //define how to find catchweight item
                    var hasCatchweightItem = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_item_ckbx',
                        line: i
                    });
                    if (hasCatchweightItem == true) {
                        throw error.create({
                            name: "Transaction_Unsupported",
                            message: "This transaction is not currently supported by Catch Weights.",
                            notify: false
                        });
                    break; 
                    }
                }
            }
            //edit scenarios
            if(context.type == context.UserEventType.EDIT){
                if (newRecordType == 'itemfulfillment' ||
                    newRecordType == 'itemreceipt' || newRecordType == 'inventoryadjustment'){
                    log.debug(logTitle, 'EDIT: in IF statement to evaluate current transactions')
                    var oldRecord = context.oldRecord
                    var sublistId = (newRecordType == 'inventoryadjustment') ? 'inventory' : 'item';
                    var quantityId = (newRecordType == 'inventoryadjustment') ? 'adjustqtyby' : 'quantity';
                    var oldLineCount = oldRecord.getLineCount(sublistId);
                    var newLineCount = oldRecord.getLineCount(sublistId);
                    if(oldLineCount == newLineCount){
                        for(i = 0; i < newLineCount; i++){
                            var catchWeightColumn = newRecord.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custcol_cw_item_ckbx',
                                line: i
                            });
                            if(catchWeightColumn == false){
                                continue;
                            };
                            var oldQty = oldRecord.getSublistValue({
                                sublistId: sublistId,
                                fieldId: quantityId,
                                line: i
                            });
                            var newQty = newRecord.getSublistValue({
                                sublistId: sublistId,
                                fieldId: quantityId,
                                line: i
                            });
                            if(oldQty !== newQty){
                                throw error.create({
                                    name: "Transaction_Unsupported",
                                    message: "Editing Quantity after creation for catch weight items is not supported. Please reverse this transaction if changes are to be made or contact your administrator",
                                    notify: false
                                });
                                break;
                            }
                            var oldCatchWeight = oldRecord.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custcol_cw_catch_weight',
                                line: i
                            }); 
                            var newCatchWeight = newRecord.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custcol_cw_catch_weight',
                                line: i
                            });
                            if(oldCatchWeight !== newCatchWeight){
                                throw error.create({
                                    name: "Transaction_Unsupported",
                                    message: "Editing Catch Weight after creation is not supported. Please return this transaction if changes are to be made or contact your administrator",
                                    notify: false
                                });
                                break;
                            }
                        }
                    }
                    if(oldLineCount > newLineCount){
                        throw error.create({
                            name: "Transaction_Unsupported",
                            message: "Deleting lines after creation with catchweight items on transactions is not supported. Please return this transaction if changes are to be made or contact your administrator",
                            notify: false
                        });
                    }

                }
            }
            //prevent copy / delete for CW Transactions
            if(context.type == context.UserEventType.DELETE ||
                context.type == context.UserEventType.COPY){
                var sublistId = (newRecordType == 'inventoryadjustment') ? 'inventory' : 'item';
                var lineCount = newRecord.getLineCount(sublistId);
                log.debug(logTitle, "COPY/DELETE: Line Count: " + lineCount);
                if(newRecordType !== 'inboundshipment'){
                    for(i=0; i<lineCount; i++){
                        var catchWeightColumn = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_cw_item_ckbx',
                            line: i
                        });
                        if (catchWeightColumn == true){
                            throw error.create({
                                name: "Transaction_Unsupported",
                                message: "This transaction cannot be copied/deleted since it contains catch weight items. Please reverse this transaction if changes are to be made or contact your administrator",
                                notify: false
                            });
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
            if (e.name == 'Transaction_Unsupported') throw e.message;
        }
    }
    return {
        beforeSubmit: beforeSubmit
    }
});