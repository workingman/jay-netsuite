/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * Version    Date				Author				Remarks
 * 1.00       08 Jun 2016     memeremilla			Initial version
 * 2.00		  20 Dec 2018	  sjsantiago			Moved setting of line item values to a Scheduled Script to fix Governance issue
 * 2.10 	  28 Dec 2018	  jjacob		  		Code review completed for v2.0
 * 3.00		  07 Jan 2019	  sjsantiago			Moved back setting of line item values to this UE Script. Made Scheduled Script inactive and undeployed.
 */

/**
 * @param {String} type Operation types: create, edit 
 * @return {void}
 */

function orderItemsAfterSubmit(type)
{
	try
	{
		var stLoggerTitle = 'orderItemsAfterSubmit'
		nlapiLogExecution('DEBUG', stLoggerTitle, '*** START: Script entry point function. ***' + ' | Operation Type: ' + type);

		if (!(type == 'create' || type == 'edit'))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Unsupported operation type. | *** END: Script entry point function. ***');
			return;
		}
		
		var stRecordId = nlapiGetRecordId();
		var stRecordType = nlapiGetRecordType();
		var recObject = nlapiLoadRecord(stRecordType, stRecordId);  //,
		/*	{
				recordmode : 'dynamic'
			});  */
		var intLines = recObject.getLineItemCount('item');

		// v3.00 | Lines added start ---
		
		var arrItemId = [];
		
		// Get Line Item Value and store in 'arrItemId' Array
		for (var i = 1; i <= intLines; i++)
		{
			var stItemId = recObject.getLineItemValue('item', 'item', i);
			arrItemId.push(stItemId);
		}
		
		nlapiLogExecution('DEBUG', stLoggerTitle, JSON.stringify(arrItemId));
		
		if (NSUtil.isEmpty(arrItemId))
		{
			nlapiLogExecution('ERROR', stLoggerTitle, 'NO_ITEM_FOUND: No valid items');
			nlapiLogExecution('DEBUG', stLoggerTitle, '*** END: Script entry point function. ***');
			return;
		}
		
		// Get Item Details --- using searchItems function
		var ITEM = OrderItems.searchItems(arrItemId);
		
		nlapiLogExecution('DEBUG', stLoggerTitle, JSON.stringify(ITEM));
		
		var CONVERSION_RATE = {};
		var VENDOR_COST = {};
		
		// v3.00 | Lines added end ---
		
		for (var intCtr = 1; intCtr <= intLines; intCtr++)
		{
			try
			{
				var stItemId = recObject.getLineItemValue('item', 'item', intCtr);
				var stCatchWgtItem = recObject.getLineItemValue('item', 'custcol_cw_item_ckbx', intCtr);
				var stActWght = recObject.getLineItemValue('item', 'custcol_cw_act_wght', intCtr);
				
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Line Item ID: ' + stItemId + ' Catch Weight Item: ' + stCatchWgtItem + ' Act Weight: ' + stActWght);
				
				var objItem = ITEM[stItemId];
				
				if (NSUtil.isEmpty(objItem) || NSUtil.isEmpty(stCatchWgtItem))
				{
					throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', stLoggerTitle + ': Missing param - Item Object Info/Catch Weight Item');
				}

		        if(stCatchWgtItem == 'T' && stActWght == null) 
		        {
		        	var flWeight = NSUtil.forceFloat(objItem.weight);
		        	var flQty = NSUtil.forceFloat(recObject.getLineItemValue('item', 'quantity', intCtr));
		        	//var flPriceUM = NSUtil.forceFloat(objItem.vendorcost); //==Purchase Price, was vendorCost
		            //var flPriceUM = NSUtil.forceFloat(getVendorPurchasePrice(stItemId));
                    if (type == 'create') {
		                var flPriceUM = NSUtil.forceFloat(recObject.getLineItemValue('item', 'rate', intCtr)); //if cust wants change PO rate for each order
		                //nlapiLogExecution('DEBUG', stLoggerTitle, "type create - flPriceUM: " + flPriceUM);
                    } else {
                        var flPriceUM = NSUtil.forceFloat(recObject.getLineItemValue('item', COL_PRICE_UM, intCtr));
                        //nlapiLogExecution('DEBUG', stLoggerTitle, "type edit - flPriceUM: " + flPriceUM);
                    }

		        	if (stRecordType == 'purchaseorder') {
					   //var stIdPhysicalUnitsType = objItem.unitsType; //original=native Item header fld==moved down
					   var stIdPhysicalUnitsType = objItem.priceUnitType; //custom unit type field
					   var stUnitName = objItem.purchasePriceUnit;  //now custom Purch Pricing Unit field
					   //var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType)); -- Commented out to fix Governance Issue
		nlapiLogExecution('DEBUG', stLoggerTitle, 'PO :: stIdPhysicalUnitsType : ' + stIdPhysicalUnitsType + ' | stUnitName : ' + stUnitName);        	
					   // (v3.00) -- Perform Search for each unique Unit Name and Physical Unit Type combination **START**
					   var flConversionRate = (function(unit, type){
						  if (!CONVERSION_RATE[unit+'_'+type]){
							CONVERSION_RATE[unit+'_'+type] = getUOMConversionRate(unit, type);
						  }
						  return NSUtil.forceFloat(CONVERSION_RATE[unit+'_'+type]);
					   })(stUnitName, stIdPhysicalUnitsType);
					   // (v3.00) -- Perform Search for each unique Unit Name and Physical Unit Type combination **END**
					
		nlapiLogExecution('DEBUG', stLoggerTitle, 'PO :: flWeight : ' + flWeight + ' | stActWght : ' + stActWght + ', flConversionRate=' +flConversionRate);
					
                        if (flConversionRate == 0) {
                            //re-do with native Physical Units Type
							var stIdPhysicalUnitsType = objItem.unitsType; //native Item header field
							var stUnitName = objItem.purchaseUnit;  //native Item header field
                            var flConversionRate = (function(unit, type){
                            if (!CONVERSION_RATE[unit+'_'+type]){
                                CONVERSION_RATE[unit+'_'+type] = getUOMConversionRate(unit, type);
                            }
                            return NSUtil.forceFloat(CONVERSION_RATE[unit+'_'+type]);
                            })(stUnitName, stIdPhysicalUnitsType);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'PO : 2nd flConversionRate=' +flConversionRate);
                        }

//nlapiLogExecution('DEBUG', stLoggerTitle, 'stCatchWgtItem: ' + stCatchWgtItem + ', stUnitName: ' + stUnitName + ', stPricingUnit: ' + stPricingUnit + ', stPricingUnitType: ' + stPricingUnitType);
		        	
                        var flAvgWeight = NSUtil.forceFloat(flWeight * flConversionRate);
                        var flAmount = NSUtil.forceFloat(flPriceUM * flAvgWeight * flQty);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'PO, flAvgWeight= ' + flAvgWeight + ', flAmount= ' + flAmount + ', flPriceUM= ' + flPriceUM);
                    }
                    
		            if(stRecordType == 'salesorder') {
			      	    var stIdPhysicalUnitsType = objItem.priceUnitType; //custom unit type fld
                        var stUnitName = objItem.salePriceUnit;  //custom Sale Pricing Unit fld
		                //var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType)); -- Commented out to fix Governance Issue
    		            // (v3.00) -- Perform Search for each unique Unit Name and Physical Unit Type combination **START**
    					var flConversionRate = (function(unit, type){
    						if (!CONVERSION_RATE[unit+'_'+type]){
    							CONVERSION_RATE[unit+'_'+type] = getUOMConversionRate(unit, type);
    						}
    						return NSUtil.forceFloat(CONVERSION_RATE[unit+'_'+type]);
    					})(stUnitName, stIdPhysicalUnitsType);
    					// (v3.00) -- Perform Search for each unique Unit Name and Physical Unit Type combination **END**
    					
                        if (flConversionRate == 0) {
                            //re-do with native Physical Units Type
                            var stIdPhysicalUnitsType = objItem.unitsType; //native Item header fld
							var stUnitName = objItem.saleUnit; //native Item header fld
                            var flConversionRate = (function(unit, type){
                            if (!CONVERSION_RATE[unit+'_'+type]){
                                CONVERSION_RATE[unit+'_'+type] = getUOMConversionRate(unit, type);
                            }
                            return NSUtil.forceFloat(CONVERSION_RATE[unit+'_'+type]);
                            })(stUnitName, stIdPhysicalUnitsType);
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'SO; 2nd flConversionRate=' +flConversionRate);
                        }
                    
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'SO, stUnitName : ' + stUnitName + ', stRecordType = ' + stRecordType  + ', flConversionRate=' + flConversionRate);
		                var flAvgWeight = NSUtil.forceFloat(flWeight * flConversionRate); //-- needed for multiple UoM
			      	    //var flPriceUM = NSUtil.forceFloat(recObject.getLineItemValue('item', 'rate', intCtr)); --set on ln 101
			      	    var flAmount = NSUtil.forceFloat(flPriceUM * flAvgWeight * flQty);
				        nlapiLogExecution('DEBUG', stLoggerTitle, 'SO, flPriceUM : ' + flPriceUM + ', flAvgWeight=' + flAvgWeight + ', flAmount=' + flAmount);
				    }
		            
		            nlapiLogExecution('DEBUG', stLoggerTitle, 'Setting values at the line. | flAvgWeight : ' + flAvgWeight + ' | flPriceUM : ' + flPriceUM + ' | flAmount : ' + flAmount + ' | stCatchWgtItem=' + stCatchWgtItem);

                    recObject.setLineItemValue('item', COL_AVG_WGHT, intCtr, flAvgWeight); //Setting Col Fld Avg Weight
		            recObject.setLineItemValue('item', COL_PRICE_UM, intCtr, roundOffValue(flPriceUM, 2)); //Setting Col Fld Price per UoM
		            recObject.setLineItemValue('item', 'amount', intCtr, roundOffValue(flAmount, 2));
				}
			}
			
			catch(error)
			{
				if (error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
				}
				else
				{
					nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
				}
			}
		}
		
		nlapiSubmitRecord(recObject, false, true);
		nlapiLogExecution('AUDIT', stLoggerTitle, 'Record has been saved. Record Type : ' + stRecordType + ' | Record Id : ' + stRecordId);
		nlapiLogExecution('DEBUG', stLoggerTitle, '*** END: Script entry point function. ***');
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining Usage: ' + nlapiGetContext().getRemainingUsage());
		
	}
	
	catch(error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
		}
	}
}

//Library//

var NSUtil =
	{
	    /**
	     * Evaluate if the given string or object value is empty, null or undefined.
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author mmeremilla
	     */
	    isEmpty : function(stValue)
	    {
		    if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		            || (stValue == null) || (stValue == undefined))
		    {
			    return true;
		    }
		    else
		    {
			    if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			    {
				    if (stValue.length == 0)
				    {
					    return true;
				    }
			    }
			    else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			    {
				    for ( var stKey in stValue)
				    {
					    return false;
				    }
				    return true;
			    }

			    return false;
		    }
	    },
	    /**
	     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - a floating point number
	     * @author jsalcedo
	     */
	    forceFloat : function(stValue)
	    {
		    var flValue = parseFloat(stValue);

		    if (isNaN(flValue) || (stValue == Infinity))
		    {
			    return 0.00;
		    }

		    return flValue;
	    }
	};


var OrderItems = (typeof OrderItems === 'undefined') ? {} : OrderItems;
var context = nlapiGetContext();

/**
 * Search Items
 * Get Search Results ==> **DO NOT DELETE** Item Search
 * @param {Object} arrItemId : Array of Item IDs obtained from the Record Object
 * @returns {Object} ITEM : Item Details Object (e.g. Item Weight)
  custitem_cw_purchase_pricing_unit->purchaseunit
  arrResult.getText('saleunit'); //custitem_cw_sales_pricing_unit
 */
OrderItems.searchItems = function(arrItemId)
{
	var stItemSearch = context.getSetting('SCRIPT', 'custscript_item_saved_search_ue');
	var ITEM = {};
	var arrFilter = [];
	
	arrFilter.push(new nlobjSearchFilter('internalid', null, 'anyof', arrItemId));
	
	var arrResults = nlapiSearchRecord('item', stItemSearch, arrFilter, null);
	
	for ( var i = 0; arrResults != null && i < arrResults.length; i++ )
	{
		var arrResult = arrResults[i];
		var intItemId = arrResult.getValue('internalid');
		var stWeight = arrResult.getValue('weight');
		var stUnitsType = arrResult.getValue('unitstype');
		var stIsCatchWeightItem = arrResult.getValue('custitem_cw_catch_weight_item');
		var stPurchaseUnit = arrResult.getText('purchaseunit');
        var stSaleUnit = arrResult.getText('saleunit');
		var stPriceUnitType = arrResult.getValue('custitem_cw_pricing_units_type');
		//var stPriceUnit = arrResult.getText('custitem_cw_pricing_unit');
		var stPurchasePriceUnit = arrResult.getText('custitem_cw_purchase_pricing_unit');
        var stSalePriceUnit = arrResult.getText('custitem_cw_sales_pricing_unit');
        var stVendorCost = arrResult.getValue('vendorcost');
		
		ITEM[intItemId] = {
				weight: stWeight,
				unitsType : stUnitsType,
				isCatchWeightItem : stIsCatchWeightItem,
				purchaseUnit : stPurchaseUnit,
				saleUnit : stSaleUnit,
				priceUnitType : stPriceUnitType,
				//pricingUnit : stPriceUnit,
				purchasePriceUnit : stPurchasePriceUnit,
				salePriceUnit : stSalePriceUnit,
                vendorCost : stVendorCost
		}
	}
	
	return ITEM;
};
