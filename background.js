const API_URL = "http://localhost:8000/todolist/api/website_block/get_urls";

// Fetch blocklist and update DNR rules

async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["auth_token"], (result) => {
            resolve(result.auth_token || "");
        });
    });
}
async function fetchAndUpdateBlocklist() {
    console.log("Fetching blocklist...");
    try {
        // get the authentication token from chrome local storage
        const token = await getAuthToken();
        if (token && token !== "") {
            console.log("Token:", token);
        }
        else {
            console.log("No token found in local storage.");
            return;
        }
        const data = {
            'authenticationToken': token
        }
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (response.ok) {
            const data = await response.json();
            if (data.status === "success" && data.data) {
                const blockedWebsites = data.data;
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
                    id: index + 1, // Unique rule IDs
                    priority: 1, // Lower priority than standard rules
                    action: { type: "block" },
                    condition: {
                        urlFilter: `||${url}/*`, // Efficiently block all schemes (http, https) and subdomains
                        resourceTypes: ["main_frame"], // Block navigation only
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
        }

    } catch (error) {
        console.log("Failed to fetch blocklist:", error);
        try {
            // Clear existing rules if fetching failed
            chrome.declarativeNetRequest.updateDynamicRules(
                {
                    removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1),
                    addRules: [],
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.error("Failed to clear DNR rules:", chrome.runtime.lastError);
                    } else {
                        console.log("DNR rules cleared successfully.");
                    }
                }
            );
            // Clear the blocklist and token from local storage
            chrome.storage.local.set({ blocklist: [] }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to clear blocklist from local storage:", chrome.runtime.lastError);
                } else {
                    console.log("Blocklist cleared from local storage successfully.");
                }
            });
            chrome.storage.local.set({ auth_token: "" }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to clear token from local storage:", chrome.runtime.lastError);
                } else {
                    console.log("Token cleared from local storage successfully.");
                }
            });
        }
        catch (error) {
            console.error("Error clearing blocklist and token after failed fetching:", error);
        }
    }
}

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "popup.html" });
});

// Fetch and update rules when the service worker starts
fetchAndUpdateBlocklist();

// Refresh rules periodically (e.g., every 10 seconds)
setInterval(fetchAndUpdateBlocklist, 10 * 1000);
