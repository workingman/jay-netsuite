/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/search', 'N/record'
], (search, record) => {

    function getInputData() {

        let transactionSearch = null;

        try {
            transactionSearch = search.load({
                id: 'customsearch_pcg_setlotinception_ss_2__2'
            });
        } catch (e) {
            log.error({title: 'Get Input Data', details: e});
        }

        return transactionSearch;
    }

    function map(mapContext) {
        try {

            const value = JSON.parse(mapContext.value);

            if (value.values.formulanumeric === '1') {
                mapContext.write({
                    key: mapContext.key,
                    value: value
                });
            }
        } catch (e) {
            log.error({title: 'Map Key: ' + mapContext.key, details: e});
        }
    }

    function reduce(reduceContext) {
        try {

            const value0 = JSON.parse(reduceContext.values[0]);

            const transactionType = value0.recordType;

            let transactionId = null;
            
            if (transactionType === record.Type.WORK_ORDER_COMPLETION) {

                transactionId = record.submitFields({
                    type: record.Type.WORK_ORDER_COMPLETION,
                    id: reduceContext.key,
                    values: {
                        'custbody_pcg_tfi_trx_creates_new_lot': true,
                           'custbody_pcg_lot_header_timestamp': new Date()
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });

                reduceContext.values.forEach((value) => {

                    value = JSON.parse(value);

                    setInventoryNumberFields({
                        itemId: value.values.item.value,
                        serialNumber: value.values.serialnumber,
                        transactionId: reduceContext.key,
                        transactionLine: 0,
                        transactionLocationId: value.values.location.value,
                        transactionType: value.values.type.text
                    });
                });
            } else {

                let transactionSublistId = null;
                let transactionLine      = null;
                
                const transactionRecord = record.load({
                    type: transactionType,
                    id: reduceContext.key
                });

                if (transactionRecord.type === record.Type.INVENTORY_ADJUSTMENT) {
                    transactionSublistId = 'inventory';
                } else {
                    transactionSublistId = 'item';
                }

                reduceContext.values.forEach((value) => {

                    value = JSON.parse(value);

                    transactionLine = parseInt(value.values.line) - 1;

                    transactionRecord.setSublistValue({
                        sublistId: transactionSublistId,
                        fieldId: 'custcol_pcg_tfi_trx_creates_new_lot',
                        line: transactionLine,
                        value: true
                    });

                    transactionRecord.setSublistValue({
                        sublistId: transactionSublistId,
                        fieldId: 'custcol_pcg_lot_header_timestamp',
                        line: transactionLine,
                        value: new Date()
                    });

                    setInventoryNumberFields({
                        itemId: value.values.item.value,
                        serialNumber: value.values.serialnumber,
                        transactionId: reduceContext.key,
                        transactionLine: transactionLine + 1,
                        transactionLocationId: value.values.location.value,
                        transactionType: value.values.type.text
                    });
                });

                transactionId = transactionRecord.save({
                    ignoreMandaoryFields: true
                });
            }

            log.audit({
                title: transactionType + ': ' + transactionId,
                details: 'Lot Inception field(s) set.'
            });
        } catch (e) {
            log.error({title: 'Reduce Key: ' + reduceContext.key, details: e});
        }
    }

    function summarize() {}

    function setInventoryNumberFields(dataIn) {

        const inventoryNumberSearch = search.create({
            type: search.Type.INVENTORY_NUMBER,
            filters: [[
                'inventorynumber', search.Operator.IS, dataIn.serialNumber
            ], 'AND', [
                'item', search.Operator.IS, dataIn.itemId
            ]]
        });

        const inventoryNumberSearchResults = inventoryNumberSearch.run().getRange({
            start: 0,
            end: 1
        });

        record.submitFields({
            type: record.Type.INVENTORY_NUMBER,
            id: inventoryNumberSearchResults[0].id,
            values: {
                'custitemnumber_pcg_tfi_first_trx_line_id': dataIn.transactionLine,
                  'custitemnumber_tfi_pcg_source_location': dataIn.transactionLocationId,
                'custitemnumber_tfi_pcg_source_trx_number': dataIn.transactionId,
                  'custitemnumber_tfi_pcg_source_trx_type': dataIn.transactionType
            },
            options: {
                ignoreMandatoryFields: true
            }
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
