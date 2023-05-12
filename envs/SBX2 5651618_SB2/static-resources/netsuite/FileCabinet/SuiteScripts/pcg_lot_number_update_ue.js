/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/log', 'N/search', 'N/record'],
    function (log, search, record) {
        function afterSubmit(scriptContext) {
            try {
                var mode = scriptContext.type;
                const currentRec = scriptContext.newRecord;
                // get type of the record
                var recType = currentRec.type;
                if (recType == 'purchaseorder') {
                    if (mode == 'edit' || mode == 'create') {
                        var poRec = record.load({
                            type: 'purchaseorder',
                            id: currentRec.id,
                            isDynamic: true
                        });

                        var poNumber = poRec.getValue("tranid");

                        // get the line count
                        var poLineCount = poRec.getLineCount({
                            sublistId: "item"
                        });

                        log.debug("poLineCount", poLineCount);
                        for (var i = 0; i < poLineCount; i++) {
                            poRec.selectLine({
                                sublistId: 'item',
                                line: i
                            });

                            // get the item and validate that item is lot numbered item or not
                            var isnumbered = poRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'isnumbered'
                            });

                            if (isnumbered == 'F') {
                                continue;
                            }

                            lineUniqueNumber = poRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'line'
                            });

                            log.debug("lineUniqueNumber", lineUniqueNumber);

                            var quantity = poRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity'
                            });

                            // validate that line has sublist subrecord
                            var isSublistSubrecord = poRec.hasCurrentSublistSubrecord({
                                sublistId: 'item',
                                fieldId: 'inventorydetail'
                            });
                            log.debug('isSublistSubrecord', isSublistSubrecord);

                            // if no data in inventory detail subrecord then add a new line
                            if (isSublistSubrecord == false) {
                                var subRecord = poRec.getCurrentSublistSubrecord({
                                    sublistId: "item",
                                    fieldId: 'inventorydetail'
                                });
                                log.debug('subRecord', JSON.stringify(subRecord));

                                subRecord.selectNewLine({
                                    "sublistId": 'inventoryassignment'
                                });

                                subRecord.setCurrentSublistValue({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'receiptinventorynumber',
                                    value: poNumber + '-' + lineUniqueNumber,
                                });
                                subRecord.setCurrentSublistValue({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'quantity',
                                    value: quantity
                                });
                                subRecord.commitLine({
                                    "sublistId": 'inventoryassignment'
                                });

                                // commit the line item
                                poRec.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }

                        // save PO record
                        var poID = poRec.save(true, true);
                        log.debug("poID", poID);
                    }
                } else {
                    if (mode == 'edit' || mode == 'create') {
                        var woRec = record.load({
                            type: 'workordercompletion',
                            id: currentRec.id,
                            isDynamic: true
                        });

                        // get document number
                        var docNumber = woRec.getValue('tranid');

                        var qty = woRec.getValue('quantity') || 0;

                        qty = parseInt(qty);
                        log.debug('qty', qty);

                        // verify record has subrecord data or not
                        var isSubrecord = woRec.hasSubrecord({
                            fieldId: 'inventorydetail'
                        });

                        // if no data in inventory detail subrecord then add a new line
                        if (isSubrecord == false && qty > 0) {
                            var subRecord = woRec.getSubrecord({
                                fieldId: 'inventorydetail'
                            });
                            log.debug('subRecord', JSON.stringify(subRecord));

                            subRecord.selectNewLine({
                                "sublistId": 'inventoryassignment'
                            });

                            subRecord.setCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: docNumber
                            });
                            subRecord.setCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                                value: qty
                            });
                            subRecord.commitLine({
                                "sublistId": 'inventoryassignment'
                            });
                        }

                        // save WO record
                        var woID = woRec.save(true, true);
                        log.debug("woID", woID);
                    }
                }

            } catch (error) {
                log.error({
                    title: 'afterSubmit',
                    details: error.message
                });
            }
        }

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

