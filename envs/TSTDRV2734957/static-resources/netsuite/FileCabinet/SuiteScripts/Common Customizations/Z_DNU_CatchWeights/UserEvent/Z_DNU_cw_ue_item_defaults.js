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
            var LogTitle = 'beforeLoad';
            log.audit({title: LogTitle, details: LogTitle + LOG_START});

            try {

                //check context
                if (validateContext(scriptContext)) {
                    log.audit({title: LogTitle, details: 'Context is not supported'});
                    return true;
                }

                var currentForm = scriptContext.form;

                var pricingUnit = currentForm.getField({
                    id: 'custitem_cw_pricing_unit'
                });
                var cwSubTab = Helper.getCatchWeightsTabId(scriptContext);
                log.debug('tabs', cwSubTab);
                //hide existing fields
                var userContext = scriptContext.context
                log.debug(LogTitle, 'CONTEXT: ' + userContext);
                if (runtime.executionContext == runtime.ContextType.USER_INTERFACE){
                    hideFields(pricingUnit);
                }
                //add fields
                currentForm.addField({
                    id: 'custpage_cw_pricing_unit',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Pricing Unit',
                    container: cwSubTab,
                    help: 'Catch Weights: Enter the Pricing unit for this Item, (LBs or KG typically)'
                });
            } catch (e) {
                log.error(LogTitle, e.message);
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
        //custom Function to update pricing properly
        function updatePricing(unitsType, units, baseUnitWeight, pricePerPricingUnit){
            var logTitle = 'updatePricing'
            var unitsTypeReview = record.load({
                type: 'unitstype',
                id: unitsType
            });
            var unitsTypeLines = unitsTypeReview.getLineCount('uom');
            //find conversion rate to base unit. netsuite will handle any adjustment to purchase / sale units natively
            for (i=0; i<unitsTypeLines; i++){
                var unitMeasureId = unitsTypeReview.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'internalid',
                    line: i
                });
                if(unitMeasureId !== units){
                    continue;   
                }
                var conversionRate = unitsTypeReview.getSublistValue({
                    sublistId: 'uom',
                    fieldId: 'conversionrate',
                    line: i
                });
                log.debug(logTitle,'Conversion Rate: ' + conversionRate);
                log.debug(logTitle, 'New Price to be: ' + conversionRate + '*' + pricePerPricingUnit + '*' + baseUnitWeight);
                //set new purchase price based on fields and conversion rate
                var newPrice = (baseUnitWeight)*(pricePerPricingUnit)*(conversionRate);
            }
        return newPrice;
        }
        /**
         *
         * @param scriptContext
         */
        function beforeSubmit(scriptContext) {
            var oldRecord = scriptContext.oldRecord
            var newRecord = scriptContext.newRecord
            var logTitle = 'beforeSubmit';
            try{
                var isCatchWeightItem = newRecord.getValue({
                    fieldId: 'custitem_cw_catch_weight_item'
                });
                if (isCatchWeightItem == false){
                    log.debug(logTitle, 'Not a catch weight item, no requirement for checking fields')
                    return;
                }
                if (isCatchWeightItem === true) {
                    log.debug(logTitle, 'is catch weight item, checking fields');
                    var pricingUnitsType = newRecord.getValue('custitem_cw_pricing_units_type');
                    var catchWeightTolerance = newRecord.getValue('custitem_cw_weight_tolerance');
                    var pricingUnit = newRecord.getValue('custitem_cw_pricing_unit');
                    log.debug(logTitle, 'Pricing Units Type: ' + pricingUnitsType + ' Pricing Unit: ' + pricingUnit + ' Catch Weight Tolerance: ' + catchWeightTolerance);
                    if (!pricingUnit ||
                        !pricingUnitsType ||
                        !catchWeightTolerance){
                        throw error.create({
                            name: "Catch Weight Fields Missing",
                            message: "This item has been indicated as a Catch Weight item. Please fill out all fields on the Catch Weights Setup tab to continue.",
                            notify: false
                        });
                    }
                    var unitsType = newRecord.getValue('unitstype');
                    var newSaleUnit = newRecord.getValue('saleunit');
                    var newPurchaseUnit = newRecord.getValue('purchaseunit');
                    var baseUnitWeight = newRecord.getValue('custitem_cw_base_unit_weight');
                    var salePricePerPriceUnit = newRecord.getValue('custitem_cw_sp_pricing_unit');
                    var purchasePricePerPriceUnit = newRecord.getValue('custitem_cw_pp_pricing_unit');
                    if (scriptContext.type == scriptContext.UserEventType.CREATE){
                        //update all fields when creating an item
                        log.debug(logTitle, 'CREATE: Updating related fields via custom function')
                        var newItemSalePrice = updatePricing(unitsType, newSaleUnit, baseUnitWeight, salePricePerPriceUnit);
                        var newItemPurchasePrice = updatePricing(unitsType, newPurchaseUnit, baseUnitWeight, purchasePricePerPriceUnit);
                        newRecord.setValue({
                            fieldId: 'cost',
                            value: newItemPurchasePrice
                        });
                        var multiCurrency = 
                            runtime.isFeatureInEffect({
                                feature: 'MULTICURRENCY'
                        });
                        var sublistId = multiCurrency ? 'price1' : 'price';
                        newRecord.setMatrixSublistValue({
                            sublistId: sublistId,
                            fieldId: 'price',
                            column: 0,
                            line: 0,
                            value: newItemSalePrice,
                            ignoreFieldChange: false,
                            fireSlavingSync: true
                        });
                        //updating weight 
                        var unitsTypeReview = record.load({
                            type: 'unitstype',
                            id: unitsType
                        });
                        var unitsTypeLines = unitsTypeReview.getLineCount('uom');
                        //find conversion rate to base unit. netsuite will handle any adjustment to purchase / sale units natively
                        for (i=0; i<unitsTypeLines; i++){
                            var unitMeasureId = unitsTypeReview.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'internalid',
                                line: i
                            });
                            if(unitMeasureId !== newSaleUnit){
                                continue;   
                            }
                            var conversionRate = unitsTypeReview.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'conversionrate',
                                line: i
                            });
                            log.debug(logTitle,'Conversion Rate: ' + conversionRate);
                            var newItemWeight = (conversionRate)*(baseUnitWeight);
                            log.debug(logTitle, 'Sale Unit Weight to be updated: ' + newItemWeight);
                            newRecord.setValue({
                                fieldId: 'weight',
                                value: newItemWeight
                            });
                            log.debug(logTitle, 'Weight has been updated');
                        }
                    }
                    //update purchase price/sale price based on purchasing/sale pricing per base unit
                    if (scriptContext.type == scriptContext.UserEventType.EDIT){
                    var oldPurchaseUnit = oldRecord.getValue('purchaseunit');
                    var oldSaleUnit = oldRecord.getValue('saleunit');
                    var oldBaseUnitWeight = oldRecord.getValue('custitem_cw_base_unit_weight');
                    var oldSalePricePerPricingUnit = oldRecord.getValue('custitem_cw_sp_pricing_unit');
                    var oldPurchasePricePerPricingUnit = oldRecord.getValue('custitem_cw_pp_pricing_unit');
                    log.debug(logTitle, 'Old and new Values Gathered for potential price update. Comparing values..');
                    log.debug(logTitle, 'Old Base Unit Weight: ' + oldBaseUnitWeight + ' New Base Unit Weight: ' + baseUnitWeight);
                    log.debug(logTitle, 'Old Sale Price per PRicing Unit: ' + oldSalePricePerPricingUnit + ' New Sale Pricing Rate: ' + salePricePerPriceUnit);
                    log.debug(logTitle, 'Old Purchase Price per Pricing Unit: ' + oldPurchasePricePerPricingUnit + ' New Purchase Pricing Rate: '+ purchasePricePerPriceUnit); 
                    //comparing purchase based values
                    if((oldBaseUnitWeight !== baseUnitWeight) ||
                        (oldPurchasePricePerPricingUnit !== purchasePricePerPriceUnit)){
                        log.debug(logTitle, 'Purchase related fields have been updated...analyzing and sending to updatePricing function...');
                        var purchasePriceUpdate = updatePricing(unitsType, oldPurchaseUnit, baseUnitWeight, purchasePricePerPriceUnit);
                        log.debug(logTitle, 'Purchase Price to be updated to: ' + purchasePriceUpdate);
                            newRecord.setValue({
                                fieldId: 'cost',
                                value: purchasePriceUpdate
                            });
                            log.debug(logTitle, 'Purchase Price has been updated');
                    }
                    //same process for sale related fields
                    if((oldBaseUnitWeight !== baseUnitWeight) ||
                        (oldSalePricePerPricingUnit !== salePricePerPriceUnit)){
                        log.debug(logTitle, 'Sale-Related Fields have been updated. Changing Pricing....');
                        var salePriceUpdate = updatePricing(unitsType, oldSaleUnit, baseUnitWeight, salePricePerPriceUnit);
                        log.debug(logTitle, 'Base Price to be updated to: ' + salePriceUpdate);
                        var multiCurrency = 
                            runtime.isFeatureInEffect({
                                feature: 'MULTICURRENCY'
                        });
                        var sublistId = multiCurrency ? 'price1' : 'price';
                        newRecord.setMatrixSublistValue({
                            sublistId: sublistId,
                            fieldId: 'price',
                            column: 0,
                            line: 0,
                            value: salePriceUpdate,
                            ignoreFieldChange: false,
                            fireSlavingSync: true
                        });
                        log.debug(logTitle, 'Base Price has been updated');
                    }    
                    if(oldBaseUnitWeight !== baseUnitWeight){
                        log.debug(logTitle, 'Base Unit Weight has changed, updating item weight');
                        var unitsTypeReview = record.load({
                            type: 'unitstype',
                            id: unitsType
                        });
                        var unitsTypeLines = unitsTypeReview.getLineCount('uom');
                        //find conversion rate to base unit. netsuite will handle any adjustment to purchase / sale units natively
                        for (i=0; i<unitsTypeLines; i++){
                            var unitMeasureId = unitsTypeReview.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'internalid',
                                line: i
                            });
                            if(unitMeasureId !== oldSaleUnit){
                                continue;   
                            }
                            var conversionRate = unitsTypeReview.getSublistValue({
                                sublistId: 'uom',
                                fieldId: 'conversionrate',
                                line: i
                            });
                            log.debug(logTitle,'Conversion Rate: ' + conversionRate);
                            var newItemWeight = (conversionRate)*(baseUnitWeight);
                            log.debug(logTitle, 'Sale Unit Weight to be updated: ' + newItemWeight);
                            newRecord.setValue({
                                fieldId: 'weight',
                                value: newItemWeight
                            });
                            log.debug(logTitle, 'Weight has been updated');
                        }        
                    }
                    }
                }
            } catch (e) {
                log.error(logTitle, e.name + ' : ' + e.message);
                if (e.name == 'Catch Weight Fields Missing') {
                    throw e.message;
                }
            }
        }
        return {
            beforeLoad  : beforeLoad,
            beforeSubmit: beforeSubmit,
        };
    });
