/**
*@NApiVersion 2.x
*@NScriptType UserEventScript
*/

define(['N/record', 'N/search'],
    function (record, search) {
        function afterSubmit(_context) {
            try {
                var newRec = _context.newRecord;
                // get record id and type values
                var recId = newRec.id;
                var recType = newRec.type;

                var lotfieldId = "";

                if (recType == 'invoice') {
                    lotfieldId = "issueinventorynumber";
                } else {
                    lotfieldId = "receiptinventorynumber";
                }

                // load the record
                var rec = record.load({
                    type: recType,
                    id: recId,
                    isDynamic: true
                });

                // get item line count
                var lineCount = rec.getLineCount('item');

                var itemObj = {};

                // iterate line count and get item and catch weight value
                for (var i = 0; i < lineCount; i++) {
                    rec.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    var item = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });

                    // validate the item is catch weight item or not
                    var itemLookupFields = search.lookupFields({
                        type: 'item',
                        id: item,
                        columns: ['custitem_cw_catch_weight_item', 'unitstype']
                    });

                    var isCatchWeightItem = itemLookupFields.custitem_cw_catch_weight_item;

                    if (isCatchWeightItem == true || isCatchWeightItem == 'T') {
                        var unitsType = record.load({
                            type: record.Type.UNITS_TYPE,
                            id: itemLookupFields.unitstype[0].value
                        });
                        var lbLine = unitsType.findSublistLineWithValue({
                            sublistId: 'uom',
                            fieldId: 'unitname',
                            value: 'LB'
                        });
                        if (lbLine !== -1) {
                            var lbInternalId = unitsType.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'internalid',
                                line: lbLine
                            });
                            log.debug("lbInternalId", lbInternalId);
                            // get units and catch weight value
                            var units = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'units'
                            });

                            // get order doc number
                            var orderId = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'orderdoc'
                            });
                            log.debug("orderId", orderId);
                            var orderLine = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'orderline'
                            });

                            // get catch weight from item receipt
                            if (recType == 'invoice') {
                                var catchWeightObj = getCatchWeightFromIF(orderId);
                            } else {
                                var catchWeightObj = getCatchWeightFromIR(orderId);
                            }

                            var catchWeight = catchWeightObj[item];

                            log.debug("catchWeight", catchWeight);

                            // var catchWeight = rec.getCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'custcol_cw_catch_weight'
                            // });

                            var rate = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate'
                            });
                            var amount = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount'
                            });
                            var lineUniqueKey = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'lineuniquekey'
                            });
                            var caseQty = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity'
                            });

                            // validate that units is of not LB and catch weight has value
                            if (units != lbInternalId && !isNullOrEmpty(catchWeight)) {
                                // get inventory details subrecord
                                var subRecord = rec.getCurrentSublistSubrecord({
                                    sublistId: "item",
                                    fieldId: 'inventorydetail'
                                });
                                log.debug('subRecord', JSON.stringify(subRecord));

                                // var subrecord1 = recCopy.getCurrentSublistSubrecord({
                                //     sublistId: "item",
                                //     fieldId: 'inventorydetail'
                                // });

                                // get subrecord line count
                                var subRecordLineCount = subRecord.getLineCount('inventoryassignment');
                                log.debug("subRecordLineCount", subRecordLineCount);
                                var inventoryDetails = [];
                                // iterate subrecord lines
                                for (var j = 0; j < subRecordLineCount; j++) {
                                    subRecord.selectLine({
                                        sublistId: 'inventoryassignment',
                                        line: j
                                    });
                                    // get lot number and status
                                    var lotNumber = subRecord.getCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: lotfieldId
                                    });
                                    var status = subRecord.getCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'inventorystatus'
                                    });
                                    var quantity = subRecord.getCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'quantity'
                                    });
                                    inventoryDetails.push({
                                        'lotnumber': lotNumber,
                                        'status': status,
                                        'quantity': quantity
                                    });
                                }
                                log.debug('inventoryDetails', JSON.stringify(inventoryDetails));

                                var lineKey = item + "_" + lineUniqueKey;

                                itemObj[lineKey] = {
                                    item: item,
                                    units: lbInternalId,
                                    quantity: catchWeight,
                                    rate: rate,
                                    amount: amount,
                                    caseQty: caseQty,
                                    orderId: orderId,
                                    orderLine: orderLine,
                                    inventoryDetails: inventoryDetails
                                }
                                log.debug("itemObj", itemObj);
                            }
                        }
                    }
                }

                // iterate item obj and remove the line items
                for (var j = lineCount - 1; j >= 0; j--) {
                    var itemid = rec.getSublistValue('item', 'item', j);
                    var line = rec.getSublistValue('item', 'lineuniquekey', j);
                    var itemkey = itemid + "_" + line;
                    // if key exists in item obj then remove the line
                    if (itemkey in itemObj) {
                        rec.removeLine({
                            sublistId: 'item',
                            line: j
                        });
                        log.debug("remove line", "line removed");
                    }
                }

                // iterate item obj and create new line items 
                for (var itemkey in itemObj) {
                    // get catch weight quantity
                    var catchweightQty = itemObj[itemkey].quantity;
                    rec.selectNewLine({
                        sublistId: 'item'
                    });
                    // set values to line 
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemObj[itemkey].item
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'units',
                        value: itemObj[itemkey].units
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: catchweightQty
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight',
                        value: catchweightQty
                    });

                    // rec.setCurrentSublistValue({
                    //     sublistId: 'item',
                    //     fieldId: 'rate',
                    //     value: itemObj[itemkey].rate
                    // });
                    // rec.setCurrentSublistValue({
                    //     sublistId: 'item',
                    //     fieldId: 'amount',
                    //     value: itemObj[itemkey].amount
                    // });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'orderdoc',
                        value: itemObj[itemkey].orderId
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'orderline',
                        value: itemObj[itemkey].orderLine
                    });

                    var newSubRecord = rec.getCurrentSublistSubrecord({
                        sublistId: "item",
                        fieldId: 'inventorydetail'
                    });
                    log.debug("newSubRecord", JSON.stringify(newSubRecord));

                    // get inventory details from item obj
                    var inventoryDetails = itemObj[itemkey].inventoryDetails;

                    // this will be used to identify how much quantity assigned 
                    var assignedLotQuatnity = 0;

                    // iterate inventory details and add line
                    for (var k = 0; k < inventoryDetails.length; k++) {
                        // calculate the lot quantity for the line
                        var lotQty = 0;
                        if (k == (inventoryDetails.length - 1)) {
                            lotQty = parseFloat(catchweightQty) - parseFloat(assignedLotQuatnity);
                        } else {
                            lotQty = (inventoryDetails[k].quantity / itemObj[itemkey].caseQty) * catchweightQty;
                        }

                        lotQty = parseFloat(lotQty).toFixed(2);
                        log.debug("lotQty", lotQty);
                        // add lot qty to the assigned qty varaible
                        assignedLotQuatnity = parseFloat(assignedLotQuatnity) + parseFloat(lotQty);

                        newSubRecord.selectNewLine({
                            sublistId: 'inventoryassignment'
                        });

                        // set values to line
                        newSubRecord.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: lotfieldId,
                            value: inventoryDetails[k].lotnumber
                        });
                        // newSubRecord.setCurrentSublistValue({
                        //     sublistId: 'inventoryassignment',
                        //     fieldId: 'inventorystatus',
                        //     value: inventoryDetails[k].status
                        // });

                        newSubRecord.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: lotQty
                        });
                        newSubRecord.commitLine({
                            sublistId: 'inventoryassignment'
                        });
                    }

                    // commit line item
                    rec.commitLine({
                        sublistId: 'item'
                    });
                }

                // save the record
                var savedRecId = rec.save(true, true);
                log.debug("savedRecId", savedRecId);

            } catch (e) {
                log.debug({ title: 'Error in afterSubmit', details: e.toString() });
            }
        }

        function getCatchWeightFromIR(orderId) {
            var catchWeightObj = {};
            try {
                // make search on item receipt
                var itemReceiptSearch = search.create({
                    type: "itemreceipt",
                    filters:
                        [
                            ["type", "anyof", "ItemRcpt"],
                            "AND",
                            ["createdfrom", "anyof", orderId],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["item", "noneof", "@NONE@"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "item", label: "Item" }),
                            // search.createColumn({ name: "line", label: "Line ID" }),
                            search.createColumn({ name: "custcol_cw_catch_weight", label: "Catch Weight (CW)" })
                        ]
                });

                // execute the search
                var searchResults = executeSearch(itemReceiptSearch);

                // iterate search results
                for (var i = 0; i < searchResults.length; i++) {
                    var item = searchResults[i].getValue('item');
                    //  var ordeline = searchResults[i].getValue('line');
                    var catchWeight = searchResults[i].getValue('custcol_cw_catch_weight');

                    // store values in catch weight obj
                    catchWeightObj[item] = catchWeight;
                }
                log.debug("catchWeightObj", JSON.stringify(catchWeightObj));

            } catch (e) {
                log.error("error in getCatchWeightFromIR", e);
            }
            return catchWeightObj;
        }

        function getCatchWeightFromIF(orderId) {
            var catchWeightObj = {};
            try {
                // make search on item receipt
                var itemFulfillmentSearch = search.create({
                    type: "itemfulfillment",
                    filters:
                        [
                            ["createdfrom", "anyof", orderId],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["item", "noneof", "@NONE@"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "item", label: "Item" }),
                            // search.createColumn({ name: "line", label: "Line ID" }),
                            search.createColumn({ name: "custcol_cw_catch_weight", label: "Catch Weight (CW)" })
                        ]
                });

                // execute the search
                var searchResults = executeSearch(itemFulfillmentSearch);

                // iterate search results
                for (var i = 0; i < searchResults.length; i++) {
                    var item = searchResults[i].getValue('item');
                    //  var ordeline = searchResults[i].getValue('line');
                    var catchWeight = searchResults[i].getValue('custcol_cw_catch_weight');

                    // store values in catch weight obj
                    catchWeightObj[item] = catchWeight;
                }
                log.debug("catchWeightObj", JSON.stringify(catchWeightObj));

            } catch (e) {
                log.error("error in getCatchWeightFromIF", e);
            }
            return catchWeightObj;
        }

        var executeSearch = function (srch) {
            var results = [];

            //var pagedData = srch.runPaged();
            var pagedData = srch.runPaged({
                pageSize: 1000
            });
            pagedData.pageRanges.forEach(function (pageRange) {
                var page = pagedData.fetch({
                    index: pageRange.index
                });
                page.data.forEach(function (result) {
                    results.push(result);
                });
            });

            return results;
        };

        /*
       * Validating if value is null or empty
       */
        function isNullOrEmpty(val) {
            if (val == null || val == '' || val == "" || val == 'undefined' || val == [] || val == {} || val == 'NaN') {
                return true;
            } else {
                return false;
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });