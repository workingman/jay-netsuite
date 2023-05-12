/**
 * Constants library for N/ui/serverWidget ENUM values.
 * When using the suitelets form builder in a mixed constants environment (server-side and client-side),
 * then these constants should be used rather than the native N/ui/serverWidget ENUM values so that including
 * the N/ui/serverWidget library ONLY to use the constants won't cause a script error due to being only server-side.
 * If server-side, feel free to use N/ui/serverWidget in full capacity.
 */
define([], function() {

    const ASSISTANT_SUBMIT_ACTION = {
        NEXT: 'NEXT',
        BACK: 'BACK',
        CANCEL: 'CANCEL',
        FINISH: 'FINISH',
        JUMP: 'JUMP'
    };

    const FIELD_BREAK_TYPE = {
        NONE: 'NONE',
        STARTCOL: 'STARTCOL',
        STARTROW: 'STARTROW'
    };

    const FIELD_DISPLAY_TYPE = {
        DISABLED: 'DISABLED',
        ENTRY: 'ENTRY',
        HIDDEN: 'HIDDEN',
        INLINE: 'INLINE',
        NO_DISPLAY: 'NODISPLAY',
        NORMAL: 'NORMAL',
        READ_ONLY: 'READONLY'
    };

    const FIELD_LAYOUT_TYPE = {
        NORMAL: 'NORMAL',
        OUTSIDE: 'OUTSIDE',
        OUTSIDEBELOW: 'OUTSIDEBELOW',
        OUTSIDEABOVE: 'OUTSIDEABOVE',
        STARTROW: 'STARTROW',
        MIDROW: 'MIDROW',
        ENDROW: 'ENDROW'
    };

    const FIELD_TYPE = {
        CHECKBOX: 'CHECKBOX',
        CURRENCY: 'CURRENCY',
        DATE: 'DATE',
        DATETIME: 'DATETIME',
        DATETIMETZ: 'DATETIMETZ',
        EMAIL: 'EMAIL',
        FILE: 'FILE',
        FLOAT: 'FLOAT',
        HELP: 'HELP',
        IMAGE: 'IMAGE',
        INLINEHTML: 'INLINEHTML',
        INTEGER: 'INTEGER',
        LABEL: 'LABEL',
        LONGTEXT: 'LONGTEXT',
        MULTISELECT: 'MULTISELECT',
        PASSWORD: 'PASSWORD',
        PERCENT: 'PERCENT',
        PHONE: 'PHONE',
        RADIO: 'RADIO',
        RICHTEXT: 'RICHTEXT',
        SELECT: 'SELECT',
        TEXTAREA: 'TEXTAREA',
        TEXT: 'TEXT',
        TIMEOFDAY: 'TIMEOFDAY',
        URL: 'URL'
    };

    const LAYOUT_JUSTIFICATION = {
        CENTER: 'CENTER',
        LEFT: 'LEFT',
        RIGHT: 'RIGHT'
    };

    const LIST_STYLE = {
        GRID: 'GRID',
        REPORT: 'REPORT',
        PLAIN: 'PLAIN',
        NORMAL: 'NORMAL'
    };

    const PAGE_LINK_TYPE = {
        BREADCRUMB: 'BREADCRUMB',
        CROSSLINK: 'CROSSLINK'
    };

    const SUBLIST_DISPLAY_TYPE = {
        NORMAL: 'NORMAL',
        HIDDEN: 'HIDDEN'
    };

    const SUBLIST_TYPE = {
        EDITOR: 'EDITOR',
        INLINEEDITOR: 'INLINEEDITOR',
        LIST: 'LIST',
        STATICLIST: 'STATICLIST'
    };

    const SHOULD_SKIP_ADDING_DURING_FORM_CREATION = 'shouldSkipAddingDuringFormCreation';

    return {
        ASSISTANT_SUBMIT_ACTION: ASSISTANT_SUBMIT_ACTION,
        FIELD_BREAK_TYPE: FIELD_BREAK_TYPE,
        FIELD_DISPLAY_TYPE: FIELD_DISPLAY_TYPE,
        FIELD_LAYOUT_TYPE: FIELD_LAYOUT_TYPE,
        FIELD_TYPE: FIELD_TYPE,
        LAYOUT_JUSTIFICATION: LAYOUT_JUSTIFICATION,
        LIST_STYLE: LIST_STYLE,
        PAGE_LINK_TYPE: PAGE_LINK_TYPE,
        SUBLIST_DISPLAY_TYPE: SUBLIST_DISPLAY_TYPE,
        SUBLIST_TYPE: SUBLIST_TYPE,
        SHOULD_SKIP_ADDING_DURING_FORM_CREATION: SHOULD_SKIP_ADDING_DURING_FORM_CREATION
    };
});
