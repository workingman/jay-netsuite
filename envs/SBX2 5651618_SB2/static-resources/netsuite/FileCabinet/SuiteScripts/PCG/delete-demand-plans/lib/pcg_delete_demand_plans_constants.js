/**
 * Delete Demand Plans Constants
 */
define(['N/record',
        '../../suitelet-form-builder/suitelet_form_builder_constants'],
function(record,
         SUITELET_FORM_BUILDER_CONSTANTS) {

    /**
     * Delete Demand Plans Suitelet Form Definition For Custom Suitelet Form Builder
     * @type {Object}
     */
    const DELETE_DEMAND_PLANS_FORM = {
        TITLE: 'Delete Demand Plans',
        HIDE_NAVIGATION_BAR: false,
        CLIENT_SCRIPT_MODULE_PATH: '../delete-demand-plans/client-scripts/pcg_delete_demand_plans_sl_cl.js',
        ADD_DEFAULT_SUBMIT_BUTTON: {value: true, label: 'Delete Selected Records'},
        BUTTON: {
            APPLY_FILTERS: {id: 'custpage_demand_plan_records_button_apply_filters', label: 'Apply Filters', functionName: 'applyFilters()'},
            RESET_FILTERS: {id: 'custpage_demand_plan_records_button_reset_filters', label: 'Reset Filters', functionName: 'resetFilters()'}
        },
        PARAMETER: {
                      IS_SALEABLE: {id: 'isSaleable'},
            ITEM_NAME_STARTS_WITH: {id: 'itemNameStartsWith'},
                        ITEM_TYPE: {id: 'itemType'},
                       ITEM_USAGE: {id: 'itemUsage'},
                         LOCATION: {id: 'location'},
                       SUBSIDIARY: {id: 'subsidiary'}
        },
        HEADER: {
            FIELD_GROUP: {
                FILTERS: {id: 'custpage_demand_plan_records_filters', label: 'Demand Plan Record Filters'}
            },
            FIELD: {
                           SUBSIDIARY: {id: 'custpage_demand_plan_records_filters_subsidiary',            label: 'Subsidiary',            type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.SELECT,   source: 'subsidiary',                    displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.NORMAL, container: 'custpage_demand_plan_records_filters'},
                             LOCATION: {id: 'custpage_demand_plan_records_filters_location',              label: 'Location',              type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.SELECT,   source: 'location',                      displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.NORMAL, container: 'custpage_demand_plan_records_filters'},
                          IS_SALEABLE: {id: 'custpage_demand_plan_records_filters_is_saleable',           label: 'Is Saleable',           type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.CHECKBOX, source: null,                            displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN, container: 'custpage_demand_plan_records_filters'},
                ITEM_NAME_STARTS_WITH: {id: 'custpage_demand_plan_records_filters_item_name_starts_with', label: 'Item Name Starts With', type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null,                            displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.NORMAL, container: 'custpage_demand_plan_records_filters'},
                            ITEM_TYPE: {id: 'custpage_demand_plan_records_filters_item_type',             label: 'Item Type',             type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.SELECT,   source: null,                            displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN, container: 'custpage_demand_plan_records_filters'},
                           ITEM_USAGE: {id: 'custpage_demand_plan_records_filters_item_usage',            label: 'Item Usage',            type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.SELECT,   source: 'customlist_pcg_hfa_item_usage', displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN, container: 'custpage_demand_plan_records_filters'}
            }
        },
        SUBLIST: {
            DEMAND_PLAN: {
                ID: 'custpage_demand_plan_records_sublist',
                TYPE: SUITELET_FORM_BUILDER_CONSTANTS.SUBLIST_TYPE.LIST,
                LABEL: 'Demand Plans',
                TAB: null,
                FIELD: {
                                SELECT: {id: 'custpage_demand_plan_records_sublist_is_selected',      label: 'Select',         type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.CHECKBOX, source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.NORMAL},
                           DEMAND_PLAN: {id: 'custpage_demand_plan_records_sublist_demand_plan',      label: 'Demand Plan',    type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXTAREA, source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE},
                        DEMAND_PLAN_ID: {id: 'custpage_demand_plan_records_sublist_demand_plan_id',   label: 'Demand Plan ID', type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN},
                            SUBSIDIARY: {id: 'custpage_demand_plan_records_sublist_subsidiary',       label: 'Subsidiary',     type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE},
                              LOCATION: {id: 'custpage_demand_plan_records_sublist_location',         label: 'Location',       type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE},
                                  ITEM: {id: 'custpage_demand_plan_records_sublist_item',             label: 'Item',           type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXTAREA, source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE},
                             ITEM_TYPE: {id: 'custpage_demand_plan_records_sublist_item_type',        label: 'Item Type',      type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE},
                           IS_SALEABLE: {id: 'custpage_demand_plan_records_sublist_item_is_saleable', label: 'Saleable',       type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.CHECKBOX, source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN},
                            ITEM_USAGE: {id: 'custpage_demand_plan_records_sublist_item_usage',       label: 'HFA Item Usage', type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.HIDDEN},
                    LAST_MODIFIED_DATE: {id: 'custpage_demand_plan_records_sublist_last_modified',    label: 'Last Modified',  type: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_TYPE.TEXT,     source: null, displayType: SUITELET_FORM_BUILDER_CONSTANTS.FIELD_DISPLAY_TYPE.INLINE}
                }
            }
        }
    };

    /**
     * Delete Demand Plans Map/Reduce Script Information
     * @type {Object}
     */
    const DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT = {
        SCRIPT_ID: 'customscript_pcg_delete_demand_plans_mr',
        DEPLOYMENT_ID: 'customdeploy_pcg_delete_demand_plans_mr',
        PARAMETER: {
            SAVED_SEARCH_ID: 'custscript_drmr_saved_search_id'
        }
    };

    /**
     * Delete Demands Plans Saved Search Creation Information
     * @type {Object}
     */
    const DELETE_DEMAND_PLANS_SEARCH = {
        TITLE:  'Delete Item Demand Plans - ',
        ID: 'customsearch_didp_'
    };

    /**
     * Delete Demands Plans Suitelet Information
     * @type {Object}
     */
    const DELETE_DEMAND_PLANS_SUITELET = {
        SCRIPT_ID: 'customscript_pcg_delete_demand_plans_sl',
        DEPLOYMENT_ID: 'customdeploy_pcg_delete_demand_plans_sl',
    };

    /**
     * Item Record NetSuite URL for internal URL redirect
     * @type {string}
     */
    const ITEM_RECORD_NETSUITE_URL = '/app/common/item/item.nl?id=';

    /**
     * User-facing Messages Information
     * @type {Object}
     */
    const MESSAGE = {
        APPLYING_FILTERS: {
            TITLE: 'Applying Filters',
            MESSAGE: 'You will be redirected to the filtered results momentarily.',
        },
        CONFIRM_DELETE: 'Are you sure you want to delete the selected Demand Plans?\nThis action cannot be undone.',
        DELETE_STARTED: {
            TITLE: 'Starting Record Deletion Process',
            MESSAGE: 'You will be redirected to the Map/Reduce Script that is handling the deletion momentarily.'
        },
        NO_DEMAND_PLAN_SELECTED: {
            TITLE: 'No Demand Plan Selected',
            MESSAGE: 'At least one (1) Demand Plan must be selected in order to delete Demand Plans.'
        }
    };

    /**
     * NetSuite Record Structure
     * @type {Object}
     */
    const RECORD = {
        DEMAND_PLAN: {
            FIELD: {
                INTERNAL_ID: {ID: 'internalid'}
            }
        },
        ITEM_DEMAND_PLAN: {
            FIELD: {
                       INTERNAL_ID: {ID: 'internalid'},
                              ITEM: {ID: 'item'},
                LAST_MODIFIED_DATE: {ID: 'lastmodifieddate'},
                          LOCATION: {ID: 'location'},
                        SUBSIDIARY: {ID: 'subsidiary'}
            }
        },
        ITEM: {
            FIELD: {
                   DESCRIPTION: {ID: 'description'},
                HFA_USAGE_TYPE: {ID: 'custitem_pcg_item_usage_hfa'},
                   IS_INACTIVE: {ID: 'isinactive'},
                   IS_SALEABLE: {ID: 'custitem_pcg_item_saleable'},
                       ITEM_ID: {ID: 'itemid'},
                     ITEM_TYPE: {ID: 'type'}
            }
        }
    };

    /**
     * NetSuite Task Links for redirect
     * @type {Object}
     */
    const TASK_LINK = {
        DASHBOARD: 'CARD_-29'
    };

    return {
        DELETE_DEMAND_PLANS_FORM: DELETE_DEMAND_PLANS_FORM,
        DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT: DELETE_DEMAND_PLANS_MAP_REDUCE_SCRIPT,
        DELETE_DEMAND_PLANS_SEARCH: DELETE_DEMAND_PLANS_SEARCH,
        DELETE_DEMAND_PLANS_SUITELET: DELETE_DEMAND_PLANS_SUITELET,
        ITEM_RECORD_NETSUITE_URL: ITEM_RECORD_NETSUITE_URL,
        MESSAGE: MESSAGE,
        RECORD: RECORD,
        TASK_LINK: TASK_LINK
    };
});

