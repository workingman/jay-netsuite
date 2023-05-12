/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/record',
        'N/search'],
    function(record,
             search) {

        function getInputData(context) {

            const deleteRecordSearch = search.load({
                id: 'customsearch_pcg_delete_search'
            });
            return deleteRecordSearch;
        }

        function reduce(context) {

            const RECDORD_ID = JSON.parse(context.values[0]).id;

            log.audit({
                title: 'Deleting Record',
                details: 'ID: ' + RECDORD_ID
            });
            record.delete({
                type: 'merchandisehierarchynode',
                id: RECDORD_ID
            })
        }

        function summarize(summary) {
            log.audit({
                title: 'Delete Complete',
                details: summary
            });
        }

        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });
