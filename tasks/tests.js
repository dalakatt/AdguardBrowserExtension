import gulp from 'gulp';
import path from 'path';
import { runQunitPuppeteer, printOutput } from 'node-qunit-puppeteer';


const runQunit = (testFilePath, done) => {
    const qunitArgs = {
        targetUrl: `file://${path.resolve(__dirname, testFilePath)}`,
        timeout: 20000,
        redirectConsole: true,
    };

    runQunitPuppeteer(qunitArgs)
        .then((result) => {
            printOutput(result, console);
            if (result.stats.failed > 0) {
                done('Some of the unit tests failed');
            }
        })
        .then(done)
        .catch((ex) => {
            done(`Error occurred while running tests: ${ex}`);
        });
};

// Rule constructor tests
const testRule = (done) => {
    runQunit('../Extension/tests/rule-constructor/test-rule-constructor.html', done);
};

// Safebrowsing filter tests
const testSB = (done) => {
    runQunit('../Extension/tests/sb-filter/test-sb-filter.html', done);
};

// Css service tests
const testCssService = (done) => {
    runQunit('../Extension/tests/services/test-css-service.html', done);
};

const testRedirectService = (done) => {
    runQunit('../Extension/tests/services/test-redirect-service.html', done);
};

// Request filter tests
const testReq = (done) => {
    runQunit('../Extension/tests/request-filter/test-request-filter.html', done);
};

// Element collapser tests
const testEl = (done) => {
    runQunit('../Extension/tests/miscellaneous/test-element-collapser.html', done);
};

// Ring buffer tests
const testRing = (done) => {
    runQunit('../Extension/tests/miscellaneous/test-ring-buffer.html', done);
};

// Cookie helper tests
const testCookie = (done) => {
    runQunit('../Extension/tests/miscellaneous/test-cookie.html', done);
};

// Request context storage test
const testRequestContextStorage = (done) => {
    runQunit('../Extension/tests/miscellaneous/test-request-context-storage.html', done);
};

// Stats collection test
const testStatsCollection = (done) => {
    runQunit('../Extension/tests/stats/test-stats.html', done);
};

// Document filter
const testDocumentFilter = (done) => {
    runQunit('../Extension/tests/document-filter/test-document-filter.html', done);
};

// Settings provider
const testSettingsProvider = (done) => {
    runQunit('../Extension/tests/settings/test-settings.html', done);
};

export default gulp.series(
    testRule,
    testSB,
    testCssService,
    testRedirectService,
    testReq,
    testEl,
    testCookie,
    testRing,
    testRequestContextStorage,
    testStatsCollection,
    testDocumentFilter,
    testSettingsProvider
);
