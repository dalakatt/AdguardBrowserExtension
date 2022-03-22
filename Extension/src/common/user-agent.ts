import Bowser from 'bowser';

/**
 * helper class for user agent data
 *
 * Use bowser UA string parser because User Agent Client Hints API is not supported by FF
 * https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API#browser_compatibility
 */
export class UserAgent {
    static parser = Bowser.getParser(window.navigator.userAgent);

    static data = UserAgent.parser.getResult();

    static readonly isSupportedBrowser = UserAgent.parser.satisfies({
        chrome: '>=79',
        firefox: '>=78',
        opera: '>=66',
    });

    static browserName = UserAgent.data.browser.name;

    static isChrome = UserAgent.browserName === 'Chrome';

    static isEdge = UserAgent.browserName === 'Microsoft Edge';

    static osName = UserAgent.data.os.name;

    static isMacOs = UserAgent.osName === 'macOS';

    static isWindows = UserAgent.osName === 'Windows';

    static isMobile = UserAgent.data.platform.type === 'mobile';
}
