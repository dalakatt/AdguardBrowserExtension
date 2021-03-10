import { validator } from '@adguard/translate'
import path from 'path';

import { cliLog } from '../cli-log';

import {
    getLocaleTranslations,
    areArraysEqual,
} from '../helpers';

import {
    BASE_LOCALE,
    LANGUAGES,
    LOCALES_RELATIVE_PATH,
    LOCALE_DATA_FILENAME,
    REQUIRED_LOCALES,
    THRESHOLD_PERCENTAGE,
} from './locales-constants';

const LOCALES = Object.keys(LANGUAGES);
const LOCALES_DIR = path.resolve(__dirname, LOCALES_RELATIVE_PATH);

/**
 * @typedef Result
 * @property {string} locale
 * @property {string} level % of translated
 * @property {Array} untranslatedStrings
 * @property {Array} invalidTranslations
 */

 /**
 * @typedef CriticalResult
 * @property {string} locale
 * @property {Array} invalidTranslations
 */

/**
 * Logs translations readiness (for main part of validation process)
 * @param {Result[]} results
 */
const printTranslationsResults = (results) => {
    cliLog.info('Translations readiness:');
    results.forEach((r) => {
        const record = `${r.locale} -- ${r.level}%`;
        if (r.level < THRESHOLD_PERCENTAGE) {
            cliLog.warningRed(record);
            if (r.untranslatedStrings.length > 0) {
                cliLog.warning(`  untranslated:`);
                r.untranslatedStrings.forEach((str) => {
                    cliLog.warning(`    - ${str}`);
                });
            }
            if (r.invalidTranslations.length > 0) {
                cliLog.warning(`  invalid:`);
                r.invalidTranslations.forEach((obj) => {
                    cliLog.warning(`    - ${obj.key} -- ${obj.error}`);
                });
            }
        } else {
            cliLog.success(record);
        }
    });
};

/**
 * Logs invalid translations (for extra part of validation process)
 * @param {CriticalResult[]} results
 */
const printCriticalResults = (results) => {
    cliLog.warning('Invalid translated string:');
    results.forEach((r) => {
        cliLog.warningRed(`${r.locale}:`);
        r.invalidTranslations.forEach((obj) => {
            cliLog.warning(`   - ${obj.key} -- ${obj.error}`);
        });
    });
};

const validateMessage = (baseKey, baseLocaleTranslations, localeTranslations) => {
    const baseMessageValue = baseLocaleTranslations[baseKey].message;
    const localeMessageValue = localeTranslations[baseKey].message;
    try {
        validator.isTranslationValid(baseMessageValue, localeMessageValue);
    } catch (error) {
        return { key: baseKey, error };
    }
}

/**
 * Checks locales translations readiness
 * @param {string[]} locales - list of locales
 * @param {boolean} [isInfo=false] flag for info script
 * @param {string[]} [localesForCriticalCheck=[]] locales to check only invalid translations;
 * e.g. for 'validate --min' in order to avoid errors caused by invalid strings
 * @returns {Result[]} array of object with such properties:
 * locale, level of translation readiness, untranslated strings array and array of invalid translations
 */
export const checkTranslations = async (locales, isInfo = false, localesForCriticalCheck = []) => {
    // console.log('locales - ', locales);
    // console.log('isInfo - ', isInfo);
    // console.log('localesForCriticalCheck - ', localesForCriticalCheck);
    const baseLocaleTranslations = await getLocaleTranslations(
        LOCALES_DIR, BASE_LOCALE, LOCALE_DATA_FILENAME,
    );
    const baseMessages = Object.keys(baseLocaleTranslations);
    const baseMessagesCount = baseMessages.length;

    const mainResults = await Promise.all(locales.map(async (locale) => {
        const localeTranslations = await getLocaleTranslations(
            LOCALES_DIR, locale, LOCALE_DATA_FILENAME,
        );
        const localeMessages = Object.keys(localeTranslations);
        const localeMessagesCount = localeMessages.length;

        const untranslatedStrings = [];
        const invalidTranslations = [];
        baseMessages.forEach((baseKey) => {
            if (!localeMessages.includes(baseKey)) {
                untranslatedStrings.push(baseKey);
            } else {
                const validMessage = validateMessage(baseKey, baseLocaleTranslations, localeTranslations);
                if (typeof validMessage !== 'undefined') {
                    invalidTranslations.push(validMessage);
                }
            }
        });

        const validLocaleMessagesCount = localeMessagesCount - invalidTranslations.length;

        const strictLevel = ((validLocaleMessagesCount / baseMessagesCount) * 100);
        const level = Math.round((strictLevel + Number.EPSILON) * 100) / 100;

        return { locale, level, untranslatedStrings, invalidTranslations };
    }));

    const criticalCheckResults = await Promise.all(localesForCriticalCheck.map(async (extraLocale) => {
        const extraLocaleTranslations = await getLocaleTranslations(
            LOCALES_DIR, extraLocale, LOCALE_DATA_FILENAME,
        );
        const extraLocaleMessages = Object.keys(extraLocaleTranslations);

        const invalidTranslations = [];
        baseMessages.forEach((baseKey) => {
            // check existing translations
            if (extraLocaleMessages.includes(baseKey)) {
                const validMessage = validateMessage(baseKey, baseLocaleTranslations, extraLocaleTranslations);
                if (typeof validMessage !== 'undefined') {
                    invalidTranslations.push(validMessage);
                }
            }
        });

        return { locale: extraLocale, invalidTranslations };
    }));

    const filteredResults = mainResults.filter((result) => {
        return result.level < THRESHOLD_PERCENTAGE;
    });

    if (isInfo) {
        printTranslationsResults(mainResults);
    } else if (filteredResults.length === 0) {
        let message = `Level of translations is required for locales: ${locales.join(', ')}`;
        if (areArraysEqual(locales, LOCALES)) {
            message = 'All locales have required level of translations';
        } else if (areArraysEqual(locales, REQUIRED_LOCALES)) {
            message = 'Our locales have required level of translations';
        }
        cliLog.success(message);
    } else {
        printTranslationsResults(filteredResults);
        throw new Error('Locales above should be done for 100%');
    }

    const filteredCriticalResults = criticalCheckResults.filter((result) => {
        return result.invalidTranslations.length > 0;
    });

    const isCriticalCheck = localesForCriticalCheck.length > 0;

    if (isCriticalCheck) {
        if (filteredCriticalResults.length === 0) {
            const message = 'No invalid translations found'
            cliLog.success(message);
        } else {
            printCriticalResults(filteredCriticalResults);
            throw new Error('Locales above should not have invalid strings');
        }
    }

    return mainResults;
};
