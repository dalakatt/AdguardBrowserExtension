import browser from 'webextension-polyfill';
import { UserAgent } from '../../../common/user-agent';
import {
    UserSettings,
    UserSettingOption,
    DEFAULT_FILTERS_UPDATE_PERIOD,
    DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    ADGUARD_USER_SETTINGS_KEY,
    AppearanceTheme,
} from '../../../common/settings';

export class UserSettingsStorage {
    /**
     * Computed values are declared in this object instead constructor,
     * because default settings called by reset method
     */
    static defaultSettings: UserSettings = {
        // eslint-disable-next-line max-len
        [UserSettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO]: UserSettingsStorage.isPromoInfoDisabled(),
        [UserSettingOption.DISABLE_SAFEBROWSING]: true,
        [UserSettingOption.DISABLE_COLLECT_HITS]: true,
        [UserSettingOption.DEFAULT_ALLOWLIST_MODE]: true,
        [UserSettingOption.ALLOWLIST_ENABLED]: true,
        [UserSettingOption.USE_OPTIMIZED_FILTERS]: UserAgent.isMobile,
        [UserSettingOption.DISABLE_DETECT_FILTERS]: false,
        [UserSettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION]: false,
        [UserSettingOption.FILTERS_UPDATE_PERIOD]: DEFAULT_FILTERS_UPDATE_PERIOD,
        [UserSettingOption.DISABLE_STEALTH_MODE]: true,
        [UserSettingOption.HIDE_REFERRER]: true,
        [UserSettingOption.HIDE_SEARCH_QUERIES]: true,
        [UserSettingOption.SEND_DO_NOT_TRACK]: true,
        [UserSettingOption.BLOCK_CHROME_CLIENT_DATA]: UserAgent.isChrome,
        [UserSettingOption.BLOCK_WEBRTC]: false,
        [UserSettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES]: true,
        [UserSettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME]: DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN,
        [UserSettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES]: false,
        [UserSettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME]: DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN,
        [UserSettingOption.APPEARANCE_THEME]: AppearanceTheme.SYSTEM,
        [UserSettingOption.USER_FILTER_ENABLED]: true,
        [UserSettingOption.HIDE_RATE_BLOCK]: false,
        [UserSettingOption.USER_RULES_EDITOR_WRAP]: false,
        [UserSettingOption.DISABLE_FILTERING]: false,
        [UserSettingOption.DISABLE_SHOW_PAGE_STATS]: false,
        [UserSettingOption.DISABLE_SHOW_CONTEXT_MENU]: false,
    };

    settings = UserSettingsStorage.defaultSettings;

    isInit = false;

    private storage = browser.storage.local;

    async init() {
        const persistentData = await this.storage.get({
            [ADGUARD_USER_SETTINGS_KEY]: UserSettingsStorage.defaultSettings,
        });

        this.settings = persistentData[ADGUARD_USER_SETTINGS_KEY];
        await this.storage.set({ [ADGUARD_USER_SETTINGS_KEY]: this.settings });
        this.isInit = true;
    }

    async set<T extends UserSettingOption>(key: T, value: UserSettings[T]): Promise<void> {
        this.settings[key] = value;
        await this.storage.set({ [ADGUARD_USER_SETTINGS_KEY]: this.settings });
    }

    get<T extends UserSettingOption>(key: T): UserSettings[T] {
        if (!this.isInit) {
            throw new Error('The storage is not initialized');
        }

        return this.settings[key];
    }

    getData() {
        return {
            names: UserSettingOption,
            defaultValues: UserSettingsStorage.defaultSettings,
            values: this.settings,
        };
    }

    async reset() {
        this.settings = UserSettingsStorage.defaultSettings;
        await this.storage.set({ [ADGUARD_USER_SETTINGS_KEY]: this.settings });
    }

    static isPromoInfoDisabled(): boolean {
        return (!UserAgent.isWindows && !UserAgent.isMacOs) || UserAgent.isEdge;
    }
}

export const userSettingsStorage = new UserSettingsStorage();
