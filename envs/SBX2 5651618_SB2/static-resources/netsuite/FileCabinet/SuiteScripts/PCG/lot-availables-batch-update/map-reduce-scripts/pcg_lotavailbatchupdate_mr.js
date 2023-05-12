/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/format', 'N/record', 'N/search'
], (format, record, search) => {

    function getInputData() {

        let inventoryNumberSearch = null;

        try {
            inventoryNumberSearch = search.load({
                id: 'customsearch_pcg_lotavailbatchupdate_ss'
            });
        } catch (e) {
            log.error({title: 'Get Input Data', details: e});
        }

        return inventoryNumberSearch;
    }

    function map(mapContext) {
        try {

            const value = JSON.parse(mapContext.value);

            const lastDynamicDataUpdate = format.parse({
                value: value.values.custitemnumber_pcg_tfi_dynamic_data_last,
                type: format.Type.DATETIME,
                timezone: format.Timezone.AMERICA_NEW_YORK
            });

            if ((Date.now() - lastDynamicDataUpdate.getTime()) < 1800000) { // 30 minutes
                mapContext.write({
                    key: mapContext.key,
                    value: mapContext.value
                });
            }
        } catch (e) {
            log.error({title: 'Map Key: ', details: e});
        }
    }

    function reduce(reduceContext) {
        try {

            const values = JSON.parse(reduceContext.values);

            const inventoryNumber = record.load({
                type: record.Type.INVENTORY_NUMBER,
                id: values.id
            });

            const lotActualWeight = inventoryNumber.getValue({
                fieldId: 'custitemnumber_pcg_tfi_catch_weight'
            });

            const lotActualCases = inventoryNumber.getValue({
                fieldId: 'custitemnumber_pcg_tfi_case_box_count'
            });

            const locationsLineCount = inventoryNumber.getLineCount({
                sublistId: 'locations'
            });

            let lotAvailableWeight = 0;

            for (let i = 0; i < locationsLineCount; i++) {
                lotAvailableWeight += inventoryNumber.getSublistValue({
                    sublistId: 'locations',
                    fieldId: 'quantityavailablebase',
                    line: i
                });
            }

            let lotAvailableCases = 0;

            if (lotActualWeight) {
                lotAvailableCases = Math.ceil((lotAvailableWeight / lotActualWeight) * lotActualCases);
            }

            inventoryNumber.setValue({
                fieldId: 'custitemnumberpcg_lot_avail_weight',
                value: lotAvailableWeight
            });

            inventoryNumber.setValue({
                fieldId: 'custitemnumber_tfi_pcg_lot_avail_cases',
                value: lotAvailableCases
            });

            const inventoryNumberId = inventoryNumber.save({
                ignoreMandatoryFields: true
            });

            log.audit({
                title: 'Updated Inventory Number',
                details: inventoryNumberId
            });

        } catch (e) {
            log.error({title: 'Reduce Key: ' + reduceContext.key, details: e});
        }
    }

    function summarize() {}

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
