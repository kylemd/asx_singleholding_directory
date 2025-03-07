// ==UserScript==
// @name         Automic Company List Monitor
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Monitor and capture company list from Automic
// @author       You
// @match        https://investor.automic.com.au/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create and add the floating button
    function createFloatingButton() {
        const button = document.createElement('button');
        button.textContent = 'Monitoring for company list...';
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

    // Add the button and set up network monitoring
    window.addEventListener('load', () => {
        console.log('Automic Company List Monitor loaded');
        const floatingButton = createFloatingButton();
        let companiesData = null;

        // Set up XHR monitoring
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            
            xhr.open = function() {
                if (arguments[1].includes('companies?nonParentOnly=true')) {
                    xhr.addEventListener('load', function() {
                        if (xhr.status === 200) {
                            try {
                                companiesData = JSON.parse(xhr.responseText);
                                console.log('Companies data captured via XHR:', companiesData);
                                floatingButton.textContent = 'Company list captured! Click to download';
                                floatingButton.style.backgroundColor = '#2196F3';
                            } catch (e) {
                                console.error('Error parsing response:', e);
                            }
                        }
                    });
                }
                return originalOpen.apply(this, arguments);
            };
            
            return xhr;
        };

        // Set up fetch monitoring
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            if (args[0].includes('companies?nonParentOnly=true')) {
                const clone = response.clone();
                try {
                    companiesData = await clone.json();
                    console.log('Companies data captured via fetch:', companiesData);
                    floatingButton.textContent = 'Company list captured! Click to download';
                    floatingButton.style.backgroundColor = '#2196F3';
                } catch (e) {
                    console.error('Error parsing fetch response:', e);
                }
            }
            
            return response;
        };

        // Add click handler to download the data
        floatingButton.addEventListener('click', () => {
            if (companiesData) {
                // Transform and save the data
                const finalData = {
                    metadata: {
                        source: 'Automic',
                        generated_at: new Date().toISOString(),
                        total_companies: companiesData.length
                    },
                    companies: companiesData.map(company => ({
                        code: company.code || '',
                        name: company.name || ''
                    }))
                };

                // Create and download the JSON file
                const jsonData = JSON.stringify(finalData, null, 2);
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'automic_companylist.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    });
})(); 