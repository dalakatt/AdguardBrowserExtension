export * from './messages';
/**
 * Filter ids used in the code on the background page and filtering log page
 */
export enum AntiBannerFiltersId {
    STEALTH_MODE_FILTER_ID = -1,
    USER_FILTER_ID = 0,
    RUSSIAN_FILTER_ID = 1,
    ENGLISH_FILTER_ID = 2,
    TRACKING_FILTER_ID = 3,
    SOCIAL_FILTER_ID = 4,
    SEARCH_AND_SELF_PROMO_FILTER_ID = 10,
    URL_TRACKING_FILTER_ID = 17,
    ALLOWLIST_FILTER_ID = 100,
    EASY_PRIVACY = 118,
    FANBOY_ANNOYANCES = 122,
    FANBOY_SOCIAL = 123,
    FANBOY_ENHANCED = 215,
    MOBILE_ADS_FILTER_ID = 11,
}

/**
 * Group ids used in the code on the multiple entry points
 */
export const ANTIBANNER_GROUPS_ID = {
    // custom filters group identifier
    CUSTOM_FILTERS_GROUP_ID: 0,
    PRIVACY_FILTERS_GROUP_ID: 2,
    // other filters group identifier
    OTHER_FILTERS_GROUP_ID: 6,
    // language-specific group identifier
    LANGUAGE_FILTERS_GROUP_ID: 7,
} as const;

/**
 * Stealth action bitwise masks used o the background page and on the filtering log page
 */
export const STEALTH_ACTIONS = {
    HIDE_REFERRER: 1 << 0,
    HIDE_SEARCH_QUERIES: 1 << 1,
    BLOCK_CHROME_CLIENT_DATA: 1 << 2,
    SEND_DO_NOT_TRACK: 1 << 3,
    STRIPPED_TRACKING_URL: 1 << 4,
    FIRST_PARTY_COOKIES: 1 << 5,
    THIRD_PARTY_COOKIES: 1 << 6,
} as const;

export const NOTIFIER_TYPES = {
    ADD_RULES: 'event.add.rules',
    REMOVE_RULE: 'event.remove.rule',
    UPDATE_FILTER_RULES: 'event.update.filter.rules',
    FILTER_GROUP_ENABLE_DISABLE: 'filter.group.enable.disable', // enabled or disabled filter group
    FILTER_ENABLE_DISABLE: 'event.filter.enable.disable', // Enabled or disabled
    FILTER_ADD_REMOVE: 'event.filter.add.remove', // Added or removed
    ADS_BLOCKED: 'event.ads.blocked',
    START_DOWNLOAD_FILTER: 'event.start.download.filter',
    SUCCESS_DOWNLOAD_FILTER: 'event.success.download.filter',
    ERROR_DOWNLOAD_FILTER: 'event.error.download.filter',
    ENABLE_FILTER_SHOW_POPUP: 'event.enable.filter.show.popup',
    LOG_EVENT: 'event.log.track',
    UPDATE_TAB_BUTTON_STATE: 'event.update.tab.button.state',
    REQUEST_FILTER_UPDATED: 'event.request.filter.updated',
    APPLICATION_INITIALIZED: 'event.application.initialized',
    APPLICATION_UPDATED: 'event.application.updated',
    CHANGE_PREFS: 'event.change.prefs',
    UPDATE_FILTERS_SHOW_POPUP: 'event.update.filters.show.popup',
    USER_FILTER_UPDATED: 'event.user.filter.updated',
    UPDATE_ALLOWLIST_FILTER_RULES: 'event.update.allowlist.filter.rules',
    SETTING_UPDATED: 'event.update.setting.value',
    FILTERS_UPDATE_CHECK_READY: 'event.update.filters.check',
    // Log events
    TAB_ADDED: 'log.tab.added',
    TAB_CLOSE: 'log.tab.close',
    TAB_UPDATE: 'log.tab.update',
    TAB_RESET: 'log.tab.reset',
    LOG_EVENT_ADDED: 'log.event.added',
    // Sync events
    SETTINGS_UPDATED: 'event.sync.finished',
    // Fullscreen user rules events
    FULLSCREEN_USER_RULES_EDITOR_UPDATED: 'event.user.rules.editor.updated',
} as const;

export const FULLSCREEN_USER_RULES_EDITOR = 'fullscreen_user_rules_editor' as const;
export const FILTERING_LOG = 'filtering-log' as const;

export const NAVIGATION_TAGS = {
    REGULAR: 'regular',
    PARTY: 'party',
} as const;

/**
 * Trusted tag for custom filters
 */
export const TRUSTED_TAG = 'trusted' as const;

/**
 * Custom filters group display number
 *
 * @type {number}
 */
export const CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER = 99 as const;

/**
 * Custom filters identifiers starts from this number
 *
 * @type {number}
 */
export const CUSTOM_FILTERS_START_ID = 1000 as const;

// Unnecessary characters that will be replaced
export const WASTE_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

// Custom scrollbar width
export const SCROLLBAR_WIDTH = 12 as const;
