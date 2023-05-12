/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', '../Library/NS_CW_Constants'], function(search, record, constants) {
    var Helper = {};

    Helper.getSearchForNeedTotals = function() {
        return search.load({id: constants.SavedSearch.TRUE_UP_TOTALS});
    }

    Helper.addCombinationFilters = function(options) {
        var ledgerSearch = options.search;
        var combination = options.combination;

        ledgerSearch.filters.push(search.createFilter({
            name: constants.RecordType.WeightLedger.Fields.ITEM,
            operator: search.Operator.ANYOF,
            values: [combination.item]
        }));
        if (combination.lot) {
            ledgerSearch.filters.push(search.createFilter({
                name: constants.RecordType.WeightLedger.Fields.LOT,
                operator: search.Operator.IS,
                values: combination.lot
            }));
        }
        return ledgerSearch;
    }

    Helper.getLedgersToUpdate = function(combination) {
        var ledgerSearch = search.load({id: constants.SavedSearch.TRUE_UP_DETAILS});
        var results = Helper.addCombinationFilters({
            search: ledgerSearch,
            combination: combination
        }).run().getRange(0, 1000).map(function (result) {
            return {
                id: result.id,
                location: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.LOCATION
                }),
                sourceLocation: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.SOURCE_LOCATION
                }),
                transactionType: result.getValue({
                    name: 'type',
                    join: constants.RecordType.WeightLedger.Fields.DOCUMENT_NUMBER
                }),
                item: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.ITEM
                }),
                lot: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.LOT
                }),
                actualWeight: parseFloat(result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.ACTUAL_WEIGHT
                })),
                explicitPricingUnitRate: result.getValue({
                    name: constants.RecordType.WeightLedger.Fields.EXPLICIT_PRICING_UNIT_RATE
                })
            }
        });

        log.debug('Helper.getLedgersToUpdate', JSON.stringify(results));

        return results;
    }

    Helper.removeEmpty = function(element) {
        return !!element; // Double negative forces a boolean when an object is present
    }

    /**
     * 
     * @param {Object} combination 
     */
    Helper.getStartingValues = function(combination) {
        var startingValues = {
            runningTotalWeightByLocation: {},
            runningTotalWeightValueByLocation: {},
            lastBlendedRateByLocation: {},
            sequenceByLocation: {}
        };

        // Run a search to give us the Ledger with the highest sequence per Location and use that as the starting values for the Location
        // The search makes use of the "When Ordered By" but it might be that isn't actually supported by SuiteScripts. If that's the case
        // then we'll need to run the search without summary and find the values ourself.
        var startingValuesSearch = search.load({id: constants.SavedSearch.TRUE_UP_STARTING_VALUES});
        Helper.addCombinationFilters({
            search: startingValuesSearch,
            combination: combination
        }).run().each(function (result) {
            var location = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.LOCATION,
                summary: search.Summary.GROUP
            });

            var weightOnHand = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.ON_HAND_WEIGHT,
                summary: search.Summary.MAX
            });

            var weightValue = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.WEIGHT_VALUE,
                summary: search.Summary.MAX
            });

            var blendedRate = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.BLENDED_RATE,
                summary: search.Summary.MAX
            });

            var sequence = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.TRUE_UP_SEQUENCE,
                summary: search.Summary.MAX
            });

            startingValues.runningTotalWeightByLocation[location] = weightOnHand;
            startingValues.runningTotalWeightValueByLocation[location] = weightValue;
            startingValues.lastBlendedRateByLocation[location] = blendedRate;
            startingValues.sequenceByLocation[location] = sequence;

            return true;
        });

        log.debug('startingValues', JSON.stringify(startingValues));

        return startingValues;
    }

    var MapReduce = {};

    MapReduce.getInputData = function() {
        // Use search to get all the Location/Item/Lot combinations where True Up values are missing

        // Determine Item/Lot combinations
        var combinations = {};

        // This search is going to come back with Locations because the True Up event is by Location
        // We're going to ignore the Location and only return unique combinations of Item/Lot
        // This will allow us to track cost movements through transfers
        var mySearch = Helper.getSearchForNeedTotals();
        return mySearch.run().getRange(0,1000).map(function (result) {
            var item = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.ITEM,
                summary: search.Summary.GROUP
            });

            var lot = result.getValue({
                name: constants.RecordType.WeightLedger.Fields.LOT,
                summary: search.Summary.GROUP
            });

            // Create a key to use in determining if we've seen this combination before, i.e., at another location
            var key = [item, lot].concat('$$$');
            if (combinations[key]) {
                return undefined;
            } else {
                combinations[key] = true;
                return {
                    item: item,
                    lot: lot
                }
            }
        }).filter(Helper.removeEmpty);
    }

    MapReduce.map = function(context) {
        try {
            var combination = JSON.parse(context.value);

            log.debug('combination', context.value);

            var startingValues = Helper.getStartingValues(combination);

            var runningTotalWeightByLocation = startingValues.runningTotalWeightByLocation; // Key/Value object where Key will be Location and Value will be Total Weight
            var runningTotalWeightValueByLocation = startingValues.runningTotalWeightValueByLocation; // Key/Value object where Key will be Location and Value will be Total Weight Value
            var lastBlendedRateByLocation = startingValues.lastBlendedRateByLocation; // Key/Value object where Key will be Location and Value will be Last Blended Rate
            var sequenceByLocation = startingValues.sequenceByLocation;

            Helper.getLedgersToUpdate(combination).forEach(function (ledger) {
                var location = ledger.location;
                var sourceLocation = ledger.sourceLocation;

                if (runningTotalWeightByLocation[location] === undefined) {
                    runningTotalWeightByLocation[location] = 0;
                    runningTotalWeightValueByLocation[location] = 0;
                    lastBlendedRateByLocation[location] = 0;
                    sequenceByLocation[location] = 0;
                }

                var values = {};
                var actualWeight = ledger.actualWeight;
                var costToUse = ledger.explicitPricingUnitRate ? parseFloat(ledger.explicitPricingUnitRate) : lastBlendedRateByLocation[location];
                if (sourceLocation && sourceLocation != location) {
                    log.debug('lastBlendedRateByLocation', JSON.stringify(lastBlendedRateByLocation));
                    // When the transaction is a transfer, we actually need to go get the Last Blended Rate from the Source Location
                    costToUse = lastBlendedRateByLocation[sourceLocation];
                    values[constants.RecordType.WeightLedger.Fields.EXPLICIT_PRICING_UNIT_RATE] = costToUse;
                    ledger.explicitPricingUnitRate = costToUse;
                }
                runningTotalWeightByLocation[location] += parseFloat(actualWeight);
                runningTotalWeightValueByLocation[location] += parseFloat(costToUse * actualWeight);
                sequenceByLocation[location] += 1;
                
                if (ledger.explicitPricingUnitRate) {
                    // The transaction was cost impacting so calculate the new blended rate
                    lastBlendedRateByLocation[location] = runningTotalWeightValueByLocation[location] / runningTotalWeightByLocation[location];
                }

                values[constants.RecordType.WeightLedger.Fields.BLENDED_RATE] = lastBlendedRateByLocation[location];
                values[constants.RecordType.WeightLedger.Fields.ON_HAND_WEIGHT] = runningTotalWeightByLocation[location];
                values[constants.RecordType.WeightLedger.Fields.WEIGHT_VALUE] = runningTotalWeightValueByLocation[location];
                values[constants.RecordType.WeightLedger.Fields.TRUE_UP_SEQUENCE] = sequenceByLocation[location];

                log.debug('map.values', JSON.stringify(values));

                record.submitFields({
                    type: constants.RecordType.WeightLedger.ID,
                    id: ledger.id,
                    values: values
                });
            });
        } catch (e) {
            log.error('e', JSON.stringify(e));
        }
    }

    return MapReduce;
});