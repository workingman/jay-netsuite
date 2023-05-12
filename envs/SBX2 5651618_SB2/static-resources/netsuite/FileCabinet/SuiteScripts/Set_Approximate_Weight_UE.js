/**
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'SuiteScripts/PCG/transaction-line-approx-weight/lib/pcg_approxweight_lib'], (record, pcg_approxweight_lib) => {

    var afterSubmit = function afterSubmit(context) {
        var rec = context.newRecord;

        var contextType = context.type;

        // load the record
        var currentRecord = record.load({
            type: rec.type,
            id: rec.id,
            isDynamic: true
        });

        // get line count
        var lineCount = currentRecord.getLineCount('item');
        // iterate lines and update approx weight values in line level
        for (var i = 0; i < lineCount; i++) {
            try {
                // selcet line item
                currentRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });
                // call library function to update values
                pcg_approxweight_lib.setApproxWeight({
                    currentRecord: currentRecord
                });

                // get case field value
                var caseValue = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_so_line_cases'
                });

                var orgCaseValue = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolpcg_tfi_org_actual_case_count'
                });

                if (isNullOrEmpty(orgCaseValue) && (contextType == 'create' || contextType == 'edit')) {
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolpcg_tfi_org_actual_case_count',
                        value: caseValue
                    });
                }

                if (contextType == 'create' && !isNullOrEmpty(caseValue)) {
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: caseValue
                    });
                }
                if (contextType == 'edit' && !isNullOrEmpty(caseValue)) {
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: caseValue
                    });
                }
                // commit line item
                currentRecord.commitLine({
                    sublistId: 'item'
                });
            } catch (e) {
                log.error("error while updating weight values", e.message)
            }
        }

        // save the record
        var recId = currentRecord.save(true, true);
        log.debug("recId", recId);
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
        'afterSubmit': afterSubmit
    };
});