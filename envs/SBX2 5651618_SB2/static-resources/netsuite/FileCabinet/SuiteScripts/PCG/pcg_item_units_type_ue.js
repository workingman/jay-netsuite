/**
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'], (record) => {

    var afterSubmit = function afterSubmit(context) {
        try {
            var type = context.type;
            if (type == 'create') {
                var rec = context.newRecord;
                // load the record
                var currentRecord = record.load({
                    type: rec.type,
                    id: rec.id,
                    isDynamic: true
                });
                // get base unit
                var unitsType = currentRecord.getValue('unitstype');
                // if base unit is LBS then make search on units type and get CS value
                if (!isNullOrEmpty(unitsType)) {
                    var unitsTypeRec = record.load({
                        type: record.Type.UNITS_TYPE,
                        id: unitsType
                    });
                    var lbLine = unitsTypeRec.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        value: 'LBS'
                    });

                    if (lbLine !== -1) {
                        var isBaseUnit = unitsTypeRec.getSublistValue({
                            sublistId: 'uom',
                            fieldId: 'baseunit',
                            line: lbLine
                        });

                        if (isBaseUnit == true || isBaseUnit == 'T') {
                            // get CS line
                            var csLine = unitsTypeRec.findSublistLineWithValue({
                                sublistId: 'uom',
                                fieldId: 'unitname',
                                value: 'CS'
                            });

                            if (csLine !== -1) {
                                var conversionRate = unitsTypeRec.getSublistValue({
                                    sublistId: 'uom',
                                    fieldId: 'conversionrate',
                                    line: csLine
                                });
                                log.debug("conversionRate", conversionRate);

                                // set conversion rate value
                                currentRecord.setValue('custitem_pcg_tfi_item_lbs_cs', conversionRate);

                                var recId = currentRecord.save(true, true);
                                log.debug("recId", recId);
                            }
                        }
                    }
                }
            }
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