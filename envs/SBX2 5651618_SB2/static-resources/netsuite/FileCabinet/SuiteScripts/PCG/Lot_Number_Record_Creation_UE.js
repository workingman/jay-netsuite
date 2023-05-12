/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/log', 'N/search', 'N/record'],
    function (log, search, record) {
        function afterSubmit(scriptContext) {
            try {
                log.debug("script fired", "after submit fired");

                const currentRec = scriptContext.newRecord;
                var contextType = scriptContext.type;
                if (contextType == 'create' || contextType == 'edit') {

                    var recID = currentRec.id;

                    // load the record
                    var transactionRec = record.load({
                        type: currentRec.type,
                        id: recID,
                        isDynamic: true
                    });

                    var sublistid = '';
                    var rateFieldID = '';

                    if (currentRec.type == 'inventoryadjustment') {
                        sublistid = 'inventory';
                        rateFieldID = 'unitcost';
                    } else {
                        sublistid = 'item';
                        rateFieldID = 'rate';
                    }

                    // get the line count
                    var lineCount = transactionRec.getLineCount({
                        sublistId: sublistid
                    });

                    log.debug("lineCount", lineCount);

                    // this will be used to store all lot numbers used in the transaction
                    var lotNumberObj = {};

                    // iterte lines and prepare object
                    for (var i = 0; i < lineCount; i++) {
                        transactionRec.selectLine({
                            sublistId: sublistid,
                            line: i
                        });

                        // get lot number column fields
                        var boxID = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_qssiph_box_id'
                        });

                        var establishNumber = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_tfi_establishment_number'
                        });

                        var shippingMark = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_qssiph_shipping_mark'
                        });

                        var ecoliCertificate = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_tfi_ecoli_cert_number'
                        });

                        var sellByDate = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_tfi_sell_by_date'
                        });

                        var availableToSellDate = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_tfi_lot_avail_sell'
                        });

                        var freezeDate = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_tfi_freeze_use_by_date'
                        });

                        var line = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'line'
                        });

                        // var actualWeight = transactionRec.getCurrentSublistValue({
                        //     sublistId: sublistid,
                        //     fieldId: 'custcol_cw_catch_weight'
                        // });

                        // var actualCaseCount = transactionRec.getCurrentSublistValue({
                        //     sublistId: sublistid,
                        //     fieldId: 'custcol_pcg_tfi_actual_case_count'
                        // });

                        // var initialLotRatioLBPerCS = actualWeight / actualCaseCount;

                        // var lotInvCostPerLB = transactionRec.getCurrentSublistValue({
                        //     sublistId: sublistid,
                        //     fieldId: rateFieldID
                        // });

                        var location = null;
                        log.debug({title: 'transactionRec.type', details: transactionRec.type});
                        if (transactionRec.type === record.Type.PURCHASE_ORDER) {
                            location = transactionRec.getValue({
                                fieldId: 'location'
                            });
                            log.debug({title: 'location', details: location});
                        } else {
                            location = transactionRec.getCurrentSublistValue({
                                sublistId: sublistid,
                                fieldId: 'location'
                            });
                        }

                        var initialLotRatioLBPerCS = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_initial_ratio_lb_cs'
                        });

                        var lotInvCostPerLB = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_pcg_tfi_lot_cost_per_lb'
                        });

                        var packDate = transactionRec.getCurrentSublistValue({
                            sublistId: sublistid,
                            fieldId: 'custcol_qssiph_pack_date'
                        });

                        // get sublist subrecord
                        var objSubRecord = transactionRec.getCurrentSublistSubrecord({
                            sublistId: sublistid,
                            fieldId: 'inventorydetail'
                        });

                        if (!isNullOrEmpty(objSubRecord)) {

                            objSubRecord.selectLine({
                                sublistId: 'inventoryassignment',
                                line: 0
                            });

                            // get lot number value
                            // var lotNumber = objSubRecord.getCurrentSublistValue({
                            //     sublistId: 'inventoryassignment',
                            //     fieldId: 'receiptinventorynumber'
                            // });

                            var lotNumberId = objSubRecord.getCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'numberedrecordid'
                            });

                            lotNumberObj[lotNumberId] = {
                                boxID: boxID,
                                establishNumber: establishNumber,
                                shippingMark: shippingMark,
                                ecoliCertificate: ecoliCertificate,
                                packDate: packDate,
                                sellByDate: sellByDate,
                                availableToSellDate: availableToSellDate,
                                freezeDate: freezeDate,
                                location: location,
                                initialLotRatioLBPerCS: initialLotRatioLBPerCS,
                                lotInvCostPerLB: lotInvCostPerLB,
                                line: line
                            };

                            // load lot record and get source transaction
                            var lotRecSearchFields = search.lookupFields({
                                type: 'inventorynumber',
                                id: lotNumberId,
                                columns: ['custitemnumber_tfi_pcg_source_trx_number']
                            });

                            // get source transaction
                            var sourceTransaction = lotRecSearchFields.custitemnumber_tfi_pcg_source_trx_number[0].value;

                            log.debug("sourceTransaction", sourceTransaction);
                            if (isNullOrEmpty(sourceTransaction)) {
                                // set lot inception and lot header update values
                                transactionRec.setCurrentSublistValue({
                                    sublistId: sublistid,
                                    fieldId: 'custcol_pcg_tfi_trx_creates_new_lot',
                                    value: true
                                });
                            } else {
                                // set lot inception and lot header update values
                                transactionRec.setCurrentSublistValue({
                                    sublistId: sublistid,
                                    fieldId: 'custcol_pcg_tfi_trx_creates_new_lot',
                                    value: false
                                });
                            }

                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistid,
                                fieldId: 'custcol_pcg_lot_header_timestamp',
                                value: new Date()
                            });
                            transactionRec.commitLine({
                                sublistId: sublistid
                            });
                        }
                    }

                    log.debug("lotNumberObj", JSON.stringify(lotNumberObj));

                    // itertae lot number obj
                    for (var lotid in lotNumberObj) {
                        // load inventory number record
                        var lotRec = record.load({
                            type: 'inventorynumber',
                            id: lotid,
                            isDynamic: true
                        });

                        // set values to lot number record

                        var firstStaticDataUpdate = lotRec.getValue({
                            fieldId: 'custitemnumber_pcg_tfi_static_data_first'
                        });

                        if (!firstStaticDataUpdate || transactionRec.type != 'inventoryadjustment') {
                            lotRec.setValue('custitemnumber_qssiph_box_id', lotNumberObj[lotid].boxID);
                            lotRec.setValue('custitemnumber_pcg_tfi_establishment_number', lotNumberObj[lotid].establishNumber);
                            lotRec.setValue('custitemnumber_qssiph_shipping_mark', lotNumberObj[lotid].shippingMark);
                            lotRec.setValue('custitemnumber_pcg_tfi_ecoli_cert_number', lotNumberObj[lotid].ecoliCertificate);
                            lotRec.setValue('custitemnumbertfi_sell_by_date', lotNumberObj[lotid].sellByDate);
                            lotRec.setValue('custitemnumber_pcg_tfi_lot_avail_sell', lotNumberObj[lotid].availableToSellDate);
                            lotRec.setValue('custitemnumbertfi_freeze_use_by_date', lotNumberObj[lotid].freezeDate);
                            lotRec.setValue('custitemnumber_qssiph_pack_date', lotNumberObj[lotid].packDate);

                            if (!firstStaticDataUpdate) {
                                lotRec.setValue('custitemnumber_pcg_tfi_static_data_first', new Date());
                            }

                            lotRec.setValue('custitemnumber_pcg_tfi_static_data_last', new Date());
                            lotRec.setValue('custitemnumber_pcg_tfi_dynamic_data_first', new Date());
                            lotRec.setValue('custitemnumber_pcg_tfi_dynamic_data_last', new Date());
                            // if (currentRec.type != 'itemreceipt') {
                            lotRec.setValue('custitemnumber_tfi_pcg_source_trx_number', recID);

                            var sourceTransactionType = transactionRec.type;
                            switch (sourceTransactionType) {
                                case 'inventoryadjustment':
                                    sourceTransactionType = 'Inventory Adjustment';
                                    break;
                                case 'itemreceipt':
                                    sourceTransactionType = 'Item Receipt';
                                    break;
                                case 'purchaseorder':
                                    sourceTransactionType = 'Purchase Order';
                                    break;
                                default:
                            }
                            lotRec.setValue('custitemnumber_tfi_pcg_source_trx_type', sourceTransactionType);

                            lotRec.setValue('custitemnumber_tfi_pcg_source_location', lotNumberObj[lotid].location);
                            // }
                            lotRec.setValue('custitemnumbertfi_pcg_initial_ratio_lb_cs', lotNumberObj[lotid].initialLotRatioLBPerCS);
                            lotRec.setValue('custitemnumber_pcg_tfi_lot_cost_per_lb', lotNumberObj[lotid].lotInvCostPerLB);
                            lotRec.setValue('custitemnumber_pcg_tfi_first_trx_line_id', lotNumberObj[lotid].line);

                            // save lot number record
                            var lotRecID = lotRec.save(true, true);
                            log.debug("lotRecID", lotRecID);
                        }
                    }

                    // save the record
                    var transactionRecID = transactionRec.save(true, true);
                    log.debug("transactionRecID", transactionRecID);
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
