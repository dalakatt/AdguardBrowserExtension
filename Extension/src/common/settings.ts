import { z } from 'zod';

export const ADGUARD_USER_SETTINGS_KEY = 'adguard-user-settings';

export enum UserSettingOption {
    DISABLE_DETECT_FILTERS = 'detect-filters-disabled',
    DISABLE_SHOW_PAGE_STATS = 'disable-show-page-statistic',

    /* flag used to show link to comparison of desktop and browser adblocker versions */
    DISABLE_SHOW_ADGUARD_PROMO_INFO = 'show-info-about-adguard-disabled',

    DISABLE_SAFEBROWSING = 'safebrowsing-disabled',
    DISABLE_FILTERING = 'adguard-disabled',
    DISABLE_COLLECT_HITS = 'hits-count-disabled',
    DISABLE_SHOW_CONTEXT_MENU = 'context-menu-disabled',
    USE_OPTIMIZED_FILTERS = 'use-optimized-filters',
    DEFAULT_ALLOWLIST_MODE = 'default-whitelist-mode',
    ALLOWLIST_ENABLED = 'allowlist-enabled',
    DISABLE_SHOW_APP_UPDATED_NOTIFICATION = 'show-app-updated-disabled',
    FILTERS_UPDATE_PERIOD = 'filters-update-period',
    APPEARANCE_THEME = 'appearance-theme',

    /* User filter */
    USER_FILTER_ENABLED = 'user-filter-enabled',

    /* STEALTH MODE */
    DISABLE_STEALTH_MODE = 'stealth-disable-stealth-mode',
    HIDE_REFERRER = 'stealth-hide-referrer',
    HIDE_SEARCH_QUERIES = 'stealth-hide-search-queries',
    SEND_DO_NOT_TRACK = 'stealth-send-do-not-track',
    BLOCK_CHROME_CLIENT_DATA = 'stealth-remove-x-client',
    BLOCK_WEBRTC = 'stealth-block-webrtc',
    SELF_DESTRUCT_THIRD_PARTY_COOKIES = 'stealth-block-third-party-cookies',
    SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME = 'stealth-block-third-party-cookies-time',
    SELF_DESTRUCT_FIRST_PARTY_COOKIES = 'stealth-block-first-party-cookies',
    SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME = 'stealth-block-first-party-cookies-time',

    /* UI misc */
    HIDE_RATE_BLOCK = 'hide-rate-block',
    USER_RULES_EDITOR_WRAP = 'user-rules-editor-wrap',
}

export const enum AppearanceTheme {
    SYSTEM = 'system',
    DARK = 'dark',
    LIGHT = 'light',
}

export const DEFAULT_FILTERS_UPDATE_PERIOD = -1;

export const DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN = 4320;

export const DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN = 2880;

export type UserSettings = {
    [UserSettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO]: boolean,
    [UserSettingOption.DISABLE_SAFEBROWSING]: boolean,
    [UserSettingOption.DISABLE_COLLECT_HITS]: boolean,
    [UserSettingOption.DEFAULT_ALLOWLIST_MODE]: boolean,
    [UserSettingOption.ALLOWLIST_ENABLED]: boolean,
    [UserSettingOption.USE_OPTIMIZED_FILTERS]: boolean,
    [UserSettingOption.DISABLE_DETECT_FILTERS]: boolean,
    [UserSettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION]: boolean,
    [UserSettingOption.FILTERS_UPDATE_PERIOD]: number,
    [UserSettingOption.DISABLE_STEALTH_MODE]: boolean,
    [UserSettingOption.HIDE_REFERRER]: boolean,
    [UserSettingOption.HIDE_SEARCH_QUERIES]: boolean,
    [UserSettingOption.SEND_DO_NOT_TRACK]: boolean,
    [UserSettingOption.BLOCK_CHROME_CLIENT_DATA]: boolean,
    [UserSettingOption.BLOCK_WEBRTC]: boolean,
    [UserSettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES]: boolean,
    [UserSettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME]:number,
    [UserSettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES]: boolean,
    [UserSettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME]:number,
    [UserSettingOption.APPEARANCE_THEME]: AppearanceTheme,
    [UserSettingOption.USER_FILTER_ENABLED]: boolean,
    [UserSettingOption.HIDE_RATE_BLOCK]: boolean,
    [UserSettingOption.USER_RULES_EDITOR_WRAP]: boolean,
    [UserSettingOption.DISABLE_FILTERING]: boolean,
    [UserSettingOption.DISABLE_SHOW_PAGE_STATS]: boolean,
    [UserSettingOption.DISABLE_SHOW_CONTEXT_MENU]: boolean,
};

// TODO: use setting import validation in settings service
// when filters service will be implemented
export const settingsValidator = z.object({
    'protocol-version': z.string(),
    'general-settings': z.object({
        'app-language': z.string().optional(),
        'allow-acceptable-ads': z.boolean(),
        'show-blocked-ads-count': z.boolean(),
        'autodetect-filters': z.boolean(),
        'safebrowsing-enabled': z.boolean(),
        'filters-update-period': z.any(),
        'appearance-theme': z.string().optional(),
    }),
    'extension-specific-settings': z.object({
        'use-optimized-filters': z.boolean(),
        'collect-hits-count': z.boolean(),
        'show-context-menu': z.boolean(),
        'show-info-about-adguard': z.boolean(),
        'show-app-updated-info': z.boolean(),
        'hide-rate-adguard': z.boolean(),
        'user-rules-editor-wrap': z.boolean(),
    }),
    filters: z.object({
        'enabled-groups': z.array(z.any()),
        'enabled-filters': z.array(z.any()),
        'custom-filters': z.array(z.any()),
        'user-filter': z.object({
            rules: z.string(),
            'disabled-rules': z.string(),
            enabled: z.boolean().optional(),
        }),
        whitelist: z.object({
            inverted: z.boolean(),
            domains: z.array(z.string()),
            'inverted-domains': z.array(z.string()),
            enabled: z.boolean().optional(),
        }),
    }),
    stealth: z
        .object({
            stealth_disable_stealth_mode: z.boolean(),
            'stealth-hide-referrer': z.boolean(),
            'stealth-hide-search-queries': z.boolean(),
            'stealth-send-do-not-track': z.boolean(),
            'stealth-block-webrtc': z.boolean(),
            'stealth-remove-x-client': z.boolean(),
            'stealth-block-third-party-cookies': z.boolean(),
            'stealth-block-third-party-cookies-time': z.number().optional(),
            'stealth-block-first-party-cookies': z.boolean(),
            'stealth-block-first-party-cookies-time': z.number().optional(),
            'block-known-trackers': z.boolean().optional(),
            'strip-tracking-parameters': z.boolean(),
        })
        .optional(),
});

export type Settings = z.infer<typeof settingsValidator>;
