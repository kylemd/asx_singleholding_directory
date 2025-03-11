document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('company-search');
  const autocompleteResults = document.getElementById('autocomplete-results');
  const accessButton = document.getElementById('access-button');
  const registryInfo = document.getElementById('registry-info');
  
  let companies = [];
  let selectedCompany = null;
  let selectedIndex = -1;
  let currentResults = [];
  let userInput = '';
  
  // Registry URLs
  const registryUrls = {
    'Computershare': 'https://www-au.computershare.com/Investor/#NonMemberLogin/0ox8QsEbRUigGDN6nFW35w',
    'MUFG': 'https://au.investorcentre.mpms.mufg.com/Login/MFASingleHoldingLogin',
    'InvestorServe': 'https://www.investorserve.com.au/#',
    'Automic': 'https://investor.automic.com.au/#/home'
  };
  
  // Create a wrapper for the input to handle soft-prefill
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'input-wrapper';
  searchInput.parentNode.insertBefore(inputWrapper, searchInput);
  inputWrapper.appendChild(searchInput);
  
  // Create the suggestion element
  const suggestionSpan = document.createElement('div');
  suggestionSpan.className = 'suggestion-text';
  inputWrapper.appendChild(suggestionSpan);
  
  // Auto-focus the search input when the popup opens
  setTimeout(() => {
    searchInput.focus();
  }, 0);
  
  // Load company data from local JSON files
  async function loadCompanyData() {
    try {
      const sources = [
        {
          url: 'data/automic_companylist.json',
          registry: 'Automic'
        },
        {
          url: 'data/computershare_companylist.json',
          registry: 'Computershare'
        },
        {
          url: 'data/investorserve_companylist.json',
          registry: 'InvestorServe'
        },
        {
          url: 'data/mufg_companylist.json',
          registry: 'MUFG'
        }
      ];
      
      const allCompanies = [];
      
      for (const source of sources) {
        const response = await fetch(source.url);
        if (!response.ok) {
          throw new Error(`Failed to load data from ${source.url}`);
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
      console.error('Error loading company data:', error);
      registryInfo.textContent = 'Error loading company data. Please try again later.';
      return [];
    }
  }
  
  // Initialize the extension
  async function init() {
    registryInfo.textContent = 'Loading company data...';
    companies = await loadCompanyData();
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
    currentResults = results;
    
    if (results.length === 0) {
      autocompleteResults.style.display = 'none';
      clearSuggestion();
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
        commitSelection(company);
        hideAutocomplete();
      });
      
      autocompleteResults.appendChild(item);
    });
    
    autocompleteResults.style.display = 'block';
    
    // Show suggestion for the first result
    if (results.length > 0 && selectedIndex >= 0) {
      showSuggestion(results[selectedIndex]);
    } else {
      clearSuggestion();
    }
  }
  
  // Show suggestion in the input field
  function showSuggestion(company) {
    if (!company) {
      clearSuggestion();
      return;
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
    
    // Only show suggestion if it starts with the user's input
    const userInputLower = userInput.toLowerCase();
    const displayTextLower = displayText.toLowerCase();
    
    if (displayTextLower.startsWith(userInputLower)) {
      // Create a suggestion that preserves the user's input case
      const userInputLength = userInput.length;
      const preservedUserInput = displayText.substring(0, userInputLength);
      const restOfSuggestion = displayText.substring(userInputLength);
      
      // Set the suggestion text with the user's input case preserved
      suggestionSpan.textContent = userInput + restOfSuggestion;
      selectedCompany = company;
    } else {
      clearSuggestion();
    }
  }
  
  // Clear the suggestion
  function clearSuggestion() {
    suggestionSpan.textContent = '';
  }
  
  // Helper function to hide autocomplete dropdown
  function hideAutocomplete() {
    autocompleteResults.style.display = 'none';
  }
  
  // Commit the selected suggestion to the input
  function commitSelection(company) {
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
    userInput = displayText;
    clearSuggestion();
    registryInfo.textContent = `Registry: ${company.registry}`;
  }
  
  // Handle input events
  searchInput.addEventListener('input', function(e) {
    userInput = this.value.trim();
    const results = filterCompanies(userInput);
    selectedIndex = results.length > 0 ? 0 : -1;
    showAutocompleteResults(results);
  });
  
  // Handle keyboard navigation
  searchInput.addEventListener('keydown', function(e) {
    // Tab key - commit the suggestion
    if (e.key === 'Tab' && suggestionSpan.textContent) {
      e.preventDefault();
      if (selectedCompany) {
        commitSelection(selectedCompany);
        hideAutocomplete();
      }
      return;
    }
    
    // Handle arrow keys for navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      if (currentResults.length === 0) return;
      
      // Update selected index
      selectedIndex = (selectedIndex + 1) % currentResults.length;
      
      // Update display
      showAutocompleteResults(currentResults);
      
      // Scroll to the selected item
      const selectedItem = document.querySelector('.autocomplete-item.selected');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      if (currentResults.length === 0) return;
      
      // Update selected index
      selectedIndex = selectedIndex <= 0 ? currentResults.length - 1 : selectedIndex - 1;
      
      // Update display
      showAutocompleteResults(currentResults);
      
      // Scroll to the selected item
      const selectedItem = document.querySelector('.autocomplete-item.selected');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
    // Handle Enter key
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (currentResults.length > 0) {
        // Select the highlighted result or the first one
        const selectedResult = selectedIndex >= 0 && selectedIndex < currentResults.length 
          ? currentResults[selectedIndex] 
          : currentResults[0];
        
        // Commit the selection
        commitSelection(selectedResult);
        
        // Force hide the dropdown
        autocompleteResults.style.display = 'none';
        
        // Move focus to the button
        accessButton.focus();
      }
    }
    // Handle Escape key
    else if (e.key === 'Escape') {
      hideAutocomplete();
      clearSuggestion();
    }
  });
  
  // Ensure proper tab navigation
  searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Tab') {
      // Ensure the button gets focus after tabbing from the input
      accessButton.focus();
    }
  });
  
  // Make sure the dropdown doesn't interfere with tab navigation
  autocompleteResults.setAttribute('tabindex', '-1');
  
  // Handle click outside of autocomplete
  document.addEventListener('click', function(e) {
    if (!autocompleteResults.contains(e.target) && e.target !== searchInput) {
      hideAutocomplete();
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
  
  // Also handle Enter key on the button
  accessButton.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.click();
    }
  });
  
  // Initialize the extension
  init();
}); 