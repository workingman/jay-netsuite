/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/log', 'N/search', 'N/record'],
    function (log, search, record) {
        function afterSubmit(scriptContext) {
            try {
                const currentRec = scriptContext.newRecord;
                var contextType = scriptContext.type;

                // if (currentRec.type == 'inventoryadjustment' && currentRec.getValue({fieldId: 'custbody_qssiph_auto_inc'})) {
                //     log.debug({title: 'custbody_qssiph_auto_inc=TRUE'});
                //     return;
                // }

                if (contextType == 'create' 
                        || (contextType == 'edit' && (currentRec.type == 'itemfulfillment' || currentRec.type == 'inventoryadjustment' || currentRec.type == 'salesorder'))) {
                    // load the record
                    var transactionRec = record.load({
                        type: currentRec.type,
                        id: currentRec.id,
                        isDynamic: true
                    });

                    var sublistid = '';

                    if (currentRec.type == 'inventoryadjustment') {
                        sublistid = 'inventory';
                    } else {
                        sublistid = 'item';
                    }

                    // get the line count
                    var lineCount = transactionRec.getLineCount({
                        sublistId: sublistid
                    });

                    log.debug("lineCount", lineCount);

                    // this will be used to store all lot numbers used in the transaction
                    var lotNumbers = [];

                    // iterte lines and prepare object
                    for (var i = 0; i < lineCount; i++) {
                        transactionRec.selectLine({
                            sublistId: sublistid,
                            line: i
                        });

                        // get sublist subrecord
                        var objSubRecord = transactionRec.getCurrentSublistSubrecord({
                            sublistId: sublistid,
                            fieldId: 'inventorydetail'
                        });

                        objSubRecord.selectLine({
                            sublistId: 'inventoryassignment',
                            line: 0
                        });

                        // get lot number value
                        // var lotNumber = objSubRecord.getCurrentSublistValue({
                        //     sublistId: 'inventoryassignment',
                        //     fieldId: 'receiptinventorynumber'
                        // });
                        var lotNumber = objSubRecord.getCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'numberedrecordid'
                        });

                        // push lot number in lot numbers array
                        lotNumbers.push(lotNumber);
                    }

                    log.debug("lotNumbers", JSON.stringify(lotNumbers));

                    // make a search on transaction to get catch weight values
                    var transactionSearchObj = search.create({
                        type: "transaction",
                        filters:
                            [
                                ["type", "anyof", "InvAdjst", "ItemShip", "ItemRcpt"],
                                "AND",
                                // ["itemnumber.quantityavailable", "greaterthan", "0"],
                                // "AND",
                                // ["itemnumber.quantityonhand", "greaterthan", "0"],
                                // "AND",
                                ["itemnumber.internalid", "anyof", lotNumbers]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "internalid",
                                    join: "itemNumber",
                                    summary: "GROUP",
                                    label: "InternalId"
                                }),
                                search.createColumn({
                                    name: "inventorynumber",
                                    join: "itemNumber",
                                    summary: "GROUP",
                                    label: "Number"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    summary: "SUM",
                                    formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_cw_catch_weight}*-1 ELSE {custcol_cw_catch_weight} END",
                                    label: "Catch Weight (CW)"
                                }),
                                // search.createColumn({
                                //     name: "custcol_pcg_tfi_actual_case_count",
                                //     summary: "SUM",
                                //     label: "Actual Case Count"
                                // }),
                                search.createColumn({
                                    name: "formulanumeric2",
                                    summary: "SUM",
                                    formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_pcg_tfi_actual_case_count}*-1 ELSE {custcol_pcg_tfi_actual_case_count} END",
                                    label: "Actual Case Count"
                                }),
                                // search.createColumn({
                                //     name: "quantityavailable",
                                //     join: "itemNumber",
                                //     summary: "MAX",
                                //     label: "Available"
                                // }),
                                // search.createColumn({
                                //     name: "quantityonhand",
                                //     join: "itemNumber",
                                //     summary: "MAX",
                                //     label: "On Hand"
                                // })
                            ]
                    });

                    // execute the search and get results
                    var searchResults = executeSearch(transactionSearchObj);

                    // this will be used to store lot number details
                    var lotNumberObj = {};

                    // itearte search results and prepare object
                    for (var i = 0; i < searchResults.length; i++) {
                        var lotNumberId = searchResults[i].getValue({
                            name: "internalid",
                            join: "itemNumber",
                            summary: "GROUP"
                        });
                        var actualWeight = searchResults[i].getValue({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_cw_catch_weight}*-1 ELSE {custcol_cw_catch_weight} END"
                        });
                        var actualCaseCount = searchResults[i].getValue({
                            name: "formulanumeric2",
                            summary: "SUM",
                            formula: "CASE WHEN {type}='Item Fulfillment' THEN {custcol_pcg_tfi_actual_case_count}*-1 ELSE {custcol_pcg_tfi_actual_case_count} END"
                        });

                        // store data in lot number object
                        lotNumberObj[lotNumberId] = {
                            actualCaseCount: parseFloat(actualCaseCount),
                            actualWeight: parseFloat(actualWeight),
                        };
                    }

                    log.debug("lotNumberObj", JSON.stringify(lotNumberObj));

                    // iterate lot number obj and update lot number record values
                    for (var lotid in lotNumberObj) {
                        // load inventory number record
                        var lotRec = record.load({
                            type: 'inventorynumber',
                            id: lotid,
                            isDynamic: true
                        });

                        var doNotUpdate = lotRec.getValue({
                            fieldId: 'custitemnumber_pcg_lot_hdr_noupdate_at_all'
                        });

                        if (doNotUpdate) {
                            continue;
                        }

                        var initialLotRatio = lotRec.getValue({
                            fieldId: 'custitemnumbertfi_pcg_initial_ratio_lb_cs',
                        });

                        var firstDynamicDataUpdate = lotRec.getValue({
                            fieldId: 'custitemnumber_pcg_tfi_dynamic_data_first'
                        });

                        // get locations sublist line count
                        var locationSublistCount = lotRec.getLineCount('locations');

                        var actualWeight = 0;
                        var availableWeight = 0;
                        // iterate locations and calculate actual weight and available weight
                        for (var i = 0; i < locationSublistCount; i++) {
                            lotRec.selectLine({
                                sublistId: 'locations',
                                line: i
                            });
                            // var actWt = lotRec.getCurrentSublistValue({
                            //     sublistId: 'locations',
                            //     fieldId: 'quantityonhandbase'
                            // });

                            var avlWt = lotRec.getCurrentSublistValue({
                                sublistId: 'locations',
                                fieldId: 'quantityavailablebase'
                            });

                            // actualWeight = parseFloat(actualWeight) + parseFloat(actWt);
                            availableWeight = parseFloat(availableWeight) + parseFloat(avlWt);
                        }

                        actualWeight = lotNumberObj[lotid].actualWeight;

                        var actualCaseCount = 0;
                        if (!firstDynamicDataUpdate || (new Date(firstDynamicDataUpdate).getTime() > new Date('2023-04-22T00:00:00.000Z').getTime())) {
                            actualCaseCount = lotNumberObj[lotid].actualCaseCount;
                        } else {
                            actualCaseCount = actualWeight / initialLotRatio;
                        }
                        actualCaseCount = Math.ceil(actualCaseCount);

                        // set values to lot record
                        lotRec.setValue('custitemnumberpcg_lot_avail_weight', availableWeight);

                        // lotRec.setValue('custitemnumber_pcg_tfi_case_box_count', actualCaseCount);
                        // lotRec.setValue('custitemnumber_tfi_pcg_lot_avail_cases', Math.ceil(availableCases));
                        if (currentRec.type == 'itemfulfillment') {
                            // get ship status
                            var shipStatus = transactionRec.getText('shipstatus');
                            if (shipStatus === 'Shipped') {
                                log.debug({title: 'Status is Shipped'});
                                lotRec.setValue('custitemnumber_pcg_tfi_catch_weight', actualWeight);
                                lotRec.setValue('custitemnumber_pcg_tfi_case_box_count', actualCaseCount);
                            } else {
                                actualWeight = lotRec.getValue('custitemnumber_pcg_tfi_catch_weight');
                                actualCaseCount = lotRec.getValue('custitemnumber_pcg_tfi_case_box_count');
                            }
                        } else {
                            lotRec.setValue('custitemnumber_pcg_tfi_catch_weight', actualWeight);
                            lotRec.setValue('custitemnumber_pcg_tfi_case_box_count', actualCaseCount);
                        }

                        log.debug({title: 'availableCases', details: availableWeight + '/' + actualWeight + '*' + actualCaseCount});

                        // calculate available cases

                        var availableCases = 0;

                        if (actualWeight) {
                            availableCases = Math.ceil((availableWeight / actualWeight) * actualCaseCount);
                        }

                        lotRec.setValue('custitemnumber_tfi_pcg_lot_avail_cases', availableCases);

                        lotRec.setValue('custitemnumber_pcg_tfi_dynamic_data_last', new Date());

                        // save the record
                        var lotRecID = lotRec.save(true, true);
                        log.debug("lotRecID", lotRecID);
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
       * helper function to get the search results
       */
        function executeSearch(srch) {
            var results = [];

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
