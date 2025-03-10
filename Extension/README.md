# ASX Single Holding Directory

A Chrome extension that helps you quickly access share registry portals for ASX-listed companies.

## Features

- Search for ASX-listed companies by code or name
- Autocomplete suggestions as you type
- Keyboard navigation support (arrow keys, tab, enter)
- Direct access to the appropriate share registry portal for each company

## Supported Share Registries

- Computershare
- MUFG
- InvestorServe
- Automic

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the Extension directory
5. The extension should now appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Type a company code or name in the search box
3. Select a company from the autocomplete suggestions
4. Click "Access Single Holding" to open the appropriate share registry portal

## Data Sources

The extension uses company data from the following sources:
- https://github.com/kylemd/asx_singleholding_directory/raw/refs/heads/main/Output/automic_companylist.json
- https://github.com/kylemd/asx_singleholding_directory/raw/refs/heads/main/Output/computershare_companylist.json
- https://github.com/kylemd/asx_singleholding_directory/raw/refs/heads/main/Output/investorserve_companylist.json
- https://github.com/kylemd/asx_singleholding_directory/raw/refs/heads/main/Output/mufg_companylist.json 