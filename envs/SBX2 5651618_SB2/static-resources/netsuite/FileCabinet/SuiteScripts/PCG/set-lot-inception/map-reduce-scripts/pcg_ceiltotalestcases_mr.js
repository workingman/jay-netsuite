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
                id: 'customsearch_pcg_totalestcs_ss'
            });
        } catch (e) {
            log.error({title: 'Get Input Data', details: e});
        }

        return transactionSearch;
    }

    function reduce(reduceContext) {

        const values = JSON.parse(reduceContext.values);

        const transactionType = values.values['GROUP(type)'].text.replaceAll(' ', '').toLowerCase();
        let transactionId     = values.values['GROUP(internalid)'].value;

        try {

            let sublistId           = null;
            let totalEstimatedCases = 0;
            let totalActualCases    = 0;

            const transactionRecord = record.load({
                type: transactionType,
                id: transactionId
            });

            if (transactionType === record.Type.INVENTORY_ADJUSTMENT) {
                sublistId = 'inventory';
            } else {
                sublistId = 'item'
            }

            const lineCount = transactionRecord.getLineCount({
                sublistId: sublistId
            });

            for (let i = 0; i < lineCount; i++) {

                const estimatedCases = Math.ceil(transactionRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_pcg_approxweight_cs',
                    line: i
                }));

                const actualCases = Math.ceil(transactionRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_pcg_tfi_actual_case_count',
                    line: i
                }));

                transactionRecord.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_pcg_approxweight_cs',
                    line: i,
                    value: estimatedCases
                });

                transactionRecord.setSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_pcg_tfi_actual_case_count',
                    line: i,
                    value: actualCases
                });

                totalEstimatedCases += estimatedCases;

                totalActualCases += actualCases;
            }

            transactionRecord.setValue({
                fieldId: 'custbody_pcg_total_est_cs',
                value: totalEstimatedCases
            });

            transactionRecord.setValue({
                fieldId: 'custbody_pcg_total_cases',
                value: totalActualCases
            });

            transactionId = transactionRecord.save({
                ignoreMandaoryFields: true
            });

            log.audit({
                title: transactionType + ': ' + transactionId,
                details: 'Total Estimated Cases updated.'
            });
        } catch (e) {
            log.error({title: transactionType + ': ' + transactionId, details: e});
        }
    }

    function summarize() {}

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});
