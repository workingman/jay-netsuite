/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record', 'N/runtime', 'N/ui', 'N/ui/serverWidget'],

    /**
     *
     * @param error
     * @param record
     * @param runtime
     * @param ui
     * @param serverWidget
     * @returns {{beforeSubmit: beforeSubmit, beforeLoad: beforeLoad}}
     */
    function (error, record, runtime, ui, serverWidget) {

        var Helper = {};

        Helper.getCatchWeightsTabId = function(scriptContext) {
            var currentForm = scriptContext.form;
            var cwSubTab;
            currentForm.getTabs().forEach(function (tabId) {
                var tab = currentForm.getTab(tabId);
                if (tab.label == 'Catch Weight Setup') {
                    cwSubTab = tabId;
                }
            });
            return cwSubTab;
        }

        var LOG_START   = ' :  ****** START ****** ';
        var LOG_END     = ' :  ------ END ------ ';


        /**
         *
         * @param scriptContext
         * @returns {boolean}
         */
        function beforeLoad(scriptContext) {

            var stLogTitle = 'beforeLoad';

            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});

            try {

                //check context
                if (validateContext(scriptContext)) {
                    log.audit({title: stLogTitle, details: 'Context is not supported'});
                    return true;
                }

                var currentForm = scriptContext.form;

                var pricingUnit = currentForm.getField({
                    id: 'custitem_cw_pricing_unit'
                });

                var cwSubTab = Helper.getCatchWeightsTabId(scriptContext);

                log.debug('tabs', cwSubTab);

                var purchasingPricingUnit = currentForm.getField({

                    id: 'custitem_cw_purchase_pricing_unit'
                });

                var salesPricingUnit = currentForm.getField({
                    id: 'custitem_cw_sales_pricing_unit'
                });

                if (isEmpty(pricingUnit) || isEmpty(purchasingPricingUnit) || isEmpty(salesPricingUnit)) {

                    log.audit({title: stLogTitle, details: 'Catch Weight fields are missing'});

                    return;
                }

                //hide existing fields


                hideFields(pricingUnit);
                hideFields(purchasingPricingUnit);
                hideFields(salesPricingUnit);


                //add fields

                var tempPricingUnits = currentForm.addField({
                    id: 'custpage_cw_pricing_unit',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Pricing Unit',
                    container: cwSubTab
                });

                var tempPurchasingPricingUnits = currentForm.addField({
                    id: 'custpage_cw_purchase_pricing_unit',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Purchasing Pricing Unit',
                    container: cwSubTab
                });
                var tempSalePricingUnits = currentForm.addField({
                    id: 'custpage_cw_sales_pricing_unit',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Sales Pricing Unit',
                    container: cwSubTab
                });

            } catch (e) {
                log.error(stLogTitle, e.message);
            }

        }


        /**
         * Utility function to hide fields
         * @param currentField
         */
        function hideFields(currentField) {
            currentField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
        }


        /**
         *
         * Utility function to check context
         * @param context
         * @returns {boolean}
         */
        function validateContext(context) {

            log.debug('Context Type', JSON.stringify(context.type));

            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                return true;
            }
            return false;
        }


        /**
         *
         * @param scriptContext
         */
        function beforeSubmit(scriptContext) {

            var stLogTitle = 'beforeSubmit';

            log.audit({title: stLogTitle, details: stLogTitle + LOG_START});

            if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {
                log.audit({title: stLogTitle, details: 'Script will not work in User Interface'});
                return;
            }

            var scriptObj           = runtime.getCurrentScript();
            var currentRecord       = scriptContext.newRecord;
            var fieldsToCheck       = scriptObj.getParameter('custscript_nsts_cw_field_ids_to_lock');
            var fieldsToCheckText   = scriptObj.getParameter('custscript_nsts_cw_field_names_to_lock');

            var isCatchWeightItem = currentRecord.getValue({
                fieldId: 'custitem_cw_catch_weight_item'
            });

            if (isCatchWeightItem === true) {

                if (isEmpty(fieldsToCheck)) {
                    log.error({title: stLogTitle, details: 'Script Parameter is missing.'});
                    return;
                }
                var isValidationFailed = validateFieldValues(currentRecord, fieldsToCheck);

                if (isValidationFailed) {
                    throw 'This is a Catch Weight Item. Please Enter Values for fields : ' + fieldsToCheckText;
                }

            } else {
                log.audit({title: stLogTitle, details: 'Not a Catch Weight Item.'});
                return;
            }

            log.audit({title: stLogTitle, details: stLogTitle + LOG_END});

        }


        /**
         * Checks fields for empty
         * @param currentRecord
         * @param fieldsToCheck
         * @returns {boolean}
         */
        function validateFieldValues(currentRecord, fieldsToCheck) {

            var stLogTitle          = 'validateFieldValues';
            var fieldsToCheckArray  = fieldsToCheck.split(',');
            log.debug({title: stLogTitle, details: JSON.stringify(fieldsToCheckArray)});

            for (var i = 0; i < fieldsToCheckArray.length; i++) {

                var currentFieldValue = currentRecord.getValue({
                    fieldId: fieldsToCheckArray[i]
                });

                if (isEmpty(currentFieldValue)) {
                    log.error({title: stLogTitle, details: 'Missing Value for field: ' + fieldsToCheckArray[i]});
                    return true;
                }
            }

            return false;
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

        }

        /**
         * Null check utility function
         * @param value
         * @returns {boolean}
         */
        function isEmpty(value) {
            if (value == null)
                return true;
            if (value == undefined)
                return true;
            if (value == 'undefined')
                return true;
            if (value == '')
                return true;
            return false;
        }


        return {
            beforeLoad  : beforeLoad,
            beforeSubmit: beforeSubmit,
            //afterSubmit: afterSubmit
        };

    });
