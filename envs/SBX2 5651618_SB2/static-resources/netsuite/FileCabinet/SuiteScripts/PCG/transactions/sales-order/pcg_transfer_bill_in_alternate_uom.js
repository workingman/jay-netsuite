/**
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'], (record) => {

    var afterSubmit = function afterSubmit(context) {
        try {
            var rec = context.newRecord;
            // load the record
            var currentRecord = record.load({
                type: rec.type,
                id: rec.id,
                isDynamic: true
            });
            // get bill in alternate UOM value
            var isBillAlternateUOM = currentRecord.getValue('custbody1');

            // get line count of the order
            var lineCount = currentRecord.getLineCount('item');

            // iterate lines and update the bill in Alternate UOM for all lines
            for (var i = 0; i < lineCount; i++) {
                // select line item
                currentRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });

                // set value to bill in alternate UOM field
                currentRecord.setCurrentSublistValue('item', 'custcol_tfi_alternative_uom', isBillAlternateUOM);

                // commit line item
                currentRecord.commitLine({
                    sublistId: 'item'
                });
            }

            var recId = currentRecord.save(true, true);
            log.debug("recId", recId);

        } catch (e) {
            log.error('error in afterSubmit', e);
        }

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