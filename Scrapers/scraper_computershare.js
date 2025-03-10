// ==UserScript==
// @name         Computershare Company List Exporter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Export company names from Computershare
// @author       You
// @match        https://www-au.computershare.com/Investor/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create and add the floating button
    function createFloatingButton() {
        const button = document.createElement('button');
        button.textContent = 'Export company list';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(button);
        return button;
    }

    // Add the button after page load
    window.addEventListener('load', () => {
        const floatingButton = createFloatingButton();
        let isScrapingActive = false;

        floatingButton.addEventListener('click', () => {
            if (!isScrapingActive) {
                isScrapingActive = true;
                handleSessionTimeout();
                scrapeCompanyNames();
            }
        });

        function generateCombinations(length) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const combinations = [];
          
            function generate(current, len) {
              if (len === 0) {
                combinations.push(current);
                return;
              }
              for (let i = 0; i < characters.length; i++) {
                generate(current + characters[i], len - 1);
              }
            }
          
            generate('', length);
            return combinations;
        }
          
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
          
        async function scrapeCompanyNames() {
            const baseUrl = 'https://www-au.computershare.com/Investor/CompanySearch/Index';
            const countryCode = 'AU';
            const allCompanyNames = new Set();
            const combinations = generateCombinations(2);
            const failedInputs = new Set();
          
            for (const text of combinations) {
                try {
                    // Update button text with current progress
                    floatingButton.textContent = `Currently searching "${text}", ${allCompanyNames.size} results`;
                    
                    const response = await fetch(baseUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Origin': 'https://www-au.computershare.com',
                            'Referer': 'https://www-au.computershare.com/Investor/',
                        },
                        body: JSON.stringify({ countryCode, text: text.toLowerCase() }),
                    });
              
                    if (!response.ok) {
                        console.error(`Request failed for "${text}" with status: ${response.status}`);
                        failedInputs.add(text);
                        continue;
                    }
              
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            // Parse the code value to extract code and altCode
                            const rawCode = item.Value || '';
                            let code = '';
                            let altCode = '';
                            
                            // Check if the code follows the pattern with a colon
                            if (rawCode.includes(':')) {
                                const parts = rawCode.split(':');
                                code = parts[0] || '';
                                
                                // Extract altCode - remove 'SCAU' prefix if present
                                if (parts[1] && parts[1].startsWith('SCAU')) {
                                    altCode = parts[1].substring(4);
                                } else {
                                    altCode = parts[1] || '';
                                }
                            } else {
                                code = rawCode;
                            }
                            
                            const companyData = {
                                code: code,
                                altCode: altCode || null,
                                name: item.Text || ''
                            };
                            allCompanyNames.add(JSON.stringify(companyData));
                        });
                    }
                    await delay(1000);
                } catch (error) {
                    console.error(`Error during request for "${text}":`, error);
                    failedInputs.add(text);
                }
            }

            // If there are failed inputs, create a separate JSON file for them
            if (failedInputs.size > 0) {
                const failedData = {
                    metadata: {
                        source: 'Computershare',
                        generated_at: new Date().toISOString(),
                        total_failed: failedInputs.size
                    },
                    failed_inputs: Array.from(failedInputs)
                };
                const failedBlob = new Blob([JSON.stringify(failedData, null, 2)], { type: 'application/json' });
                const failedUrl = URL.createObjectURL(failedBlob);
                const failedA = document.createElement('a');
                failedA.href = failedUrl;
                failedA.download = 'computershare_failed_inputs.json';
                document.body.appendChild(failedA);
                failedA.click();
                document.body.removeChild(failedA);
                URL.revokeObjectURL(failedUrl);
            }
          
            // Create the final data structure
            const finalData = {
                metadata: {
                    source: 'Computershare',
                    generated_at: new Date().toISOString(),
                    total_companies: allCompanyNames.size
                },
                companies: Array.from(allCompanyNames).map(JSON.parse)
            };

            const jsonData = JSON.stringify(finalData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'computershare_companylist.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset button state
            floatingButton.textContent = 'Export company list';
            isScrapingActive = false;
        }
          
        async function handleSessionTimeout() {
            const modalSelector = "body > div.modalContainer > div:nth-child(1) > div.modal.fade.dialog > div";
            const buttonSelector = "body > div.modalContainer > div:nth-child(1) > div.modal.fade.dialog > div > div > div.modal-footer > button.btn.btn-secondary";
          
            // Check every 30 seconds for the modal
            setInterval(() => {
                const modal = document.querySelector(modalSelector);
                const button = document.querySelector(buttonSelector);
                
                if (modal && button && modal.offsetParent !== null) {
                    console.log("Session timeout modal detected, clicking continue...");
                    button.click();
                }
            }, 30000);
        }
    });
})(); 