import browser from 'webextension-polyfill';
import { nanoid } from 'nanoid';

import { log } from '../../common/log';
import { MessageType, APP_MESSAGE_HANDLER_NAME } from '../../common/constants';

class Messenger {
    onMessage = browser.runtime.onMessage;

    // eslint-disable-next-line class-methods-use-this
    async sendMessage(type, data) {
        log.debug('Request type:', type);
        if (data) {
            log.debug('Request data:', data);
        }

        const response = await browser.runtime.sendMessage({
            handlerName: APP_MESSAGE_HANDLER_NAME,
            type,
            data,
        });

        if (response) {
            log.debug('Response type:', type);
            log.debug('Response data:', response);
        }

        return response;
    }

    /**
     * Creates long lived connections between popup and background page
     * @param {string} page
     * @param events
     * @param callback
     * @returns {function}
     */
    createLongLivedConnection = (page, events, callback) => {
        const eventListener = (...args) => {
            callback(...args);
        };

        const port = browser.runtime.connect({ name: `${page}_${nanoid()}` });
        port.postMessage({ type: MessageType.ADD_LONG_LIVED_CONNECTION, data: { events } });

        port.onMessage.addListener((message) => {
            if (message.type === MessageType.NOTIFY_LISTENERS) {
                const [type, ...data] = message.data;
                eventListener({ type, data });
            }
        });

        port.onDisconnect.addListener(() => {
            if (browser.runtime.lastError) {
                log.error(browser.runtime.lastError.message);
            }
        });

        const onUnload = () => {
            port.disconnect();
        };

        window.addEventListener('beforeunload', onUnload);
        window.addEventListener('unload', onUnload);

        return onUnload;
    };

    /**
     * Method subscribes to notifier module events
     * @param events - list of events to which subscribe
     * @param callback - callback called when event fires
     * @param onUnloadCallback - callback used to remove listener on unload
     * @returns {Promise<function(): Promise<void>>}
     */
    createEventListener = async (events, callback, onUnloadCallback) => {
        const eventListener = (...args) => {
            callback(...args);
        };

        let { listenerId } = await this.sendMessage(
            MessageType.CREATE_EVENT_LISTENER, { events },
        );

        browser.runtime.onMessage.addListener((message) => {
            if (message.type === MessageType.NOTIFY_LISTENERS) {
                const [type, ...data] = message.data;
                eventListener({ type, data });
            }
        });

        const onUnload = async () => {
            if (listenerId) {
                const type = MessageType.REMOVE_LISTENER;
                this.sendMessage(type, { listenerId });
                listenerId = null;
                if (typeof onUnloadCallback === 'function') {
                    onUnloadCallback();
                }
            }
        };

        window.addEventListener('beforeunload', onUnload);
        window.addEventListener('unload', onUnload);

        return onUnload;
    };

    async getOptionsData() {
        const res = await this.sendMessage(MessageType.GET_OPTIONS_DATA);
        return res;
    }

    async changeUserSetting(settingId, value) {
        await this.sendMessage(MessageType.CHANGE_USER_SETTING, {
            key: settingId,
            value,
        });
    }

    openExtensionStore = async () => {
        return this.sendMessage(MessageType.OPEN_EXTENSION_STORE);
    };

    async enableFilter(filterId) {
        return this.sendMessage(MessageType.ADD_AND_ENABLE_FILTER, { filterId });
    }

    async disableFilter(filterId) {
        return this.sendMessage(MessageType.DISABLE_ANTIBANNER_FILTER, { filterId });
    }

    async applySettingsJson(json) {
        return this.sendMessage(MessageType.APPLY_SETTINGS_JSON, { json });
    }

    async openFilteringLog() {
        return this.sendMessage(MessageType.OPEN_FILTERING_LOG);
    }

    async resetStatistics() {
        return this.sendMessage(MessageType.RESET_BLOCKED_ADS_COUNT);
    }

    async resetSettings() {
        return this.sendMessage(MessageType.RESET_SETTINGS);
    }

    async getUserRules() {
        return this.sendMessage(MessageType.GET_USER_RULES);
    }

    async saveUserRules(value) {
        await this.sendMessage(MessageType.SAVE_USER_RULES, { value });
    }

    async getAllowlist() {
        return this.sendMessage(MessageType.GET_ALLOWLIST_DOMAINS);
    }

    async saveAllowlist(value) {
        await this.sendMessage(MessageType.SAVE_ALLOWLIST_DOMAINS, { value });
    }

    async updateFilters() {
        return this.sendMessage(MessageType.CHECK_ANTIBANNER_FILTERS_UPDATE);
    }

    async updateGroupStatus(id, data) {
        const type = data
            ? MessageType.ENABLE_FILTERS_GROUP
            : MessageType.DISABLE_FILTERS_GROUP;
        const groupId = id - 0;
        await this.sendMessage(type, { groupId });
    }

    async updateFilterStatus(filterId, data) {
        const type = data
            ? MessageType.ADD_AND_ENABLE_FILTER
            : MessageType.DISABLE_ANTIBANNER_FILTER;
        await this.sendMessage(type, { filterId });
    }

    async checkCustomUrl(url) {
        return this.sendMessage(MessageType.LOAD_CUSTOM_FILTER_INFO, { url });
    }

    async addCustomFilter(filter) {
        return this.sendMessage(MessageType.SUBSCRIBE_TO_CUSTOM_FILTER, { filter });
    }

    async removeCustomFilter(filterId) {
        await this.sendMessage(MessageType.REMOVE_ANTIBANNER_FILTER, { filterId });
    }

    async getTabInfoForPopup(tabId) {
        return this.sendMessage(MessageType.GET_TAB_INFO_FOR_POPUP, { tabId });
    }

    async changeApplicationFilteringDisabled(state) {
        return this.sendMessage(MessageType.CHANGE_APPLICATION_FILTERING_DISABLED, { state });
    }

    async openSettingsTab() {
        return this.sendMessage(MessageType.OPEN_SETTINGS_TAB);
    }

    async openAssistant() {
        return this.sendMessage(MessageType.OPEN_ASSISTANT);
    }

    async openAbuseSite(url) {
        return this.sendMessage(MessageType.OPEN_ABUSE_TAB, { url });
    }

    async checkSiteSecurity(url) {
        return this.sendMessage(MessageType.OPEN_SITE_REPORT_TAB, { url });
    }

    async resetCustomRulesForPage(url) {
        const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
        return this.sendMessage(
            MessageType.RESET_CUSTOM_RULES_FOR_PAGE,
            { url, tabId: currentTab?.id },
        );
    }

    async removeAllowlistDomain(tabId) {
        return this.sendMessage(MessageType.REMOVE_ALLOWLIST_DOMAIN, { tabId });
    }

    async addAllowlistDomain(tabId) {
        return this.sendMessage(MessageType.ADD_ALLOWLIST_DOMAIN_POPUP, { tabId });
    }

    async getStatisticsData() {
        return this.sendMessage(MessageType.GET_STATISTICS_DATA);
    }

    async onOpenFilteringLogPage() {
        await this.sendMessage(MessageType.ON_OPEN_FILTERING_LOG_PAGE);
    }

    async getFilteringLogData() {
        return this.sendMessage(MessageType.GET_FILTERING_LOG_DATA);
    }

    async onCloseFilteringLogPage() {
        await this.sendMessage(MessageType.ON_CLOSE_FILTERING_LOG_PAGE);
    }

    async getFilteringInfoByTabId(tabId) {
        return this.sendMessage(MessageType.GET_FILTERING_INFO_BY_TAB_ID, { tabId });
    }

    async synchronizeOpenTabs() {
        return this.sendMessage(MessageType.SYNCHRONIZE_OPEN_TABS);
    }

    async clearEventsByTabId(tabId, ignorePreserveLog) {
        return this.sendMessage(MessageType.CLEAR_EVENTS_BY_TAB_ID, { tabId, ignorePreserveLog });
    }

    async refreshPage(tabId, preserveLogEnabled) {
        await this.sendMessage(MessageType.REFRESH_PAGE, { tabId, preserveLogEnabled });
    }

    async openTab(url, options) {
        await this.sendMessage(MessageType.OPEN_TAB, { url, options });
    }

    async addUserRule(ruleText) {
        await this.sendMessage(MessageType.ADD_USER_RULE, { ruleText });
    }

    async unAllowlistFrame(frameInfo) {
        await this.sendMessage(MessageType.UN_ALLOWLIST_FRAME, { frameInfo });
    }

    async removeUserRule(ruleText) {
        await this.sendMessage(MessageType.REMOVE_USER_RULE, { ruleText });
    }

    async getTabFrameInfoById(tabId) {
        return this.sendMessage(MessageType.GET_TAB_FRAME_INFO_BY_ID, { tabId });
    }

    async setPreserveLogState(state) {
        return this.sendMessage(MessageType.SET_PRESERVE_LOG_STATE, { state });
    }

    async getEditorStorageContent() {
        return this.sendMessage(MessageType.GET_EDITOR_STORAGE_CONTENT);
    }

    async setEditorStorageContent(content) {
        return this.sendMessage(MessageType.SET_EDITOR_STORAGE_CONTENT, { content });
    }

    async convertRuleText(content) {
        return this.sendMessage(MessageType.CONVERT_RULES_TEXT, { content });
    }
}

const messenger = new Messenger();

export { messenger };
