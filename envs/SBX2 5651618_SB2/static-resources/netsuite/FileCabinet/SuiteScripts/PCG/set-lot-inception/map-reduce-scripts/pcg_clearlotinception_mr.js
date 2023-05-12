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
                id: 'customsearch_pcg_clearlotinception_ss'
            });
        } catch (e) {
            log.error({title: 'Get Input Data', details: e});
        }

        return transactionSearch;
    }

    function reduce(reduceContext) {
        try {

            const values = JSON.parse(reduceContext.values);

            const transactionType = values.values['GROUP(type)'].text.replaceAll(' ', '').toLowerCase();
            let transactionId     = values.values['GROUP(internalid)'].value;

            if (transactionType === record.Type.WORK_ORDER_COMPLETION) {
                transactionId = record.submitFields({
                    type: transactionType,
                    id: transactionId,
                    values: {
                        'custbody_pcg_tfi_trx_creates_new_lot': false,
                           'custbody_pcg_lot_header_timestamp': ''
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });
            } else {

                let sublistId           = null;
                // let totalEstimatedCases = 0;
                // let totalActualCases    = 0;

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

                    transactionRecord.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_pcg_tfi_trx_creates_new_lot',
                        line: i,
                        value: false
                    });

                    transactionRecord.setSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custcol_pcg_lot_header_timestamp',
                        line: i,
                        value: ''
                    });

                    // Round up cases to allow record save

                    // const estimatedCases = Math.ceil(transactionRecord.getSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: 'custcol_pcg_approxweight_cs',
                    //     line: i
                    // }));

                    // const actualCases = Math.ceil(transactionRecord.getSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: 'custcol_pcg_tfi_actual_case_count',
                    //     line: i
                    // }));

                    // transactionRecord.setSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: 'custcol_pcg_approxweight_cs',
                    //     line: i,
                    //     value: estimatedCases
                    // });

                    // transactionRecord.setSublistValue({
                    //     sublistId: sublistId,
                    //     fieldId: 'custcol_pcg_tfi_actual_case_count',
                    //     line: i,
                    //     value: actualCases
                    // });

                    // totalEstimatedCases += estimatedCases;

                    // totalActualCases += actualCases;
                }

                // transactionRecord.setValue({
                //     fieldId: 'custbody_pcg_total_est_cs',
                //     value: totalEstimatedCases
                // });

                // transactionRecord.setValue({
                //     fieldId: 'custbody_pcg_total_cases',
                //     value: totalActualCases
                // });

                transactionId = transactionRecord.save({
                    ignoreMandaoryFields: true
                });
            }

            log.audit({
                title: transactionType + ': ' + transactionId,
                details: 'Lot Inception field(s) cleared.'
            });
        } catch (e) {
            log.error({title: 'Reduce Key: ' + reduceContext.key, details: e});
        }
    }

    function summarize() {}

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});
