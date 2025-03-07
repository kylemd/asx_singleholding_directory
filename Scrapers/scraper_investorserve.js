// ==UserScript==
// @name         Export Investorserve Company List
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Extracts a list of ASX companies managed by Investorserve and exports them to a JSON file
// @author       Your Name
// @match        https://www.investorserve.com.au/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function extractCompanyList() {
        const scriptElements = Array.from(document.querySelectorAll('script'));
        const targetScript = scriptElements.find(script => script.textContent.includes('setupIssuerTypeAheadHandler'));

        if (!targetScript) {
            console.error('Script element with setupIssuerTypeAheadHandler not found');
            return;
        }
        const scriptContent = targetScript.textContent;
        const match = scriptContent.match(/\[.*?\]/);
        const jsonString = match ? match[0] : null;

        if (!jsonString) {
            console.error('Company list JSON not found');
            return;
        }

        let companyList;
        try {
            companyList = JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing company list JSON:', error);
            return;
        }

        const formattedCompanies = companyList.map(entry => ({
            code: entry.Subtext ? entry.Subtext.trim() : entry.Value.trim(),
            altCode: entry.Subtext ? entry.Value.trim() : null,
            name: entry.Text.trim()
        }));

        const finalData = {
            metadata: {
                source: 'Investorserve',
                generated_at: new Date().toISOString(),
                total_companies: formattedCompanies.length
            },
            companies: formattedCompanies
        };

        const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'investorserve_companylist.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function addExportButton() {
        const button = document.createElement('button');
        button.textContent = 'Export Investorserve Company List';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.padding = '10px';
        button.style.background = '#0073e6';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.zIndex = '10000';
        button.onclick = extractCompanyList;
        document.body.appendChild(button);
    }

    addExportButton();
})();