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

                    var sublistID = "";

                    if (currentRec.type == "inventoryadjustment") {
                        sublistID = 'inventory';
                    } else {
                        sublistID = 'item';
                    }

                    // load the record
                    var transactionRec = record.load({
                        type: currentRec.type,
                        id: recID,
                        isDynamic: true
                    });

                    // get the line count
                    var lineCount = transactionRec.getLineCount({
                        sublistId: sublistID
                    });

                    log.debug("lineCount", lineCount);

                    // iterte lines and prepare object
                    for (var i = 0; i < lineCount; i++) {
                        transactionRec.selectLine({
                            sublistId: sublistID,
                            line: i
                        });

                        // get values from line and set it to orginal values
                        var actualCaseCount = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_pcg_tfi_actual_case_count'
                        });

                        var catchWeight = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_cw_catch_weight'
                        });


                        var estRatePerLB = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_est_rate_lb'
                        });

                        var estRatePerCS = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_est_rate_cs'
                        });

                        var approximateWeightPerCS = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_pcg_approxweight_cs'
                        });

                        var approximateWeightPerLB = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_pcg_approxweight'
                        });

                        log.debug("initial values", "actualCaseCount: " + actualCaseCount + "--- catchWeight: " + catchWeight + "--- estRatePerLB: " + estRatePerLB + "--- estRatePerCS: " + estRatePerCS + "--- approximateWeightPerCS: " + approximateWeightPerCS + "--- approximateWeightPerLB: " + approximateWeightPerLB);

                        // get the original values and validate if the values populated or not
                        // if not populated then populate it, if already populated don't do anything
                        var orgActualCaseCount = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcolpcg_tfi_org_actual_case_count'
                        });

                        var orgCatchWeight = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcol_org_cw_catch_weight'
                        });


                        var orgEstRatePerLB = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcolest_org_rate_lb'
                        });

                        var orgEstRatePerCS = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcolest_org_rate_cs'
                        });

                        var orgApproximateWeightPerCS = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcolpcg_org_approxweight_cs'
                        });

                        var orgApproximateWeightPerLB = transactionRec.getCurrentSublistValue({
                            sublistId: sublistID,
                            fieldId: 'custcolpcg_org_approxweight'
                        });

                        // set values to original fields
                        if (isNullOrEmpty(orgActualCaseCount)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcolpcg_tfi_org_actual_case_count',
                                value: actualCaseCount
                            });
                        }
                        if (isNullOrEmpty(orgCatchWeight)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcol_org_cw_catch_weight',
                                value: catchWeight
                            });
                        }
                        if (isNullOrEmpty(orgEstRatePerCS)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcolest_org_rate_cs',
                                value: estRatePerCS
                            });
                        }
                        if (isNullOrEmpty(orgEstRatePerLB)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcolest_org_rate_lb',
                                value: estRatePerLB
                            });
                        }
                        if (isNullOrEmpty(orgApproximateWeightPerCS)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcolpcg_org_approxweight_cs',
                                value: approximateWeightPerCS
                            });
                        }
                        if (isNullOrEmpty(orgApproximateWeightPerLB)) {
                            transactionRec.setCurrentSublistValue({
                                sublistId: sublistID,
                                fieldId: 'custcolpcg_org_approxweight',
                                value: approximateWeightPerLB
                            });
                        }

                        // commit the line item
                        transactionRec.commitLine({
                            sublistId: sublistID
                        });
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

