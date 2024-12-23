const API_URL = "http://localhost:8000/todolist/api/website_block/get_urls";

// Fetch blocklist and update DNR rules
async function fetchAndUpdateBlocklist() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            if (data.status === "success" && data.data && data.data.website_urls) {
                const blockedWebsites = data.data.website_urls;
                console.log("Fetched blocklist:", blockedWebsites);

                // Save the blocklist to local storage for the popup
                chrome.storage.local.set({ blocklist: blockedWebsites }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Failed to save blocklist to local storage:", chrome.runtime.lastError);
                    } else {
                        console.log("Blocklist saved to local storage successfully.");
                    }
                });

                // Format rules for DNR
                const rules = blockedWebsites.map((url, index) => ({
                    id: index + 1, // Rule IDs must be unique
                    priority: 1,
                    action: {
                        type: "block",
                    },
                    condition: {
                        urlFilter: `*://*.${url}/*`, // Match root domain and all subdomains
                        resourceTypes: ["main_frame"], // Block only top-level navigation
                    },
                }));

                // Update Declarative Net Request rules
                chrome.declarativeNetRequest.updateDynamicRules(
                    {
                        removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1), // Clear existing rules
                        addRules: rules, // Add new rules
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.error("Failed to update DNR rules:", chrome.runtime.lastError);
                        } else {
                            console.log("DNR rules updated successfully.");

                            // Verify that rules were applied
                            chrome.declarativeNetRequest.getDynamicRules((appliedRules) => {
                                console.log("Currently applied rules:", appliedRules);
                            });
                        }
                    }
                );
            } else {
                console.error("Unexpected API response format:", data);
            }
        } else {
            console.error("Failed to fetch blocklist:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching blocklist:", error);
    }
}

// Fetch and update rules when the service worker starts
fetchAndUpdateBlocklist();

// Refresh rules periodically (e.g., every 10 seconds)
setInterval(fetchAndUpdateBlocklist, 10 * 1000);
