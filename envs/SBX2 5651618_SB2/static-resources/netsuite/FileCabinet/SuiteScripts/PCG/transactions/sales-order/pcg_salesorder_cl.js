/**
* @NApiVersion 2.1
* @NScriptType ClientScript
*/

define(['N/log', '../../transaction-line-approx-weight/lib/pcg_approxweight_lib', 'N/search', 'N/record'],
    (log, pcg_approxweight_lib, search, record) => {

        function fieldChanged(context) {
            const currentRecord = context.currentRecord;
            const sublistId = context.sublistId;
            const fieldId = context.fieldId;

            // field change on item
            if (fieldId === 'item') {
                var itemId = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                if (!isNullOrEmpty(itemId)) {
                    // make item lookup and get conversion rates for units type
                    var itemLookup = search.lookupFields({
                        type: search.Type.ITEM,
                        id: itemId,
                        columns: ['unitstype', 'saleunit']
                    });

                    if (!itemLookup.saleunit.length || !itemLookup.unitstype.length) {
                        return;
                    }

                    var saleUnit = itemLookup.saleunit[0].text;
                    // alert("saleUnit: " + saleUnit);

                    if (saleUnit == "LBS") {
                        var unitsType = record.load({
                            type: record.Type.UNITS_TYPE,
                            id: itemLookup.unitstype[0].value
                        });

                        var csLine = unitsType.findSublistLineWithValue({
                            sublistId: 'uom',
                            fieldId: 'unitname',
                            value: 'CS'
                        });

                        if (csLine === -1) {
                            csLine = unitsType.findSublistLineWithValue({
                                sublistId: 'uom',
                                fieldId: 'unitname',
                                value: 'Cs'
                            });
                        }

                        if (csLine !== -1) {
                            //  alert("inside cs line");
                            var csConversionRate = unitsType.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'conversionrate',
                                line: csLine
                            });
                            //  alert("csConversionRate: " + csConversionRate);
                            // set LBS/case value for the line item
                            currentRecord.setCurrentSublistValue('item', 'custcol_so_line_lbs_per_case', csConversionRate);
                        }
                    }
                }
            }

            if (fieldId === 'custcol_so_line_cases') {
                var lbsPerCase = currentRecord.getCurrentSublistValue('item', 'custcol_so_line_lbs_per_case');
                if (!isNullOrEmpty(lbsPerCase)) {
                    var cases = currentRecord.getCurrentSublistValue('item', 'custcol_so_line_cases');
                    var orgQty = cases * lbsPerCase;
                    currentRecord.setCurrentSublistValue('item', 'quantity', orgQty);
                }
            }

            if (sublistId === 'item'
                && (fieldId === 'quantity' || fieldId === 'units' || fieldId === 'rate')) {
                try {
                    pcg_approxweight_lib.setApproxWeight({
                        currentRecord: currentRecord
                    });
                } catch (e) {
                    console.log(e.name + ' : ' + e.message);
                    // log.error({
                    //     title: 'setApproxWeight: ' + e.name, 
                    //     details: e.message
                    // });
                }
            }
        }

        function lineInit(context) {
            const currentRecord = context.currentRecord;
            const sublistId = context.sublistId;
            if (sublistId === 'item') {
                try {
                    pcg_approxweight_lib.setApproxWeight({
                        currentRecord: currentRecord
                    });
                } catch (e) {
                    console.log(e.name + ' : ' + e.message);
                    // log.error({
                    //     title: 'setApproxWeight: ' + e.name, 
                    //     details: e.message
                    // });
                }
            }
        }

        function validateLine(context) {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;

            if (sublistName == 'item') {
                // get catch weight and actual case count values
                var catchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_cw_catch_weight'
                });

                var actualCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_pcg_tfi_actual_case_count'
                });

                if (isNullOrEmpty(catchWeight)) {
                    // get est pounds value
                    var sourceCatchWeight = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_approxweight'
                    });
                    // set catch weight value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight',
                        value: sourceCatchWeight
                    });
                }

                if (isNullOrEmpty(actualCaseCount)) {
                    // get est cs value
                    var sourceCaseCount = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_approxweight_cs'
                    });
                    // set actual case count value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: sourceCaseCount
                    });
                }

                return true;
            }
        }

        function saveRecord(context) {
            var currentRecord = context.currentRecord;
            // get sublist count
            var sublistCount = currentRecord.getLineCount('item');
            // iterate lines
            for (var i = 0; i < sublistCount; i++) {
                // select line item
                currentRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });

                // get catch weight and actual case count values
                var catchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_cw_catch_weight'
                });

                var actualCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_pcg_tfi_actual_case_count'
                });

                if (isNullOrEmpty(catchWeight)) {
                    // get est pounds value
                    var sourceCatchWeight = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_approxweight'
                    });
                    // set catch weight value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight',
                        value: sourceCatchWeight
                    });
                }

                if (isNullOrEmpty(actualCaseCount)) {
                    // get est cs value
                    var sourceCaseCount = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_approxweight_cs'
                    });
                    // set actual case count value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: sourceCaseCount
                    });

                }

                // commit line item
                currentRecord.commitLine({
                    sublistId: 'item'
                });
            }
            return true;
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
            fieldChanged: fieldChanged,
            lineInit: lineInit,
            validateLine: validateLine
            // saveRecord: saveRecord
        };

    });
