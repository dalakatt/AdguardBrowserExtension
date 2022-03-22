/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */

import * as TSUrlFilter from '@adguard/tsurlfilter';

import { settingsProvider } from './settings/settings-provider';
import { backgroundPage } from './extension-api/background-page';
import { settings } from './settings/user-settings';
import { listeners } from './notifier';
import { userrules } from './filter/userrules';
import { notifications } from './utils/notifications';
import { localStorage } from './storage';
import { tabsApi } from './tabs/tabs-api';
import { uiService } from './ui-service';
import { browserUtils } from './utils/browser-utils';
import { frames } from './tabs/frames';
import { safebrowsing } from './filter/services/safebrowsing';
import { utils } from './utils/common';
import { RequestTypes } from './utils/request-types';
import { application } from './application';
import { categories } from './filter/filters/filters-categories';
import { webRequestService } from './filter/request-blocking';
import { filteringLog } from './filter/filtering-log';
import { pageStats } from './filter/page-stats';
import { subscriptions } from './filter/filters/subscription';
import { filteringApi } from './filter/filtering-api';
import { stealthService } from './filter/services/stealth-service';
import { prefs } from './prefs';
import { allowlist } from './filter/allowlist';
import { documentFilterService } from './filter/services/document-filter';
import { antiBannerService } from './filter/antibanner';
import { FILTERING_LOG, FULLSCREEN_USER_RULES_EDITOR, MessageType } from '../common/constants';
import { getCookieRulesDataForContentScript } from './filter/services/cookie-service';
import { log } from '../common/log';
import { fullscreenUserRulesEditor } from './fullscreen-user-rules-editor';
import { editorStorage } from './utils/editor-storage';

const onPortConnection = (port) => {
    switch (true) {
        case port.name.startsWith(FILTERING_LOG): {
            filteringLog.onOpenFilteringLogPage();
            break;
        }
        case port.name.startsWith(FULLSCREEN_USER_RULES_EDITOR): {
            fullscreenUserRulesEditor.onOpenPage();
            break;
        }
        default: {
            throw new Error(`There is no such pages ${port.name}`);
        }
    }
};

const onPortDisconnection = (port) => {
    switch (true) {
        case port.name.startsWith(FILTERING_LOG): {
            filteringLog.onCloseFilteringLogPage();
            break;
        }
        case port.name.startsWith(FULLSCREEN_USER_RULES_EDITOR): {
            fullscreenUserRulesEditor.onClosePage();
            break;
        }
        default: {
            throw new Error(`There is no such pages ${port.name}`);
        }
    }
};

/**
 * This handler used to subscribe for notifications from popup page
 * https://developer.chrome.com/extensions/messaging#connect
 * We can't use simple one-time connections, because they can intercept each other
 * Causing issues like AG-2074
 */
const longLivedMessageHandler = (port) => {
    let listenerId;

    log.info(`Port: "${port.name}" connected`);

    onPortConnection(port);

    port.onMessage.addListener((message) => {
        const { type, data } = message;
        if (type === MessageType.ADD_LONG_LIVED_CONNECTION) {
            const { events } = data;
            listenerId = listeners.addSpecifiedListener(events, async (...data) => {
                const type = MessageType.NOTIFY_LISTENERS;
                try {
                    port.postMessage({ type, data });
                } catch (e) {
                    log.error(e.message);
                }
            });
        }
    });

    port.onDisconnect.addListener(() => {
        onPortDisconnection(port);
        listeners.removeListener(listenerId);
        log.info(`Port: "${port.name}" disconnected`);
    });
};

const createMessageHandler = () => {
    /**
     * Contains event listeners from content pages
     */
    const eventListeners = Object.create(null);

    /**
     * Adds event listener from content page
     * @param events
     * @param sender
     */
    function processAddEventListener(events, sender) {
        const listenerId = listeners.addSpecifiedListener(events, (...args) => {
            const sender = eventListeners[listenerId];
            if (sender) {
                tabsApi.sendMessage(sender.tab.tabId, {
                    type: MessageType.NOTIFY_LISTENERS,
                    data: args,
                });
            }
        });
        eventListeners[listenerId] = sender;
        return { listenerId };
    }

    /**
     * Constructs objects that uses on extension pages, like: options.html, thankyou.html etc
     */
    function processInitializeFrameScriptRequest() {
        const AntiBannerFiltersId = utils.filters.ids;

        const enabledFilters = {};
        Object.values(AntiBannerFiltersId).forEach((filterId) => {
            const enabled = application.isFilterEnabled(filterId);
            if (enabled) {
                enabledFilters[filterId] = true;
            }
        });

        return {
            userSettings: settings.getAllSettings(),
            enabledFilters,
            filtersMetadata: subscriptions.getFilters(),
            requestFilterInfo: filteringApi.getRequestFilterInfo(),
            environmentOptions: {
                isMacOs: browserUtils.isMacOs(),
                canBlockWebRTC: stealthService.canBlockWebRTC(),
                isChrome: browserUtils.isChromeBrowser(),
                Prefs: {
                    locale: backgroundPage.app.getLocale(),
                    mobile: prefs.mobile || false,
                },
                appVersion: backgroundPage.app.getVersion(),
            },
            constants: {
                AntiBannerFiltersId: utils.filters.ids,
                EventNotifierTypes: listeners.events,
            },
        };
    }

    /**
     * Saves css hits from content-script.
     * Message includes stats field. [{filterId: 1, ruleText: 'rule1'}, {filterId: 2, ruleText: 'rule2'}...]
     * @param tab
     * @param stats
     */
    function processSaveCssHitStats(tab, stats) {
        if (!webRequestService.isCollectingCosmeticRulesHits(tab)) {
            return;
        }
        const frameUrl = frames.getMainFrameUrl(tab);
        for (let i = 0; i < stats.length; i += 1) {
            const stat = stats[i];
            const rule = new TSUrlFilter.CosmeticRule(stat.ruleText, stat.filterId);
            webRequestService.recordRuleHit(tab, rule, frameUrl);
            filteringLog.addCosmeticEvent({
                tab,
                element: stat.element,
                frameUrl: tab.url,
                requestType: RequestTypes.DOCUMENT,
                requestRule: rule,
                timestamp: Date.now(),
            });
        }
    }

    const processGetOptionsData = () => {
        return {
            settings: settings.getAllSettings(),
            appVersion: backgroundPage.app.getVersion(),
            filtersMetadata: categories.getFiltersMetadata(),
            filtersInfo: antiBannerService.getRequestFilterInfo(),
            environmentOptions: {
                isChrome: browserUtils.isChromeBrowser(),
            },
            constants: {
                AntiBannerFiltersId: utils.filters.ids,
            },
            fullscreenUserRulesEditorIsOpen: fullscreenUserRulesEditor.isOpen(),
        };
    };

    /**
     * Main function for processing messages from content-scripts
     *
     * @param message
     * @param sender
     * @returns {*}
     */
    const handleMessage = async (message, sender) => {
        const { data, type } = message;

        switch (type) {
            case MessageType.GET_OPTIONS_DATA: {
                return processGetOptionsData();
            }
            case MessageType.UN_ALLOWLIST_FRAME: {
                const { frameInfo } = data;
                userrules.unAllowlistFrame(frameInfo);
                break;
            }
            case MessageType.CREATE_EVENT_LISTENER: {
                const { events } = data;
                return processAddEventListener(events, sender);
            }
            case MessageType.REMOVE_LISTENER: {
                const { listenerId } = data;
                listeners.removeListener(listenerId);
                delete eventListeners[listenerId];
                break;
            }
            case MessageType.INITIALIZE_FRAME_SCRIPT:
                return processInitializeFrameScriptRequest();
            case MessageType.CHANGE_USER_SETTING:
                settings.setProperty(message.key, message.value);
                break;
            case MessageType.CHECK_REQUEST_FILTER_READY:
                return { ready: filteringApi.isReady() };
            case MessageType.ADD_AND_ENABLE_FILTER: {
                const { filterId } = data;
                return application.addAndEnableFilters([filterId], { forceRemote: true });
            }
            case MessageType.DISABLE_ANTIBANNER_FILTER: {
                const { filterId, remove } = data;
                if (remove) {
                    application.uninstallFilters([filterId]);
                } else {
                    application.disableFilters([filterId]);
                }
                break;
            }
            case MessageType.REMOVE_ANTIBANNER_FILTER: {
                const { filterId } = data;
                application.removeFilter(filterId);
                break;
            }
            case MessageType.ENABLE_FILTERS_GROUP: {
                const { groupId } = data;
                await categories.enableFiltersGroup(groupId);
                break;
            }
            case MessageType.DISABLE_FILTERS_GROUP: {
                const { groupId } = data;
                categories.disableFiltersGroup(groupId);
                break;
            }
            case MessageType.GET_ALLOWLIST_DOMAINS: {
                const allowlistDomains = allowlist.getAllowlistDomains();
                const appVersion = backgroundPage.app.getVersion();
                return {
                    content: allowlistDomains.join('\r\n'),
                    appVersion,
                };
            }
            case MessageType.SAVE_ALLOWLIST_DOMAINS: {
                const { value } = data;
                const domains = value.split(/[\r\n]+/)
                    .map(string => string.trim())
                    .filter(string => string.length > 0);
                allowlist.updateAllowlistDomains(domains);
                break;
            }
            case MessageType.GET_USER_RULES: {
                const content = await userrules.getUserRulesText();
                const appVersion = backgroundPage.app.getVersion();
                return { content, appVersion };
            }
            case MessageType.SAVE_USER_RULES: {
                const { value } = data;
                userrules.updateUserRulesText(value);
                // We are waiting until request filter is updated
                return new Promise((resolve) => {
                    const listenerId = listeners.addListener((event) => {
                        if (event === listeners.USER_FILTER_UPDATED) {
                            listeners.removeListener(listenerId);
                            resolve();
                        }
                    });
                });
            }
            case MessageType.ADD_USER_RULE: {
                const { ruleText } = data;
                userrules.addRules([ruleText]);
                break;
            }
            case MessageType.REMOVE_USER_RULE: {
                const { ruleText } = data;
                userrules.removeRule(ruleText);
                break;
            }
            case MessageType.CHECK_ANTIBANNER_FILTERS_UPDATE: {
                const filters = await uiService.checkFiltersUpdates();
                return filters;
            }
            case MessageType.LOAD_CUSTOM_FILTER_INFO:
                try {
                    const { url, title } = data;
                    // eslint-disable-next-line @typescript-eslint/return-await
                    return application.loadCustomFilterInfo(url, { title });
                } catch (e) {
                    return {};
                }
            case MessageType.SUBSCRIBE_TO_CUSTOM_FILTER: {
                const { customUrl, name, trusted } = data.filter;
                try {
                    const filter = await application.loadCustomFilter(customUrl, { title: name, trusted });
                    await application.addAndEnableFilters([filter.filterId]);
                    return filter;
                } catch (e) {
                    // do nothing
                }
                break;
            }
            case MessageType.OPEN_THANKYOU_PAGE:
                uiService.openThankYouPage();
                break;
            case MessageType.OPEN_EXTENSION_STORE:
                uiService.openExtensionStore();
                break;
            case MessageType.OPEN_FILTERING_LOG:
                uiService.openFilteringLog(message.tabId);
                break;
            case MessageType.OPEN_FULLSCREEN_USER_RULES:
                uiService.openFullscreenUserRules();
                break;
            case MessageType.GET_FILTERING_LOG_DATA: {
                return {
                    filtersMetadata: subscriptions.getFilters(),
                    settings: settings.getAllSettings(),
                    preserveLogEnabled: filteringLog.isPreserveLogEnabled(),
                };
            }
            case MessageType.OPEN_SAFEBROWSING_TRUSTED: {
                const { url } = data;
                safebrowsing.addToSafebrowsingTrusted(url);
                const tab = await tabsApi.getActive();
                if (tab) {
                    tabsApi.reload(tab.tabId, url);
                }
                break;
            }
            case MessageType.OPEN_TAB: {
                const { url, options } = data;
                return uiService.openTab(url, options);
            }
            case MessageType.RESET_BLOCKED_ADS_COUNT:
                frames.resetBlockedAdsCount();
                break;
            case MessageType.RESET_SETTINGS:
                return settingsProvider.applyDefaultSettings();
            case MessageType.GET_SELECTORS_AND_SCRIPTS: {
                let urlForSelectors;
                // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1498
                // when document url for iframe is about:blank then we use tab url
                if (!utils.url.isHttpOrWsRequest(message.documentUrl) && sender.frameId !== 0) {
                    urlForSelectors = sender.tab.url;
                } else {
                    urlForSelectors = message.documentUrl;
                }
                return webRequestService.processGetSelectorsAndScripts(sender.tab, urlForSelectors) || {};
            }
            case MessageType.GET_COOKIE_RULES: {
                if (!utils.url.isHttpOrWsRequest(message.documentUrl) && sender.frameId !== 0) {
                    return {};
                }

                return {
                    rulesData: getCookieRulesDataForContentScript(sender.tab, message.documentUrl, sender.tab.url),
                };
            }
            case MessageType.SAVE_COOKIE_LOG_EVENT: {
                filteringLog.addCookieEvent({
                    tabId: sender.tab.tabId,
                    cookieName: data.cookieName,
                    cookieDomain: data.cookieDomain,
                    cookieRule: new TSUrlFilter.NetworkRule(data.ruleText, data.filterId),
                    isModifyingCookieRule: false,
                    thirdParty: data.thirdParty,
                    timestamp: Date.now(),
                });
                break;
            }
            case MessageType.CHECK_PAGE_SCRIPT_WRAPPER_REQUEST: {
                const block = webRequestService.checkPageScriptWrapperRequest(
                    sender.tab,
                    message.elementUrl,
                    message.documentUrl,
                    message.requestType,
                );
                return {
                    block,
                    requestId: message.requestId,
                };
            }
            case MessageType.PROCESS_SHOULD_COLLAPSE: {
                const collapse = webRequestService.processShouldCollapse(
                    sender.tab,
                    message.elementUrl,
                    message.documentUrl,
                    message.requestType,
                );
                return {
                    collapse,
                    requestId: message.requestId,
                };
            }
            case MessageType.PROCESS_SHOULD_COLLAPSE_MANY: {
                const requests = webRequestService.processShouldCollapseMany(
                    sender.tab,
                    message.documentUrl,
                    message.requests,
                );
                return { requests };
            }
            case MessageType.ON_OPEN_FILTERING_LOG_PAGE:
                filteringLog.onOpenFilteringLogPage();
                break;
            case MessageType.ON_CLOSE_FILTERING_LOG_PAGE:
                filteringLog.onCloseFilteringLogPage();
                break;
            case MessageType.CLEAR_EVENTS_BY_TAB_ID:
                filteringLog.clearEventsByTabId(data.tabId, data.ignorePreserveLog);
                break;
            case MessageType.REFRESH_PAGE:
                filteringLog.clearEventsByTabId(data.tabId);
                await tabsApi.reload(data.tabId);
                break;
            case MessageType.GET_TAB_FRAME_INFO_BY_ID: {
                if (data.tabId) {
                    const frameInfo = frames.getFrameInfo({ tabId: data.tabId });
                    return { frameInfo };
                }

                const tab = await tabsApi.getActive();
                if (tab) {
                    const frameInfo = frames.getFrameInfo(tab);
                    return { frameInfo };
                }

                break;
            }
            case MessageType.GET_FILTERING_INFO_BY_TAB_ID: {
                const { tabId } = data;
                return filteringLog.getFilteringInfoByTabId(tabId);
            }
            case MessageType.SYNCHRONIZE_OPEN_TABS: {
                return filteringLog.synchronizeOpenTabs();
            }
            case MessageType.ADD_FILTERING_SUBSCRIPTION: {
                const { url, title } = message;
                await uiService.openCustomFiltersModal(url, title);
                break;
            }
            // Popup methods
            case MessageType.ADD_ALLOWLIST_DOMAIN_POPUP: {
                const tab = await tabsApi.getActive(data.tabId);
                if (tab) {
                    uiService.allowlistTab(tab);
                }
                break;
            }
            case MessageType.REMOVE_ALLOWLIST_DOMAIN: {
                const tab = await tabsApi.getActive(data.tabId);
                if (tab) {
                    uiService.unAllowlistTab(tab);
                }
                break;
            }
            case MessageType.CHANGE_APPLICATION_FILTERING_DISABLED: {
                const { state } = data;
                uiService.changeApplicationFilteringDisabled(state);
                break;
            }
            case MessageType.OPEN_SITE_REPORT_TAB: {
                if (data) {
                    const { url } = data;
                    uiService.openSiteReportTab(url);
                } else {
                    uiService.openSiteReportTab(message.url);
                }
                break;
            }
            case MessageType.OPEN_ABUSE_TAB:
                if (data) {
                    const { url } = data;
                    uiService.openAbuseTab(url);
                } else {
                    uiService.openAbuseTab(message.url);
                }
                break;
            case MessageType.OPEN_SETTINGS_TAB:
                uiService.openSettingsTab();
                break;
            case MessageType.OPEN_ASSISTANT:
                uiService.openAssistant();
                break;
            case MessageType.GET_TAB_INFO_FOR_POPUP: {
                const tab = await tabsApi.getActive(data.tabId);

                // There can't be data till localstorage is initialized
                const stats = localStorage.isInitialized() ? pageStats.getStatisticsData() : {};

                if (tab) {
                    const frameInfo = frames.getFrameInfo(tab);
                    return {
                        frameInfo,
                        stats,
                        options: {
                            showStatsSupported: true,
                            isFirefoxBrowser: browserUtils.isFirefoxBrowser(),
                            showInfoAboutFullVersion: settings.isShowInfoAboutAdguardFullVersion(),
                            isMacOs: browserUtils.isMacOs(),
                            isEdgeBrowser: browserUtils.isEdgeBrowser()
                                    || browserUtils.isEdgeChromiumBrowser(),
                            notification: notifications.getCurrentNotification(),
                            isDisableShowAdguardPromoInfo: settings.isDisableShowAdguardPromoInfo(),
                            hasCustomRulesToReset: await userrules.hasRulesForUrl(frameInfo.url),
                        },
                        settings: settings.getAllSettings(),
                    };
                }
                break;
            }
            case MessageType.SET_NOTIFICATION_VIEWED:
                notifications.setNotificationViewed(message.withDelay);
                break;
            case MessageType.GET_STATISTICS_DATA:
                // There can't be data till localstorage is initialized
                if (!localStorage.isInitialized()) {
                    return {};
                }
                return {
                    stats: pageStats.getStatisticsData(),
                };
            case MessageType.SAVE_CSS_HITS_STATS:
                processSaveCssHitStats(sender.tab, message.stats);
                break;
            case MessageType.LOAD_SETTINGS_JSON: {
                const appVersion = backgroundPage.app.getVersion();
                const json = await settingsProvider.loadSettingsBackup();
                return {
                    content: json,
                    appVersion,
                };
            }
            case MessageType.APPLY_SETTINGS_JSON: {
                const { json } = data;
                return settingsProvider.applySettingsBackup(json);
            }
            case MessageType.ADD_URL_TO_TRUSTED: {
                const { url } = data;
                await documentFilterService.addToTrusted(url);
                break;
            }
            case MessageType.RESET_CUSTOM_RULES_FOR_PAGE: {
                const { url, tabId } = data;
                await userrules.removeRulesByUrl(url);
                // wait until request filter is updated
                await new Promise((resolve) => {
                    const listenerId = listeners.addListener((event) => {
                        if (event === listeners.REQUEST_FILTER_UPDATED) {
                            listeners.removeListener(listenerId);
                            resolve();
                        }
                    });
                });
                // reload tab
                await tabsApi.reload(tabId, url);
                break;
            }
            case MessageType.SET_PRESERVE_LOG_STATE: {
                const { state } = data;
                filteringLog.setPreserveLogState(state);
                break;
            }
            case MessageType.GET_USER_RULES_EDITOR_DATA: {
                return {
                    userRules: await userrules.getUserRulesText(),
                    settings: settings.getAllSettings(),
                };
            }
            case MessageType.GET_EDITOR_STORAGE_CONTENT: {
                return editorStorage.getContent();
            }
            case MessageType.SET_EDITOR_STORAGE_CONTENT: {
                const { content } = data;
                editorStorage.setContent(content);
                break;
            }
            case MessageType.CONVERT_RULES_TEXT: {
                const { content } = data;
                return TSUrlFilter.RuleConverter.convertRules(content);
            }
            default:
                // Unhandled message
                throw new Error(`There is no such message type ${message.type}`);
        }
        return Promise.resolve();
    };

    return handleMessage;
};

/**
 *  Initialize Content => BackgroundPage messaging
 */
const init = () => {
    // Add event listener for messages from popup page, options page and content scripts
    backgroundPage.runtime.onMessage.addListener(createMessageHandler());

    backgroundPage.runtime.onConnect.addListener(longLivedMessageHandler);
};

export const messageHandler = {
    init,
};
