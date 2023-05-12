/**
* @NApiVersion 2.1
* @NScriptType ClientScript
*/

define(['../../transaction-line-approx-weight/lib/pcg_approxweight_lib', 'N/search', 'N/record'],
    (pcg_approxweight_lib, search, record) => {

        function fieldChanged(context) {
            const currentRecord = context.currentRecord;
            const sublistId = context.sublistId;
            const fieldId = context.fieldId;

            // field change on item
            if (fieldId === 'item') {
                var itemId = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item'
                });
                if (!isNullOrEmpty(itemId)) {
                    // make item lookup and get conversion rates for units type
                    var itemLookup = search.lookupFields({
                        type: search.Type.ITEM,
                        id: itemId,
                        columns: ['unitstype', 'saleunit']
                    });

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
                            currentRecord.setCurrentSublistValue('inventory', 'custcol_so_line_lbs_per_case', csConversionRate);
                        }
                    }
                }
            }

            if (fieldId === 'custcol_so_line_cases') {
                var lbsPerCase = currentRecord.getCurrentSublistValue('inventory', 'custcol_so_line_lbs_per_case');
                if (!isNullOrEmpty(lbsPerCase)) {
                    var cases = currentRecord.getCurrentSublistValue('inventory', 'custcol_so_line_cases');
                    var orgQty = cases * lbsPerCase;
                    currentRecord.setCurrentSublistValue('inventory', 'adjustqtyby', orgQty);
                }
            }

            if (sublistId === 'inventory'
                && (fieldId === 'adjustqtyby' || fieldId === 'units' || fieldId === 'unitcost')) {
                try {
                    pcg_approxweight_lib.setApproxWeightForIA({
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
            if (sublistId === 'inventory') {
                try {
                    pcg_approxweight_lib.setApproxWeightForIA({
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

            if (sublistName == 'inventory') {
                // get catch weight and actual case count values
                var catchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_cw_catch_weight'
                });

                var actualCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_tfi_actual_case_count'
                });

                var intialLotRatio = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_initial_ratio_lb_cs'
                });

                var lotInventoryCostPerLb = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_tfi_lot_cost_per_lb'
                });

                // get est pounds value
                var sourceCatchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_approxweight'
                });
                if (isNullOrEmpty(catchWeight)) {
                    // set catch weight value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_cw_catch_weight',
                        value: sourceCatchWeight
                    });
                }

                // get est cs value
                var sourceCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_so_line_cases'
                });
                if (isNullOrEmpty(actualCaseCount)) {
                    // set actual case count value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: sourceCaseCount
                    });
                }

                if (isNullOrEmpty(intialLotRatio) && sourceCatchWeight && sourceCaseCount) {
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_initial_ratio_lb_cs',
                        value: sourceCatchWeight / sourceCaseCount
                    });
                }

                if (isNullOrEmpty(lotInventoryCostPerLb)) {

                    var estUnitCost = currentRecord.getCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'unitcost'
                    });

                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_tfi_lot_cost_per_lb',
                        value: estUnitCost
                    });
                }
            }

            return true;
        }

        function saveRecord(context) {
            var currentRecord = context.currentRecord;
            // get sublist count
            var sublistCount = currentRecord.getLineCount('inventory');
            // iterate lines
            for (var i = 0; i < sublistCount; i++) {
                // select line item
                currentRecord.selectLine({
                    sublistId: 'inventory',
                    line: i
                });

                // get catch weight and actual case count values
                var catchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_cw_catch_weight'
                });

                var actualCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_tfi_actual_case_count'
                });

                var intialLotRatio = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_initial_ratio_lb_cs'
                });

                var lotInventoryCostPerLb = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_tfi_lot_cost_per_lb'
                });

                // get est pounds value
                var sourceCatchWeight = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_pcg_approxweight'
                });
                if (isNullOrEmpty(catchWeight)) {
                    // set catch weight value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_cw_catch_weight',
                        value: sourceCatchWeight
                    });
                }

                // get est cs value
                var sourceCaseCount = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_so_line_cases'
                });
                if (isNullOrEmpty(actualCaseCount)) {
                    // set actual case count value
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        value: sourceCaseCount
                    });
                }

                if (isNullOrEmpty(intialLotRatio) && sourceCatchWeight && sourceCaseCount) {
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_initial_ratio_lb_cs',
                        value: sourceCatchWeight / sourceCaseCount
                    });
                }

                if (isNullOrEmpty(lotInventoryCostPerLb)) {

                    var estUnitCost = currentRecord.getCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'unitcost'
                    });

                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_tfi_lot_cost_per_lb',
                        value: estUnitCost
                    });
                }

                // commit line item
                currentRecord.commitLine({
                    sublistId: 'inventory'
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
            validateLine: validateLine
            // lineInit: lineInit,
            //  saveRecord: saveRecord
        };

    });