import { UserSettingOption, UserSettings } from './settings';

/**
 * Message types used for message passing between background page and
 * other pages (popup, filtering log, content scripts)
 */

export const APP_MESSAGE_HANDLER_NAME = 'app';

export type MessageCommonProps = {
  handlerName: typeof APP_MESSAGE_HANDLER_NAME;
};

export enum MessageType {
  CREATE_EVENT_LISTENER = 'createEventListener',
  REMOVE_LISTENER = 'removeListener',
  OPEN_EXTENSION_STORE = 'openExtensionStore',
  ADD_AND_ENABLE_FILTER = 'addAndEnableFilter',
  APPLY_SETTINGS_JSON = 'applySettingsJson',
  OPEN_FILTERING_LOG = 'openFilteringLog',
  OPEN_FULLSCREEN_USER_RULES = 'openFullscreenUserRules',
  RESET_BLOCKED_ADS_COUNT = 'resetBlockedAdsCount',
  RESET_SETTINGS = 'resetSettings',
  GET_USER_RULES = 'getUserRules',
  SAVE_USER_RULES = 'saveUserRules',
  GET_ALLOWLIST_DOMAINS = 'getAllowlistDomains',
  SAVE_ALLOWLIST_DOMAINS = 'saveAllowlistDomains',
  CHECK_ANTIBANNER_FILTERS_UPDATE = 'checkAntiBannerFiltersUpdate',
  DISABLE_FILTERS_GROUP = 'disableFiltersGroup',
  DISABLE_ANTIBANNER_FILTER = 'disableAntiBannerFilter',
  LOAD_CUSTOM_FILTER_INFO = 'loadCustomFilterInfo',
  SUBSCRIBE_TO_CUSTOM_FILTER = 'subscribeToCustomFilter',
  REMOVE_ANTIBANNER_FILTER = 'removeAntiBannerFilter',
  GET_TAB_INFO_FOR_POPUP = 'getTabInfoForPopup',
  CHANGE_APPLICATION_FILTERING_DISABLED = 'changeApplicationFilteringDisabled',
  OPEN_SETTINGS_TAB = 'openSettingsTab',
  OPEN_ASSISTANT = 'openAssistant',
  OPEN_ABUSE_TAB = 'openAbuseTab',
  OPEN_SITE_REPORT_TAB = 'openSiteReportTab',
  RESET_CUSTOM_RULES_FOR_PAGE = 'resetCustomRulesForPage',
  REMOVE_ALLOWLIST_DOMAIN = 'removeAllowlistDomainPopup',
  ADD_ALLOWLIST_DOMAIN_POPUP = 'addAllowlistDomainPopup',
  GET_STATISTICS_DATA = 'getStatisticsData',
  ON_OPEN_FILTERING_LOG_PAGE = 'onOpenFilteringLogPage',
  GET_FILTERING_LOG_DATA = 'getFilteringLogData',
  INITIALIZE_FRAME_SCRIPT = 'initializeFrameScript',
  ON_CLOSE_FILTERING_LOG_PAGE = 'onCloseFilteringLogPage',
  GET_FILTERING_INFO_BY_TAB_ID = 'getFilteringInfoByTabId',
  SYNCHRONIZE_OPEN_TABS = 'synchronizeOpenTabs',
  CLEAR_EVENTS_BY_TAB_ID = 'clearEventsByTabId',
  REFRESH_PAGE = 'refreshPage',
  OPEN_TAB = 'openTab',
  ADD_USER_RULE = 'addUserRule',
  UN_ALLOWLIST_FRAME = 'unAllowlistFrame',
  REMOVE_USER_RULE = 'removeUserRule',
  GET_TAB_FRAME_INFO_BY_ID = 'getTabFrameInfoById',
  ENABLE_FILTERS_GROUP = 'enableFiltersGroup',
  NOTIFY_LISTENERS = 'notifyListeners',
  ADD_LONG_LIVED_CONNECTION = 'addLongLivedConnection',
  GET_OPTIONS_DATA = 'getOptionsData',
  CHANGE_USER_SETTING = 'changeUserSetting',
  CHECK_REQUEST_FILTER_READY = 'checkRequestFilterReady',
  OPEN_THANKYOU_PAGE = 'openThankYouPage',
  OPEN_SAFEBROWSING_TRUSTED = 'openSafebrowsingTrusted',
  GET_SELECTORS_AND_SCRIPTS = 'getSelectorsAndScripts',
  CHECK_PAGE_SCRIPT_WRAPPER_REQUEST = 'checkPageScriptWrapperRequest',
  PROCESS_SHOULD_COLLAPSE = 'processShouldCollapse',
  PROCESS_SHOULD_COLLAPSE_MANY = 'processShouldCollapseMany',
  ADD_FILTERING_SUBSCRIPTION = 'addFilterSubscription',
  SET_NOTIFICATION_VIEWED = 'setNotificationViewed',
  SAVE_CSS_HITS_STATS = 'saveCssHitStats',
  GET_COOKIE_RULES = 'getCookieRules',
  SAVE_COOKIE_LOG_EVENT = 'saveCookieRuleEvent',
  LOAD_SETTINGS_JSON = 'loadSettingsJson',
  ADD_URL_TO_TRUSTED = 'addUrlToTrusted',
  SET_PRESERVE_LOG_STATE = 'setPreserveLogState',
  GET_USER_RULES_EDITOR_DATA = 'getUserRulesEditorData',
  GET_EDITOR_STORAGE_CONTENT = 'getEditorStorageContent',
  SET_EDITOR_STORAGE_CONTENT = 'setEditorStorageContent',
  CONVERT_RULES_TEXT = 'convertRulesText',
}

export type GetTabInfoForPopupMessage = {
  type: MessageType.GET_TAB_INFO_FOR_POPUP;
  data: {
    tabId: number;
  };
};

export type ChangeApplicationFilteringDisabledMessage = {
  type: MessageType.CHANGE_APPLICATION_FILTERING_DISABLED;
  data: {
    state: boolean;
  };
};

export type OpenSettingsTabMessage = {
  type: MessageType.OPEN_SETTINGS_TAB;
};

export type OpenAssistantMessage = {
  type: MessageType.OPEN_ASSISTANT;
};

export type OpenFilteringLogMessage = {
  type: MessageType.OPEN_FILTERING_LOG;
};

export type OpenAbuseTabMessage = {
  type: MessageType.OPEN_ABUSE_TAB;
  data: {
    url: string;
  };
};

export type OpenSiteReportTabMessage = {
  type: MessageType.OPEN_SITE_REPORT_TAB;
  data: {
    url: string;
  };
};

export type GetOptionsDataMessage = {
  type: MessageType.GET_OPTIONS_DATA;
};

export type ChangeUserSettingMessage<T extends UserSettingOption = UserSettingOption> = {
  type: MessageType.CHANGE_USER_SETTING;
  data: {
    key: T,
    value: UserSettings[T]
  }
};

export type ResetSettingsMessage = {
  type: MessageType.RESET_SETTINGS
};

export type Message = (
  | GetTabInfoForPopupMessage
  | ChangeApplicationFilteringDisabledMessage
  | OpenSettingsTabMessage
  | OpenAssistantMessage
  | OpenFilteringLogMessage
  | OpenAbuseTabMessage
  | OpenSiteReportTabMessage
  | GetOptionsDataMessage
  | ChangeUserSettingMessage
  | ResetSettingsMessage
) &
  MessageCommonProps;

export type ExtractedMessage<P> = Extract<Message, { type: P }>;
