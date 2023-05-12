define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    function setApproxWeight(param) {
        const currentRecord = param.currentRecord;
        const itemId = currentRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item'
        });
        if (itemId) {
            let quantity = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity'
            });
            if (!quantity) {
                quantity = 1;
            }
            // get rate value from line item
            var rate = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate'
            });
            const units = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'units'
            });
            const itemLookup = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['unitstype']
            });
            // log.debug({
            //     title: 'unitstype',
            //     details: itemLookup.unitstype[0].value
            // });
            const unitsType = record.load({
                type: record.Type.UNITS_TYPE,
                id: itemLookup.unitstype[0].value
            });
            // veirfy the unit type LB value with all possible options. i.e  LB, Lb, LBS, Lbs

            // validate line with LB
            let lbLine = unitsType.findSublistLineWithValue({
                sublistId: 'uom',
                fieldId: 'unitname',
                value: 'LB'
            });

            // validate line with Lb
            if (lbLine === -1) {
                lbLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'Lb'
                });
            }

            // validate line with LBS
            if (lbLine === -1) {
                lbLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'LBS'
                });
            }

            // validate line with Lbs
            if (lbLine === -1) {
                lbLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'Lbs'
                });
            }

            if (lbLine === -1) {
                lbLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'LB [.0625] (16/cs)'
                });
            }
            if (lbLine !== -1) {
                // log.debug({ title: 'lb line', details: lbLine });
                const unitsTypeLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'internalid',
                    value: units
                });
                // if (unitsTypeLine !== lbLine) {
                const conversionRate = unitsType.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'conversionrate',
                    line: unitsTypeLine
                });
                const lbConversionRate = unitsType.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'conversionrate',
                    line: lbLine
                });
                // calculate UOM weight LB
                var uomWeightLB = ((quantity * conversionRate) / lbConversionRate);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_pcg_approxweight',
                    value: uomWeightLB
                });
                // set est rate/lb for the line item
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_est_rate_lb',
                    value: (quantity * rate) / uomWeightLB
                });
                // }
            } else {
                // log.debug({ title: 'No LB line' });
                // console.log("NO LB Line");
            }

            let csLine = unitsType.findSublistLineWithValue({
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
                // log.debug({ title: 'cs line', details: csLine });
               // console.log("csLine: " + csLine);
                const unitsTypeLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'internalid',
                    value: units
                });
                const conversionRate = unitsType.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'conversionrate',
                    line: unitsTypeLine
                });
                const csConversionRate = unitsType.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'conversionrate',
                    line: csLine
                });
                // calculate UOm weight CS
                var uomWeightCS = ((quantity * conversionRate) / csConversionRate);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_pcg_approxweight_cs',
                    value: uomWeightCS
                });
                // set est rate/CS for line item
                currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_est_rate_cs',
                    value: (quantity * rate) / uomWeightCS
                });
            } else {
                // log.debug({ title: 'No CS line' });
              //  console.log('No CS line');

            }

        }
    }
  
  function setApproxWeightForIA(param) {
        try {
            const currentRecord = param.currentRecord;
            const itemId = currentRecord.getCurrentSublistValue({
                sublistId: 'inventory',
                fieldId: 'item'
            });
            if (itemId) {
                let quantity = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby'
                });
                if (!quantity) {
                    quantity = 1;
                }
                // get rate value from line item
                var rate = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'unitcost'
                });
                const units = currentRecord.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'units'
                });
                const itemLookup = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['unitstype']
                });
                // log.debug({
                //     title: 'unitstype',
                //     details: itemLookup.unitstype[0].value
                // });
                const unitsType = record.load({
                    type: record.Type.UNITS_TYPE,
                    id: itemLookup.unitstype[0].value
                });
                // veirfy the unit type LB value with all possible options. i.e  LB, Lb, LBS, Lbs

                // validate line with LB
                let lbLine = unitsType.findSublistLineWithValue({
                    sublistId: 'uom',
                    fieldId: 'unitname',
                    value: 'LB'
                });

                // validate line with Lb
                if (lbLine === -1) {
                    lbLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        value: 'Lb'
                    });
                }

                // validate line with LBS
                if (lbLine === -1) {
                    lbLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        value: 'LBS'
                    });
                }

                // validate line with Lbs
                if (lbLine === -1) {
                    lbLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        value: 'Lbs'
                    });
                }

                if (lbLine === -1) {
                    lbLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        value: 'LB [.0625] (16/cs)'
                    });
                }

                if (lbLine !== -1) {
                    //  log.debug({ title: 'lb line', details: lbLine });
                    const unitsTypeLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'internalid',
                        value: units
                    });
                    // if (unitsTypeLine !== lbLine) {
                    const conversionRate = unitsType.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'conversionrate',
                        line: unitsTypeLine
                    });
                    const lbConversionRate = unitsType.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'conversionrate',
                        line: lbLine
                    });

                    // calculate UOM weight LB
                    var uomWeightLB = ((quantity * conversionRate) / lbConversionRate);
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_approxweight',
                        value: uomWeightLB
                    });
                    // set est rate/lb for the line item
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_est_rate_lb',
                        value: (quantity * rate) / uomWeightLB
                    });

                    // }
                } else {
                    //  log.debug({ title: 'No LB line' });
                }

                let csLine = unitsType.findSublistLineWithValue({
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
                    //  log.debug({ title: 'cs line', details: csLine });
                    const unitsTypeLine = unitsType.findSublistLineWithValue({
                        sublistId: 'uom',
                        fieldId: 'internalid',
                        value: units
                    });
                    const conversionRate = unitsType.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'conversionrate',
                        line: unitsTypeLine
                    });
                    const csConversionRate = unitsType.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'conversionrate',
                        line: csLine
                    });
                    // calculate UOm weight CS
                    var uomWeightCS = ((quantity * conversionRate) / csConversionRate);
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_pcg_approxweight_cs',
                        value: uomWeightCS
                    });
                    // set est rate/CS for line item
                    currentRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_est_rate_cs',
                        value: (quantity * rate) / uomWeightCS
                    });
                } else {
                    //  log.debug({ title: 'No CS line' });
                }

            }
        } catch (e) {
            // alert("error:" + e.toString());
        }
    }

    return {
        setApproxWeight: setApproxWeight,
        setApproxWeightForIA: setApproxWeightForIA
    };

});
