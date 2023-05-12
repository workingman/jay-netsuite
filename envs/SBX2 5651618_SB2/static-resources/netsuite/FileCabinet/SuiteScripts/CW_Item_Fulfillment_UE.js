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
                // load the record
                var ifRec = record.load({
                    type: currentRec.type,
                    id: currentRec.id,
                    isDynamic: true
                });

                var soID = ifRec.getValue("createdfrom");

                // get the line count
                var ifLineCount = ifRec.getLineCount({
                    sublistId: "item"
                });

                log.debug("ifLineCount", ifLineCount);
                var ifObj = {};
                // iterte lines and prepare object
                for (var i = 0; i < ifLineCount; i++) {
                    ifRec.selectLine({
                        sublistId: 'item',
                        line: i
                    });

                    // get item, catch weight and actual case count valuess
                    var item = ifRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });

                    var catchWeight = ifRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight'
                    });

                    var actualCaseCount = ifRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count'
                    });

                    ifObj[item] = {
                        catchWeight: catchWeight,
                        actualCaseCount: actualCaseCount
                    }
                }

                log.debug("ifObj", JSON.stringify(ifObj));

                if (!isNullOrEmpty(soID)) {
                    // load the SO record and update line items
                    var soRec = record.load({
                        type: 'salesorder',
                        id: soID,
                        isDynamic: true
                    });

                    // get so line count
                    var soLineCount = soRec.getLineCount('item');

                    // iterate so line items
                    for (var i = 0; i < soLineCount; i++) {
                        soRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });

                        // get item, catch weight and actual case count valuess
                        var soItem = soRec.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item'
                        });

                        var obj = ifObj[soItem];

                        if (!isNullOrEmpty(obj)) {
                            // get catch weight and actual case count values from IF obj
                            var actualWeight = ifObj[soItem].catchWeight;
                            var caseCount = ifObj[soItem].actualCaseCount;

                            // set catch wieght and case count values in so line
                            soRec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_cw_catch_weight',
                                value: actualWeight
                            });
                            soRec.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_pcg_tfi_actual_case_count',
                                value: caseCount
                            });
                            soRec.commitLine({
                                sublistId: 'item'
                            });
                        }
                    }

                    // save PO record
                    var soID = soRec.save(true, true);
                    log.debug("soID", soID);
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

