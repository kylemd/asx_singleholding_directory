// ==UserScript==
// @name         Export MUFG Company List
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Extracts a list of ASX companies managed by MUFG and exports them to a JSON file with error handling, retries, cookie clearing, and page refresh
// @author       Your Name
// @match        https://au.investorcentre.mpms.mufg.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const inputSelector = '#SingleHolding_IssuerCode';
    const parentSelector = '#divOscarShares > div.singleHoldingIssuer';
    const apiUrl = '/OpenAccess/IssuersList/';
    const minDelay = 1000; // Reduced to 1 second
    const maxDelay = 2000; // Reduced to 2 seconds
    const cooldownTime = 120000; // 2 minutes
    const resumeDelay = 5000; // 5 seconds delay before resuming

    let allIssuerData = new Set();
    let failedInputs = new Set();
    let isCoolingDown = false;
    let exportButton = null; // Initialize exportButton to null
    let currentInput = '';
    let isScriptRunning = false;

    function updateButtonText(currentInput, resultsCount) {
        try {
            if (exportButton) {
                exportButton.textContent = `Export MUFG Company List (${currentInput}, ${resultsCount} results)`;
            }
        } catch (error) {
            console.error(`Error updating button text:`, error);
        }
    }

    function clearCookiesAndRefresh() {
        console.log('clearCookiesAndRefresh: Starting to clear cookies and refresh the page...');
        document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
        localStorage.setItem('resuming', 'true');
        console.log('clearCookiesAndRefresh: Cookies cleared, refreshing the page...');
        location.reload();
    }

    async function fetchIssuerData(searchText, retries = 5) {
        console.log(`fetchIssuerData called for ${searchText}, retries: ${retries}`);
        if (isCoolingDown) {
            console.log(`Cooling down, waiting for ${cooldownTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, cooldownTime));
            isCoolingDown = false;
        }
        try {
            const response = await $.ajax({
                url: apiUrl,
                data: { searchText: searchText, isAffirm: $("#ShowAffirmIssuer").val() },
                dataType: "json",
            });

            return response.map(text => {
                const [code, name] = text.split(' - ');
                return { code: code?.trim() || '', name: name?.trim() || '' };
            }).filter(entry => entry.code && entry.name);
        } catch (error) {
            console.error(`Error fetching data for input "${searchText}":`, error);
            if (error.message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
                console.warn(`HTTP2 protocol error detected. Initiating cooldown and refresh.`);
                isCoolingDown = true;
                localStorage.setItem('lastInput', currentInput);
                console.log('fetchIssuerData: Calling clearCookiesAndRefresh...');
                clearCookiesAndRefresh();
                console.log('fetchIssuerData: clearCookiesAndRefresh called.');
                return [];
            }
            if (retries > 0) {
                const retryDelay = Math.random() * (maxDelay - minDelay) + minDelay;
                console.log(`Retrying in ${Math.round(retryDelay / 1000)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return fetchIssuerData(searchText, retries - 1);
            } else {
                console.warn(`Max retries reached for "${searchText}". Skipping.`);
                failedInputs.add(searchText);
                return [];
            }
        }
    }

    async function startExtraction(inputsToRetry = null) {
        if (isScriptRunning) {
            console.warn('startExtraction: Script is already running. Exiting.');
            return;
        }
        isScriptRunning = true;
        console.log(`startExtraction called, inputsToRetry: ${inputsToRetry}`);
        try {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let inputs = inputsToRetry || [];
            if (!inputsToRetry) {
                for (let i = 0; i < characters.length; i++) {
                    inputs.push(characters[i]);
                }
            }

            const lastInput = localStorage.getItem('lastInput');
            if (lastInput && !inputsToRetry) {
                console.log(`Resuming from last input: ${lastInput}`);
                const lastIndex = inputs.indexOf(lastInput);
                if (lastIndex !== -1) {
                    inputs = inputs.slice(lastIndex);
                }
            }

            for (const input of inputs) {
                currentInput = input;
                try {
                    updateButtonText(input, allIssuerData.size);
                } catch (error) {
                    console.error(`Error updating button text:`, error);
                }
                const data = await fetchIssuerData(input);
                if (data.length > 0 && !inputsToRetry) {
                    for (let j = 0; j < characters.length; j++) {
                        const twoCharInput = input + characters[j];
                        currentInput = twoCharInput;
                        try {
                            updateButtonText(twoCharInput, allIssuerData.size);
                        } catch (error) {
                            console.error(`Error updating button text:`, error);
                        }
                        const twoCharData = await fetchIssuerData(twoCharInput);
                        twoCharData.forEach(entry => allIssuerData.add(JSON.stringify(entry)));
                        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
                        console.log(`Waiting ${Math.round(delay / 1000)} seconds before next request...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                data.forEach(entry => allIssuerData.add(JSON.stringify(entry)));
                const delay = Math.random() * (maxDelay - minDelay) + minDelay;
                console.log(`Waiting ${Math.round(delay / 1000)} seconds before next request...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            if (failedInputs.size > 0) {
                console.log(`Retrying failed inputs...`);
                await startExtraction(Array.from(failedInputs));
            }

            if (failedInputs.size > 0) {
                const failedData = {
                    metadata: {
                        source: 'MUFG',
                        generated_at: new Date().toISOString(),
                        total_failed: failedInputs.size
                    },
                    failed_inputs: Array.from(failedInputs)
                };
                const failedBlob = new Blob([JSON.stringify(failedData, null, 2)], { type: 'application/json' });
                const failedUrl = URL.createObjectURL(failedBlob);
                const failedA = document.createElement('a');
                failedA.href = failedUrl;
                failedA.download = 'mufg_failed_inputs.json';
                document.body.appendChild(failedA);
                failedA.click();
                document.body.removeChild(failedA);
                URL.revokeObjectURL(failedUrl);
            }

            const finalData = {
                metadata: {
                    source: 'MUFG',
                    generated_at: new Date().toISOString(),
                    total_companies: allIssuerData.size
                },
                companies: Array.from(allIssuerData).map(JSON.parse)
            };

            const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mufg_companylist.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`An error occurred during startExtraction:`, error);
        } finally {
            localStorage.removeItem('lastInput');
            localStorage.removeItem('resuming');
            isScriptRunning = false;
            console.log('startExtraction: Script finished.');
        }
    }

    function addExportButton() {
        if (!exportButton) {
            exportButton = document.createElement('button');
            exportButton.textContent = 'Export MUFG Company List';
            exportButton.style.position = 'fixed';
            exportButton.style.top = '10px';
            exportButton.style.right = '10px';
            exportButton.style.padding = '10px';
            exportButton.style.background = '#0073e6';
            exportButton.style.color = '#fff';
            exportButton.style.border = 'none';
            exportButton.style.cursor = 'pointer';
            exportButton.onclick = () => {
                startExtraction().catch(error => {
                    console.error(`An error occurred during script execution:`, error);
                });
            };
            document.body.appendChild(exportButton);
        }
    }

    function waitForElement(selector, callback) {
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                callback(element);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    waitForElement(parentSelector, () => {
        waitForElement(inputSelector, addExportButton);
    });

    if (localStorage.getItem('resuming') === 'true') {
        console.log('Resuming script...');
        setTimeout(() => {
            waitForElement(inputSelector, () => {
                startExtraction().catch(error => {
                    console.error(`An error occurred during script execution:`, error);
                });
            });
        }, resumeDelay);
    }
})();
