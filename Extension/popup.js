document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('company-search');
  const autocompleteResults = document.getElementById('autocomplete-results');
  const accessButton = document.getElementById('access-button');
  const registryInfo = document.getElementById('registry-info');
  
  // Auto-focus the search input when the popup opens
  searchInput.focus();
  
  let companies = [];
  let selectedCompany = null;
  let selectedIndex = -1;
  
  // Registry URLs
  const registryUrls = {
    'Computershare': 'https://www-au.computershare.com/Investor/#NonMemberLogin/0ox8QsEbRUigGDN6nFW35w',
    'MUFG': 'https://au.investorcentre.mpms.mufg.com/Login/MFASingleHoldingLogin',
    'InvestorServe': 'https://www.investorserve.com.au/#',
    'Automic': 'https://investor.automic.com.au/#/home'
  };
  
  // Fetch company data from GitHub
  async function fetchCompanyData() {
    try {
      const sources = [
        {
          url: 'https://cdn.jsdelivr.net/gh/kylemd/asx_singleholding_directory@refs/heads/main/Output/automic_companylist.json',
          registry: 'Automic'
        },
        {
          url: 'https://cdn.jsdelivr.net/gh/kylemd/asx_singleholding_directory@refs/heads/main/Output/computershare_companylist.json',
          registry: 'Computershare'
        },
        {
          url: 'https://cdn.jsdelivr.net/gh/kylemd/asx_singleholding_directory@refs/heads/main/Output/investorserve_companylist.json',
          registry: 'InvestorServe'
        },
        {
          url: 'https://cdn.jsdelivr.net/gh/kylemd/asx_singleholding_directory@refs/heads/main/Output/mufg_companylist.json',
          registry: 'MUFG'
        }
      ];
      
      const allCompanies = [];
      
      for (const source of sources) {
        const response = await fetch(source.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data from ${source.url}`);
        }
        
        const data = await response.json();
        
        // Process companies and add registry information
        data.companies.forEach(company => {
          allCompanies.push({
            ...company,
            registry: source.registry
          });
        });
      }
      
      return allCompanies;
    } catch (error) {
      console.error('Error fetching company data:', error);
      registryInfo.textContent = 'Error loading company data. Please try again later.';
      return [];
    }
  }
  
  // Initialize the extension
  async function init() {
    registryInfo.textContent = 'Loading company data...';
    companies = await fetchCompanyData();
    registryInfo.textContent = `Loaded ${companies.length} companies from 4 registries`;
  }
  
  // Filter companies based on search input
  function filterCompanies(query) {
    if (!query) return [];
    
    query = query.toLowerCase();
    
    // First, look for exact matches in code
    const exactCodeMatches = companies.filter(company => 
      company.code && company.code.toLowerCase() === query
    );
    
    // Then look for exact matches in altCode
    const exactAltCodeMatches = companies.filter(company => 
      company.altCode && company.altCode.toLowerCase() === query
    );
    
    // Then look for partial matches in code, altCode, and name
    const partialMatches = companies.filter(company => {
      const code = company.code ? company.code.toLowerCase() : '';
      const altCode = company.altCode ? company.altCode.toLowerCase() : '';
      const name = company.name ? company.name.toLowerCase() : '';
      
      // Only include as partial match if not already an exact match
      const isExactMatch = 
        (company.code && company.code.toLowerCase() === query) || 
        (company.altCode && company.altCode.toLowerCase() === query);
      
      return !isExactMatch && (
        code.includes(query) || 
        altCode.includes(query) || 
        name.includes(query)
      );
    });
    
    // Combine results: exact matches first, then partial matches
    const combinedResults = [
      ...exactCodeMatches,
      ...exactAltCodeMatches.filter(company => !exactCodeMatches.some(c => c.code === company.code)),
      ...partialMatches
    ].slice(0, 10); // Limit to 10 results for performance
    
    return combinedResults;
  }
  
  // Display autocomplete results
  function showAutocompleteResults(results) {
    autocompleteResults.innerHTML = '';
    
    if (results.length === 0) {
      autocompleteResults.style.display = 'none';
      return;
    }
    
    results.forEach((company, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      if (index === selectedIndex) {
        item.className += ' selected';
      }
      
      // Format display text
      let displayText = '';
      if (company.code) {
        displayText += company.code;
        if (company.name) {
          displayText += ' - ' + company.name;
        }
      } else if (company.name) {
        displayText = company.name;
      }
      
      item.textContent = displayText;
      
      item.addEventListener('click', function() {
        selectCompany(company);
        // Hide dropdown when a result is clicked
        autocompleteResults.style.display = 'none';
      });
      
      autocompleteResults.appendChild(item);
    });
    
    autocompleteResults.style.display = 'block';
  }
  
  // Select a company from the results
  function selectCompany(company) {
    selectedCompany = company;
    
    // Format display text
    let displayText = '';
    if (company.code) {
      displayText += company.code;
      if (company.name) {
        displayText += ' - ' + company.name;
      }
    } else if (company.name) {
      displayText = company.name;
    }
    
    searchInput.value = displayText;
    registryInfo.textContent = `Registry: ${company.registry}`;
  }
  
  // Handle input events
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    const results = filterCompanies(query);
    selectedIndex = results.length > 0 ? 0 : -1;
    showAutocompleteResults(results);
    
    // Auto-select first result if there's an exact match
    if (results.length > 0) {
      const exactMatch = results.find(company => 
        (company.code && company.code.toLowerCase() === query.toLowerCase()) ||
        (company.altCode && company.altCode.toLowerCase() === query.toLowerCase())
      );
      
      if (exactMatch) {
        selectCompany(exactMatch);
      }
    } else {
      selectedCompany = null;
      registryInfo.textContent = '';
    }
  });
  
  // Handle keyboard navigation
  searchInput.addEventListener('keydown', function(e) {
    const items = document.querySelectorAll('.autocomplete-item');
    
    if (items.length === 0) return;
    
    // Down arrow
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      showAutocompleteResults(filterCompanies(searchInput.value.trim()));
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
    
    // Up arrow
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      showAutocompleteResults(filterCompanies(searchInput.value.trim()));
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
    
    // Enter key
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        const results = filterCompanies(searchInput.value.trim());
        selectCompany(results[selectedIndex]);
        // Hide dropdown when a result is selected with Enter
        autocompleteResults.style.display = 'none';
      }
    }
    
    // Tab key
    else if (e.key === 'Tab') {
      // Hide the autocomplete results when tabbing to ensure proper focus navigation
      autocompleteResults.style.display = 'none';
    }
  });
  
  // Make sure the dropdown doesn't interfere with tab navigation
  autocompleteResults.setAttribute('tabindex', '-1');
  
  // Handle click outside of autocomplete
  document.addEventListener('click', function(e) {
    if (!autocompleteResults.contains(e.target) && e.target !== searchInput) {
      autocompleteResults.style.display = 'none';
    }
  });
  
  // Handle access button click
  accessButton.addEventListener('click', function() {
    if (selectedCompany && selectedCompany.registry) {
      const url = registryUrls[selectedCompany.registry];
      if (url) {
        chrome.tabs.create({ url });
      } else {
        registryInfo.textContent = 'Error: Registry URL not found';
      }
    } else {
      registryInfo.textContent = 'Please select a company first';
    }
  });
  
  // Initialize the extension
  init();
}); 