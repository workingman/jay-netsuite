/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    'N/record',
    'N/search'
], (record, search) => {

    function getInputData() {
        return search.load({
            id: 'customsearch_pcg_custominvoice_ss'
        });
    }

    function reduce(context) {
        try {

            const result = JSON.parse(context.values);

            const invoiceRecord = record.load({
                type: record.Type.INVOICE, 
                id: result.id
            });

            const createdFrom = invoiceRecord.getText({
                fieldId: 'createdfrom'
            });

            const tfiFulfillmentInvoiceActualSearch = search.load({
                id: 'customsearch11856'
            });

            const numberTextFilter = search.createFilter({
                name: 'numbertext',
                operator: search.Operator.HASKEYWORDS,
                values: createdFrom.split('#').pop()
            });

            tfiFulfillmentInvoiceActualSearch.filters.push(numberTextFilter);

            const searchResults = tfiFulfillmentInvoiceActualSearch.runPaged({
                pageSize: 1000
            });

            searchResults.pageRanges.forEach((pageRange) => {
                searchResults.fetch({index: pageRange.index}).data.forEach((result) => {

                    // log.debug({title: 'result', details: result});

                    const actualCaseCount = result.getValue({
                        name: 'custcol_pcg_tfi_actual_case_count',
                        join: 'fulfillingTransaction'
                    });

                    const actualWeight = result.getValue({
                        name: 'quantity',
                        join: 'applyingTransaction'
                    });

                    const invoiceItemLineUniqueKey = result.getValue({
                        name: 'lineuniquekey',
                        join: 'applyingTransaction'
                    });

                    const invoiceItemLine = invoiceRecord.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'lineuniquekey',
                        value: invoiceItemLineUniqueKey
                    });

                    invoiceRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_cw_catch_weight',
                        line: invoiceItemLine,
                        value: actualWeight
                    });

                    invoiceRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_pcg_tfi_actual_case_count',
                        line: invoiceItemLine,
                        value: actualCaseCount
                    });
                });
            });

            invoiceRecord.setValue({
                fieldId: 'custbody_pcg_updated_actuals',
                value: new Date()
            });

            const updatedInvoiceRecordId = invoiceRecord.save();

            log.debug({title: 'updatedInvoiceRecordId', details: updatedInvoiceRecordId});

        } catch (e) {
            log.error({title: 'Reduce', details: e});
        }
    }

    function summarize(context) {}

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});
