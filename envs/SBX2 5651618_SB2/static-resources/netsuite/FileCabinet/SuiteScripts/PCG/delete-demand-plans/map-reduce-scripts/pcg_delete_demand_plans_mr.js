/**
 * Delete Demand Plans Map/Reduce Script
 *
 * Get Input Data:
 * 1. Gets the Saved Search ID from the Script Parameters for the Item Demand Plan Records to delete.
 *
 * Map:
 * 1. Deletes the Item Demand Plan Record from the single saved search result.
 *
 * Summary:
 * 1. Deletes the temporary saved search used to describe the Demand Plans to delete.
 * 2. Logs out how many records were processed.
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/runtime',
		'N/search',
        '../lib/pcg_delete_demand_plans_constants'],
function (record,
		  runtime,
		  search,
          PCG_DELETE_DEMAND_PLANS_CONSTANTS) {

    /**
     * Get Input Data Entry Point
     *
     * 1. Gets the Saved Search ID from the Script Parameters for the Item Demand Plan Records to delete.
 	 */
    function getInputData() {

    	const SAVED_SEARCH_ID = runtime.getCurrentScript().getParameter({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT.PARAMETER.SAVED_SEARCH_ID});

    	if (!SAVED_SEARCH_ID) {
    		log.error({
    			title: 'Saved Search Not Specified',
    			details: 'Please set a Saved Search on the Deployment Script Parameter(s)'
    		});

  			return [];
    	}

		return search.load({ 
			id: SAVED_SEARCH_ID
		});
    }

    /**
     * Map Phase Entry Point
     *
     * 1. Deletes the Item Demand Plan Record from the single saved search result.
     */
    function map(context) {

        const SAVED_SEARCH_RESULT = JSON.parse(context.value);

        log.audit({
            title: 'Deleting Record',
            details: 'Type: ' + SAVED_SEARCH_RESULT.recordType + ', ID: ' + SAVED_SEARCH_RESULT.id
        });

        try {
            record.delete({
            	type: SAVED_SEARCH_RESULT.recordType,
            	id: SAVED_SEARCH_RESULT.id
            });
        } catch (e) {
            log.error({
            	title: 'Error Deleting Saved Search Result',
            	details: e
            });
        }
    }

    /**
     * Summary Phase Entry Point
     *
     * 1. Deletes the temporary saved search used to describe the Demand Plans to delete.
     * 2. Logs out how many records were processed.
     */
    function summarize(summary) {

        const SAVED_SEARCH_ID = runtime.getCurrentScript().getParameter({name: PCG_DELETE_DEMAND_PLANS_CONSTANTS.DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT.PARAMETER.SAVED_SEARCH_ID});

        log.audit({
            title: 'Deleting Saved Search',
            details: 'ID: ' + SAVED_SEARCH_ID
        });

        try {
            search.delete({
            	id: SAVED_SEARCH_ID
            });
        } catch (e) {
            log.error({
            	title: 'Error Deleting Saved Search',
            	details: e
            });
        }

        var mapKeysProcessed = 0;

        summary.mapSummary.keys.iterator().each(function (key, executionCount, completionState) {
            if (completionState === 'COMPLETE') {
                mapKeysProcessed++;
            }
            return true;
        });

        log.audit({
            title: 'Process Complete',
            details: {
                results: ('Processed ' + mapKeysProcessed + ' Records'),
                RunSummary: summary.mapSummary
            }
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});