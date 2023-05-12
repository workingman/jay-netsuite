/**
 * Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ('Confidential Information').
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */
/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
define(['N/record', 'N/error'], function (record, error) {
    var Client = {};
    Client.pageInit = function(context) {
        var logTitle = 'pageInit';
        try {
            log.debug(logTitle, 'In Page Init Function in try ');
            //gather record information including field information for fields that will be overlapped by UE Script
            var curRec = context.currentRecord;
            var catchWeightItem = curRec.getValue({
                fieldId: 'custitem_cw_catch_weight_item'
            });
            log.debug(logTitle, 'Catch Weight Item: ' + catchWeightItem);
            var currentPricingUnitsType = curRec.getValue({
                fieldId: 'custitem_cw_pricing_units_type'
            });
            log.debug(logTitle, 'Pricing Units Type Value: ' + currentPricingUnitsType)
            var currentPricingUnit = curRec.getValue({
                fieldId: 'custitem_cw_pricing_unit'
            });
            var tempPricingUnitsField = curRec.getField({
                fieldId: 'custpage_cw_pricing_unit'
            });
            log.debug(logTitle, 'Pricing Unit Value: ' + currentPricingUnit);
            //if Catch Weight Item is false, mark fields to disabled and exit Page INIT function
            if (catchWeightItem ==false){
                //marking fields disabled (SS 1.0)
                nlapiSetFieldDisabled('custitem_cw_pricing_unit', true);
                nlapiSetFieldDisabled('custitem_cw_pricing_units_type', true);
                nlapiSetFieldDisabled('custpage_cw_pricing_unit', true);
                nlapiSetFieldDisabled('custitem_cw_weight_tolerance', true);
                nlapiSetFieldDisabled('custitem_cw_base_unit_weight', true);
                nlapiSetFieldDisabled('custitem_cw_pp_pricing_unit', true);
                nlapiSetFieldDisabled('custitem_cw_sp_pricing_unit', true);
                return;
            }
            //set current pricing unit
            curRec.setValue({
                fieldId: 'custpage_cw_pricing_unit',
                value: currentPricingUnit,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
            var pricingUnitsTypeUoMsObject  = '';
            //if the native field is populated, then 
            if (currentPricingUnitsType) {
                pricingUnitsTypeUoMsObject = getUOMsFromUnitType(currentPricingUnitsType);
                log.debug(logTitle, 'Back into Page INIT after collecting object: ' + pricingUnitsTypeUoMsObject);
            }
            if (pricingUnitsTypeUoMsObject) {
                log.debug(logTitle, 'Met Criteria for AddSelect Function');
                addSelectOptions(tempPricingUnitsField, pricingUnitsTypeUoMsObject, currentPricingUnit);
            }
        }
        catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
        }
    }
    /**
    * This function get Unit of Measure from Unit Type record
     * @param currentPricingUnitsType
     * @returns {string}
     */
    function getUOMsFromUnitType(currentPricingUnitsType) {
        var logTitle = 'GetUOMsFromUnitType'
        log.debug(logTitle, 'In Function to grab UOMS for Pricing Unit Selection');
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
        log.debug(logTitle, 'Units Type Line Count: ' + uom_length);
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
                log.debug(logTitle, 'tempObject: ' + tempObject);
            }
        } else {
            return '';
        }
        return tempObject;
    }
    //function utilized for removing selection options prior to adding selections
    /**This function removes existing select options from temporary fields
    * @param currentField
    */
    function removeSelectOptions(currentField) {
        var logTitle = 'removeSelections'
        log.debug(logTitle, 'in Remove Selections Function to clear temp fields');
        currentField.removeSelectOption({
            value: null
        });
    }
    //function to add filtered list to proper fields
     /**
     * This function add select options to temporary fields and sets a default value based on native field selection
    * @param currentField
     * @param pricingUnitsTypeUoMsObject
     * @param defaultSelection
     */
    function addSelectOptions(currentField, pricingUnitsTypeUoMsObject, defaultSelection) {
        var logTitle = 'addSelectOptions'
        log.debug(logTitle, 'in AddSelection Phase for Object');
        removeSelectOptions(currentField);
        currentField.insertSelectOption({
            value: 'empty',
            text: ' '
        });
        //add Pricing Units Type UoMs if applicable
        if (pricingUnitsTypeUoMsObject) {
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
    }

    Client.fieldChanged = function(context){
        var logTitle = 'fieldChanged';
        var curRec = context.currentRecord;
        try{
            //if fields changed are not catch weight item or pricing units type, return
            log.debug(logTitle, 'In Field Changed Function in try ');
            if(context.fieldId !== 'custitem_cw_catch_weight_item' &&
                context.fieldId !== 'custitem_cw_pricing_units_type'){
                log.debug(logTitle, 'Field adjusted is not catchweight checkbox or units type');
                return;
            }
            if(context.fieldId == 'custitem_cw_catch_weight_item'){
                log.debug(logTitle, 'Catch Weight Item Checkbox has been changed');
                var catchWeightChanged = curRec.getValue('custitem_cw_catch_weight_item');
                log.debug(logTitle, 'Catch Weight Changed To: ' + catchWeightChanged);
                //if catch weight changes to true, enable fields
                if(catchWeightChanged == true){
                    nlapiSetFieldDisabled('custitem_cw_pricing_unit', false);
                    nlapiSetFieldDisabled('custitem_cw_pricing_units_type', false);
                    nlapiSetFieldDisabled('custpage_cw_pricing_unit', false);
                    nlapiSetFieldDisabled('custitem_cw_weight_tolerance', false);
                    nlapiSetFieldDisabled('custitem_cw_base_unit_weight', false);
                    nlapiSetFieldDisabled('custitem_cw_pp_pricing_unit', false);
                    nlapiSetFieldDisabled('custitem_cw_sp_pricing_unit', false);
                }
                //if catch weight changes to false, disable fields
                if(catchWeightChanged == false){
                    nlapiSetFieldDisabled('custitem_cw_pricing_unit', true);
                    nlapiSetFieldDisabled('custitem_cw_pricing_units_type', true);
                    nlapiSetFieldDisabled('custpage_cw_pricing_unit', true);
                    nlapiSetFieldDisabled('custitem_cw_weight_tolerance', true);
                    nlapiSetFieldDisabled('custitem_cw_base_unit_weight', true);
                    nlapiSetFieldDisabled('custitem_cw_pp_pricing_unit', true);
                    nlapiSetFieldDisabled('custitem_cw_sp_pricing_unit', true);
                }
            }
            if(context.fieldId == 'custitem_cw_pricing_units_type'){
                log.debug(logTitle, 'Unit Type has been changed');
                var currentPricingUnitsType = curRec.getValue('custitem_cw_pricing_units_type');
                log.debug(logTitle, 'New Value for Units Type: ' + currentPricingUnitsType);
                var tempPricingUnitsField = curRec.getField({
                    fieldId: 'custpage_cw_pricing_unit'
                });
                //if pricing units type changes, then gather values from custom function and do same as page init
                if (!tempPricingUnitsField) {
                    log.debug(logTitle, 'layover field is empty, no sourcing currently required');
                    return;
                }
                var pricingUnitsTypeUoMsObject  = '';
                if (currentPricingUnitsType) {
                    pricingUnitsTypeUoMsObject = getUOMsFromUnitType(currentPricingUnitsType);

                } else {
                    removeSelectOptions(tempPricingUnitsField);
                }
                if (pricingUnitsTypeUoMsObject) {
                    addSelectOptions(tempPricingUnitsField, pricingUnitsTypeUoMsObject, '', '');
                }
            }
        }
        catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
        }
    }
    Client.saveRecord = function(context){
        try{
            //populate native fields with values from the temporary fields
            var logTitle = 'SaveRecord'
            var curRec = context.currentRecord;
            log.debug(logTitle, 'in Save Record Function');
            var tempPricingUnits = curRec.getValue('custpage_cw_pricing_unit');
            log.debug (logTitle, 'Temp Field Value to Add to Native Value: ' + tempPricingUnits)
            curRec.setValue({
                fieldId: 'custitem_cw_pricing_unit',
                value: tempPricingUnits,
                ignoreFieldChange: true,
                forceSyncSourcing: true
            });
            return true;
        } catch (e) {
            log.error(logTitle, e.name + ' : ' + e.message);
        }
    }
    return Client;
});
