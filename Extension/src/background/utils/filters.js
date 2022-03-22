import { AntiBannerFiltersId } from '../../common/constants';

/**
 * Util class for detect filter type. Includes various filter identifiers
 */
export const filters = (() => {
    const FilterUtils = {

        isUserFilterRule(rule) {
            return rule.getFilterListId() === AntiBannerFiltersId.USER_FILTER_ID;
        },

        isAllowlistFilterRule(rule) {
            return rule.getFilterListId() === AntiBannerFiltersId.ALLOWLIST_FILTER_ID;
        },
    };

    // Make accessible only constants without functions. They will be passed to content-page
    FilterUtils.ids = AntiBannerFiltersId;

    // Copy filter ids to api
    Object.keys(AntiBannerFiltersId).forEach(key => {
        FilterUtils[key] = AntiBannerFiltersId[key];
    });

    return FilterUtils;
})();
