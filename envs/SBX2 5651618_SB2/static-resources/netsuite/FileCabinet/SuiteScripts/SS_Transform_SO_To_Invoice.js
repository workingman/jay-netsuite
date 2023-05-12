/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search'],
    /**
     * @param {file} file
     * @param {log} log
     * @param {record} record
     */
    function (record, search) {
        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {
            try {
                log.debug("schedule script fired", "schedule script fired");

                var rec = record.transform({
                    fromType: 'salesorder',
                    fromId: 14722,
                    toType: 'invoice',
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
                            var catchWeight = rec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_cw_catch_weight'
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
                                        fieldId: 'issueinventorynumber'
                                    });
                                    var status = subRecord.getCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'inventorystatus'
                                    });
                                    inventoryDetails.push({
                                        'lotnumber': lotNumber,
                                        'status': status
                                    });
                                }
                                log.debug('inventoryDetails', JSON.stringify(inventoryDetails));

                                itemObj[item] = {
                                    units: lbInternalId,
                                    quantity: catchWeight
                                }
                                log.debug("itemObj", itemObj);
                            }
                        }
                    }
                }

                for (var k = 0; k < lineCount; k++) {
                    rec.removeLine({
                        sublistId: 'item',
                        line: k
                    });
                    log.debug("remove line", "line removed");
                }

                // iterate item obj
                for (var itemid in itemObj) {
                    rec.selectNewLine({
                        sublistId: 'item'
                    });
                    // set values to line 
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemid
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'units',
                        value: itemObj[itemid].units
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: itemObj[itemid].quantity
                    });

                    var newSubRecord = rec.getCurrentSublistSubrecord({
                        sublistId: "item",
                        fieldId: 'inventorydetail'
                    });
                    log.debug("newSubRecord", JSON.stringify(newSubRecord));

                    // iterate inventory details and add line
                    for (var k = 0; k < inventoryDetails.length; k++) {
                        newSubRecord.selectNewLine({
                            sublistId: 'inventoryassignment'
                        });
                        // set values to line
                        newSubRecord.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
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
                            value: itemObj[itemid].quantity
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
                log.error("error in execute()", e);
            }
        }

        var executeSearch = function (srch) {
            var results = [];

            var pagedData = srch.runPaged();
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
            execute: execute
        };
    });