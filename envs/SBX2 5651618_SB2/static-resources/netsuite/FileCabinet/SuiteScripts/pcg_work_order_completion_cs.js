
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search'],
    /**
     * @param {currentRecord} currentRecord
     * @param {record} record
     */
    function (currentRecord, record, search) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {
                // alert('fieldChanged');
                var rec = scriptContext.currentRecord;
                var fName = scriptContext.fieldId;

                // if min qty changed
                if (fName == 'inventorydetail') {
                    alert("inventory detail fired");
                }
                if (fName == 'quantity') {
                    alert("quantity fired");
                }
            } catch (e) {
                alert(e.toString());
                log.error("error in field change", e);
            }
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
            fieldChanged: fieldChanged
        };
    });
