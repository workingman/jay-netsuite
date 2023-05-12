/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search'],

    /**
     *
     * @param record
     * @param runtime
     * @param search
     * @returns {{saveRecord: (function({currentRecord: Record}): boolean), pageInit: pageInit, fieldChanged: fieldChanged}}
     */
    function (record, runtime, search) {


        /**
         *
         * @param scriptContext
         */
        function pageInit(scriptContext) {

            var currentRecord = scriptContext.currentRecord;


            //get Pricing Units Type and Physical Units Types from Item Record
            var currentPricingUnitsType = currentRecord.getValue({
                fieldId: 'custitem_cw_pricing_units_type'
            });

            var currentPhysicalUnitsType = currentRecord.getValue({
                fieldId: 'unitstype'
            });



            //get Pricing Units, Purchasing Pricing Unit, Sales Pricing Units from Item Record

            var currentPricingUnit = currentRecord.getValue({
                fieldId: 'custitem_cw_pricing_unit'
            });

            var currentPurchasingPricingUnit = currentRecord.getValue({
                fieldId: 'custitem_cw_purchase_pricing_unit'
            });
            var currentSalesPricingUnit = currentRecord.getValue({
                fieldId: 'custitem_cw_sales_pricing_unit'
            });


            //get temporary fields added to item records

            var tempPricingUnitsField = currentRecord.getField({
                fieldId: 'custpage_cw_pricing_unit'
            });

            var tempPurchasingPricingUnitsField = currentRecord.getField({
                fieldId: 'custpage_cw_purchase_pricing_unit'
            });

            var tempSalesPricingUnitsField = currentRecord.getField({
                fieldId: 'custpage_cw_sales_pricing_unit'
            });

            if (isEmpty(tempPricingUnitsField) || isEmpty(tempPurchasingPricingUnitsField) || isEmpty(tempSalesPricingUnitsField)) {
                console.log('One of the fields are missing. Restricted field sourcing will not work');
                return;
            }


            var pricingUnitsTypeUoMsObject  = '';
            var physicalUnitsTypeUoMsObject = '';


            if (!isEmpty(currentPricingUnitsType)) {

                pricingUnitsTypeUoMsObject = getUOMsFromUnitType(currentPricingUnitsType);
            }

            if (!isEmpty(currentPhysicalUnitsType)) {
                physicalUnitsTypeUoMsObject = getUOMsFromUnitType(currentPhysicalUnitsType);
            }

            //set Pricing Units - PRICING UNIT list should have UoMs of PRICING UNITS TYPE.
            if (!isEmpty(pricingUnitsTypeUoMsObject)) {
                addSelectOptions(tempPricingUnitsField, pricingUnitsTypeUoMsObject, '', currentPricingUnit);
            }

            //set PURCHASING PRICING UNIT and, SALES PRICING UNIT
            // - PURCHASING PRICING UNIT, SALES PRICING UNIT list should have UoMs of PRICING UNITS TYPE + PHYSICAL UNITS TYPE

            if (!isEmpty(physicalUnitsTypeUoMsObject) || !isEmpty(pricingUnitsTypeUoMsObject)) {

                addSelectOptions(tempPurchasingPricingUnitsField, pricingUnitsTypeUoMsObject, physicalUnitsTypeUoMsObject, currentPurchasingPricingUnit);
                addSelectOptions(tempSalesPricingUnitsField, pricingUnitsTypeUoMsObject, physicalUnitsTypeUoMsObject, currentSalesPricingUnit);
            }
        }



        /**
         * This function add select options to temporary fields and sets a default value based on native field selection
         * @param currentField
         * @param pricingUnitsTypeUoMsObject
         * @param physicalUnitsTypeUoMsObject
         * @param defaultSelection
         */
        function addSelectOptions(currentField, pricingUnitsTypeUoMsObject, physicalUnitsTypeUoMsObject, defaultSelection) {

            removeSelectOptions(currentField);

            currentField.insertSelectOption({
                value: 'empty',
                text: ' '
            });

            //add Pricing Units Type UoMs if applicable
            if (!isEmpty(pricingUnitsTypeUoMsObject)) {

                for (var key in pricingUnitsTypeUoMsObject) {

                    if (pricingUnitsTypeUoMsObject.hasOwnProperty(key)) {

                        currentField.insertSelectOption({
                            value: key,
                            text: pricingUnitsTypeUoMsObject[key],
                            isSelected: (key === defaultSelection)
                        });
                    }
                }
            }

            //add Physical Units Type UoMs if applicable
            if (!isEmpty(physicalUnitsTypeUoMsObject)) {

                for (var key in physicalUnitsTypeUoMsObject) {

                    if (physicalUnitsTypeUoMsObject.hasOwnProperty(key)) {

                        currentField.insertSelectOption({
                            value: key,
                            text: physicalUnitsTypeUoMsObject[key],
                            isSelected: (key === defaultSelection)
                        });
                    }
                }
            }
        }




        /**
         * This function removes existing select options from temporary fields
         * @param currentField
         */
        function removeSelectOptions(currentField) {
            currentField.removeSelectOption({
                value: null
            });
        }



        /**
         * This function get Unit of Measure from Unit Type record
         * @param currentPricingUnitsType
         * @returns {string}
         */
        function getUOMsFromUnitType(currentPricingUnitsType) {

            var tempObject = {};
            var units_type = record.load({
                type: record.Type.UNITS_TYPE,
                id: currentPricingUnitsType,
                isDynamic: false,
            });

            // get line item count of Units Type
            var uom_length = units_type.getLineCount({
                sublistId: 'uom'
            });

            if (uom_length >= 1) {
                // loop in the line items of Units Type
                for (j = 0; j < uom_length; j++) {
                    var uom_id = units_type.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'internalid',
                        line: j
                    });
                    var uom_name = units_type.getSublistValue({
                        sublistId: 'uom',
                        fieldId: 'unitname',
                        line: j
                    });
                    tempObject[uom_id] = uom_name
                }
            } else {
                return '';
            }

            return tempObject;
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


        /**
         *
         * @param scriptContext
         */
        function fieldChanged(scriptContext) {

            var currentRecord   = scriptContext.currentRecord;
            var fieldChanged    = scriptContext.fieldId;

            if (fieldChanged === 'custitem_cw_pricing_units_type') {

                //get Pricing Units Type and Physical Units Types from Item Record
                var currentPricingUnitsType = currentRecord.getValue({
                    fieldId: 'custitem_cw_pricing_units_type'
                });

                var currentPhysicalUnitsType = currentRecord.getValue({
                    fieldId: 'unitstype'
                });

                //get temporary fields added to item records

                var tempPricingUnitsField = currentRecord.getField({
                    fieldId: 'custpage_cw_pricing_unit'
                });

                var tempPurchasingPricingUnitsField = currentRecord.getField({
                    fieldId: 'custpage_cw_purchase_pricing_unit'
                });

                var tempSalesPricingUnitsField = currentRecord.getField({
                    fieldId: 'custpage_cw_sales_pricing_unit'
                });

                if (isEmpty(tempPricingUnitsField) || isEmpty(tempPurchasingPricingUnitsField) || isEmpty(tempSalesPricingUnitsField)) {
                    console.log('One of the fields are missing. Restricted field sourcing will not work');
                    return;
                }

                var pricingUnitsTypeUoMsObject  = '';
                var physicalUnitsTypeUoMsObject = '';


                if (!isEmpty(currentPricingUnitsType)) {

                    pricingUnitsTypeUoMsObject = getUOMsFromUnitType(currentPricingUnitsType);

                } else {

                    removeSelectOptions(tempPricingUnitsField);
                    removeSelectOptions(tempPurchasingPricingUnitsField);
                    removeSelectOptions(tempSalesPricingUnitsField);
                }

                if (!isEmpty(currentPhysicalUnitsType)) {

                    physicalUnitsTypeUoMsObject = getUOMsFromUnitType(currentPhysicalUnitsType);

                } else {
                    removeSelectOptions(tempPurchasingPricingUnitsField);
                    removeSelectOptions(tempSalesPricingUnitsField);
                }

                //set Pricing Units
                if (!isEmpty(pricingUnitsTypeUoMsObject)) {

                    addSelectOptions(tempPricingUnitsField, pricingUnitsTypeUoMsObject, '', '');
                }

                //set PURCHASING PRICING UNIT and, SALES PRICING UNIT
                if (!isEmpty(physicalUnitsTypeUoMsObject) || !isEmpty(pricingUnitsTypeUoMsObject)) {

                    addSelectOptions(tempPurchasingPricingUnitsField, pricingUnitsTypeUoMsObject, physicalUnitsTypeUoMsObject, '');
                    addSelectOptions(tempSalesPricingUnitsField, pricingUnitsTypeUoMsObject, physicalUnitsTypeUoMsObject, '');

                }
            }
        }



        /**
         *
         * @param scriptContext
         * @returns {boolean}
         */
        function saveRecord(scriptContext) {

            var currentRecord       = scriptContext.currentRecord;
            var scriptObj           = runtime.getCurrentScript();
            var fieldsToCheck       = scriptObj.getParameter('custscript_nsts_cw_field_ids_to_lock');
            var fieldsToCheckText   = scriptObj.getParameter('custscript_nsts_cw_field_names_to_lock');

            setNativeCWFieldValues(currentRecord);

            var isCatchWeightItem = currentRecord.getValue({
                fieldId: 'custitem_cw_catch_weight_item'
            });



            if (isCatchWeightItem === true) {

                if (isEmpty(fieldsToCheck)) {
                    alert('script parameters are missing.')
                    return validationResult;
                }

                 var validationResult = validateFieldValues(currentRecord, fieldsToCheck);

                if (validationResult) {

                   alert('This is a Catch Weight Item. Please Enter Values for fields : ' + fieldsToCheckText);
                   return false;
                }
            } else {
                return true;
            }
            return true;
        }

        /**
         * Function to set native CW field values with temporary field values.
         * @param currentRecord
         */
        function setNativeCWFieldValues(currentRecord){

            var tempPricingUnit = currentRecord.getValue({
                fieldId: 'custpage_cw_pricing_unit'
            });

            var tempPurchasingPricingUnit = currentRecord.getValue({
                fieldId: 'custpage_cw_purchase_pricing_unit'
            });

            var tempSalesPricingUnit = currentRecord.getValue({
                fieldId: 'custpage_cw_sales_pricing_unit'
            });

            currentRecord.setValue({
                fieldId: 'custitem_cw_pricing_unit',
                value: (tempPricingUnit !== 'empty') ? tempPricingUnit : '',
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });

            currentRecord.setValue({
                fieldId: 'custitem_cw_purchase_pricing_unit',
                value: (tempPurchasingPricingUnit !== 'empty') ? tempPurchasingPricingUnit : '',
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });



            currentRecord.setValue({
                fieldId: 'custitem_cw_sales_pricing_unit',
                value: (tempSalesPricingUnit !== 'empty') ? tempSalesPricingUnit : '',
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });



        }


        /**
         * Checks fields for empty
         * @param currentRecord
         * @param fieldsToCheck
         * @returns {boolean}
         */
        function validateFieldValues(currentRecord, fieldsToCheck) {

            var fieldsToCheckArray = fieldsToCheck.split(',');

            for (var i = 0; i < fieldsToCheckArray.length; i++) {

                var currentFieldValue = currentRecord.getValue({
                    fieldId: fieldsToCheckArray[i]
                });

                if (isEmpty(currentFieldValue)) {
                    return true;
                }
            }

            return false;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord
        };

    });
